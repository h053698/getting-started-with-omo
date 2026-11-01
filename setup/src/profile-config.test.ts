import { expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "jsonc-parser";
import { toSetup } from "./app.tsx";
import { applySetup, applySetupToText, previewChanges } from "./omoconfig.ts";
import { buildModels, profilesRow, reduce, type Account, type WizardState, createInitialState } from "./wizard.ts";

const accounts: readonly Account[] = [
  { key: 1, provider: "anthropic-subscription", name: "claude", plan: "pro", role: "main" },
  { key: 2, provider: "chatgpt-subscription", name: "gpt", plan: "pro-100", role: "main" },
];
const models = () => buildModels(accounts, [], { freeFirst: false, reasoningPolicy: "auto" }, null, false);
const optedIn = () => ({ ...models(), profilesOn: true });

test("profile toggle changes only generated profiles and keeps manual base choices", () => {
  const before = models();
  expect(toSetup(before, accounts).profiles).toEqual([]);
  const manual = { ...before, profilesOn: true, selected: { ...before.selected, "daily-normal": 1 }, manual: { "daily-normal": true }, row: profilesRow(before) ?? 0 };
  const state: WizardState = { ...createInitialState("ko"), stage: "models", accounts, models: manual };
  const disabled = reduce(state, { type: "key", input: "", flags: { return: true } });
  if (!disabled.models) throw new Error("Missing models");
  expect(toSetup(disabled.models, accounts).profiles).toEqual([]);
  expect(disabled.models.selected).toEqual(manual.selected);
  const enabled = reduce(disabled, { type: "click", target: { kind: "providerProfiles", on: true } });
  if (!enabled.models) throw new Error("Missing models");
  const setup = toSetup(enabled.models, accounts);
  expect(setup.profiles?.map((profile) => profile.name)).toEqual(["omo-claude", "omo-gpt"]);
  expect(setup.slots.find((slot) => slot.slotId === "daily-normal")?.chain[0]).toEqual(before.picks[0]?.options[1]);
  expect(setup.profiles?.find((profile) => profile.name === "omo-claude")?.main.provider).toBe("anthropic-subscription");
});

test("named config sets scalar and chain together, preserves base and unrelated profiles", () => {
  const setup = toSetup(optedIn(), accounts);
  const doc = parse(applySetupToText('{"profiles":{"mine":{"theme":"light"}},"[native]":{"agents":{"explore":{"model":"old/model","reasoning":"low"}}}}', setup));
  expect(doc.profiles.mine).toEqual({ theme: "light" });
  expect(doc["[native]"].agents.explore.model).toBe("old/model");
  const claude = doc.profiles["omo-claude"]["[native]"];
  expect(claude.model_profile).toBe("daily-normal");
  expect(claude.agents.explore.model).toBe("anthropic-subscription/claude-haiku-5-5");
  expect(claude.agents.explore.models[0].model).toBe(claude.agents.explore.model);
  expect(claude.exclude_models).toContain("*gpt-6-astra*");
  expect(claude.exclude_models).toContain("*claude-fable*");
  expect(previewChanges(setup).some((change) => change.path.endsWith("/bin/omo-gpt"))).toBe(true);
});

test("final apply writes native profiles and executable launchers, then safely regenerates managed config", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo-profile-config-"));
  const old = process.env.OMO_START_CONFIG_HOME;
  process.env.OMO_START_CONFIG_HOME = root;
  try {
    const setup = toSetup(optedIn(), accounts);
    const applied = await applySetup(setup, join(root, "agent"));
    expect(applied.launcherPaths).toEqual([join(root, "bin", "omo-claude"), join(root, "bin", "omo-gpt")]);
    expect(parse(await readFile(applied.configPath, "utf8")).profiles["omo-gpt"]["[native]"].model_profile).toBe("daily-normal");
    const deeper = buildModels(accounts, [], { freeFirst: false, reasoningPolicy: "deep" }, null, false);
    const updated = await applySetup(toSetup({ ...deeper, profilesOn: true }, accounts), join(root, "agent"));
    expect(parse(await readFile(updated.configPath, "utf8")).profiles["omo-claude"]["[native]"].categories.architect.reasoning).toBe("max");
  } finally {
    if (old === undefined) delete process.env.OMO_START_CONFIG_HOME;
    else process.env.OMO_START_CONFIG_HOME = old;
    await rm(root, { recursive: true, force: true });
  }
});

test("a conflicting user profile blocks final apply before changing the base config", async () => {
  const root = await mkdtemp(join(tmpdir(), "omo-profile-conflict-"));
  const old = process.env.OMO_START_CONFIG_HOME;
  process.env.OMO_START_CONFIG_HOME = root;
  const path = join(root, "omo.jsonc");
  const original = '{"profiles":{"omo-claude":{"theme":"my-theme"}}}';
  try {
    await writeFile(path, original);
    await expect(applySetup(toSetup(optedIn(), accounts), join(root, "agent"))).rejects.toThrow("conflicts");
    expect(await readFile(path, "utf8")).toBe(original);
  } finally {
    if (old === undefined) delete process.env.OMO_START_CONFIG_HOME;
    else process.env.OMO_START_CONFIG_HOME = old;
    await rm(root, { recursive: true, force: true });
  }
});
