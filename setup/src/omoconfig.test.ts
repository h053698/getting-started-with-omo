import { expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parse } from "jsonc-parser";
import { applySetup, applySetupToText, mergeCustomModels, type ModelSetup, previewChanges, readExcludes, turbomodeSource } from "./omoconfig.ts";
import { defaultLane, isExcluded, optionsFor, rankFor, recommend, recommendFor, servedId, turboPlan, type Choice } from "./recommend.ts";
import { ALL_SLOTS } from "./catalog.ts";

const slot = (id: string) => {
  const found = ALL_SLOTS.find((s) => s.id === id);
  if (!found) throw new Error(id);
  return found;
};

test("a ChatGPT-only setup fills every slot with GPT models, none left empty", () => {
  const picks = recommend(new Set(["chatgpt-subscription"]));
  const first = (id: string) => picks.find((p) => p.slot.id === id)?.options[0];
  for (const pick of picks) expect(pick.options.length, `${pick.slot.id} must not be empty`).toBeGreaterThan(0);
  expect(first("daily-normal")).toEqual({ provider: "chatgpt-subscription", model: "gpt-6.1-sol", reasoning: "medium" });
  expect(first("geeky-normal")).toEqual({ provider: "chatgpt-subscription", model: "gpt-6.1-sol", reasoning: "medium" });
  expect(first("daily-heavy")).toEqual({ provider: "chatgpt-subscription", model: "gpt-6.1-sol", reasoning: "high" });
  expect(first("explore")).toEqual({ provider: "chatgpt-subscription", model: "gpt-6-luna-fast", reasoning: "low" });
  expect(defaultLane(picks)).toBe("daily-normal");
});

test("a Business Standard seat keeps serious Sol reasoning, plenty permits Astra", () => {
  const biz = new Map([["chatgpt-subscription", { role: "main", tier: 2, budget: null, subscription: true }]]) as never;
  const multi = recommendFor({ providers: biz, excludes: [], usage: "multi" });
  const top = (picks: ReturnType<typeof recommendFor>, id: string): Choice | undefined => picks.find((p) => p.slot.id === id)?.options[0];
  expect(top(multi, "geeky-normal")?.model).not.toBe("gpt-6-astra");
  const ranked = rankFor(slot("ultrabrain"), { providers: biz, excludes: [], usage: "multi" })[0];
  expect(ranked).toMatchObject({ model: "gpt-6.1-sol", reasoning: "high", why: "main" });
  const plenty = recommendFor({ providers: biz, excludes: [], usage: "plenty" });
  expect(top(plenty, "ultrabrain")).toMatchObject({ model: "gpt-6-astra", reasoning: "max" });
});

test("exclude_models that wipe a slot's chain do not leave it empty", () => {
  const ctx = {
    providers: new Map([["chatgpt-subscription", { role: "main", tier: 2, budget: null, subscription: true }]]) as never,
    excludes: ["chatgpt-subscription/*-fast", "chatgpt-subscription/gpt-4*", "chatgpt-subscription/gpt-3*"],
    usage: "multi" as const,
  };
  const picks = recommendFor(ctx);
  for (const pick of picks) expect(pick.options.length, `${pick.slot.id} must not be empty`).toBeGreaterThan(0);
  const explore = picks.find((p) => p.slot.id === "explore")!;
  expect(explore.options[0]).toMatchObject({ provider: "chatgpt-subscription", model: "gpt-6.1-sol", why: "rescue" });
});

test("a subscription outranks an API key for the same model, and Kimi Code serves its own ids", () => {
  const options = optionsFor(slot("daily-normal"), new Set(["anthropic", "anthropic-subscription", "kimi-coding"]), []);
  expect(options.map((o) => `${o.provider}/${o.model}`)).toEqual([
    "anthropic-subscription/claude-opus-5-5",
    "anthropic/claude-opus-5-5",
    "kimi-coding/k3.1-pro",
    "kimi-coding/k3",
    "anthropic-subscription/claude-sonnet-5-5",
    "anthropic/claude-sonnet-5-5",
  ]);
  expect(servedId("opencode-go", "kimi-k3.1-pro")).toBe("kimi-k3.1-pro");
});

test("exclude_models globs drop matching models, with or without a provider", () => {
  const sol = { provider: "chatgpt-subscription", model: "gpt-6.1-sol-fast" };
  expect(isExcluded(sol, ["chatgpt-subscription/*-fast"])).toBe(true);
  expect(isExcluded(sol, ["openai/*-fast"])).toBe(false);
  expect(isExcluded({ provider: "anthropic", model: "claude-opus-5" }, ["claude-opus-5"])).toBe(true);
  expect(isExcluded({ provider: "anthropic", model: "claude-opus-5-5" }, ["claude-opus-5"])).toBe(false);
  const deep = optionsFor(slot("deep-low"), new Set(["chatgpt-subscription"]), ["chatgpt-subscription/*-fast"]);
  expect(deep.map((o) => o.model)).toEqual(["gpt-6.1-sol", "gpt-5.6-sol"]);
});

test("turbo is offered only with a Claude or ChatGPT subscription", () => {
  expect(turboPlan(new Set(["anthropic-subscription", "chatgpt-subscription"]))?.main.model).toBe("claude-opus-5-5");
  expect(turboPlan(new Set(["chatgpt-subscription"]))?.main).toEqual({ provider: "chatgpt-subscription", model: "gpt-6.1-sol", reasoning: "high" });
  expect(turboPlan(new Set(["anthropic", "openai", "deepseek"]))).toBeNull();
});

const SETUP: ModelSetup = {
  slots: [
    { slotId: "geeky-normal", kind: "lane", chain: [{ provider: "chatgpt-subscription", model: "gpt-6-astra", reasoning: "medium" }] },
    {
      slotId: "explore",
      kind: "agent",
      chain: [
        { provider: "chatgpt-subscription", model: "gpt-6-luna-fast", reasoning: "low" },
        { provider: "deepseek", model: "deepseek-flash", reasoning: "max" },
      ],
    },
    { slotId: "quick", kind: "category", chain: [] },
  ],
  defaultLane: "geeky-normal",
  turbo: { provider: "chatgpt-subscription", model: "gpt-6-astra", reasoning: "xhigh" },
};

const EXISTING = `{
  // my settings
  "$schema": "https://example.invalid/omo.schema.json",
  "[native]": {
    "model_profile": "chatgpt-subscription/gpt-6.1-sol", // pinned
    "exclude_models": ["claude-opus-5"],
    "agents": { "librarian": { "model": "kimi-coding/k3" } }
  }
}
`;

test("applying keeps comments and other keys, and writes only chosen slots", () => {
  const out = applySetupToText(EXISTING, SETUP);
  expect(out).toContain("// my settings");
  expect(out).toContain("// pinned");
  const doc = parse(out) as Record<string, any>;
  const native = doc["[native]"];
  expect(native.exclude_models).toEqual(["claude-opus-5"]);
  expect(native.agents.librarian).toEqual({ model: "kimi-coding/k3" });
  expect(native.agents.explore.models).toEqual([
    { model: "chatgpt-subscription/gpt-6-luna-fast", reasoning: "low" },
    { model: "deepseek/deepseek-flash", reasoning: "max" },
  ]);
  expect(native.categories?.quick).toBeUndefined();
  expect(native.model_profile).toBe("geeky-normal");
  expect(native.model_profiles["geeky-normal"].models).toEqual([{ model: "chatgpt-subscription/gpt-6-astra", reasoning: "medium" }]);
  expect(native.model_profiles.turbo.models).toEqual([{ model: "chatgpt-subscription/gpt-6-astra", reasoning: "xhigh" }]);
  expect(doc.profiles.turbo["[native]"].model_profile).toBe("turbo");
  expect(previewChanges(SETUP).map((c) => c.path)).toEqual([
    "[native].model_profiles.geeky-normal",
    "[native].agents.explore.models",
    "[native].model_profile",
    "[native].model_profiles.turbo",
    "profiles.turbo.[native].model_profile",
  ]);
});

test("broken JSONC is refused instead of overwritten", () => {
  expect(() => applySetupToText("{ \"a\": ", SETUP)).toThrow("not valid JSONC");
});

test("applySetup backs up, writes the config and the /turbomode extension", async () => {
  const home = await mkdtemp(join(tmpdir(), "omo-cfg-"));
  const agent = join(home, "agent");
  process.env.OMO_START_CONFIG_HOME = home;
  try {
    await Bun.write(join(home, "omo.jsonc"), EXISTING);
    expect(await readExcludes()).toEqual(["claude-opus-5"]);
    const result = await applySetup(SETUP, agent, new Date("2026-10-31T00:00:00Z"));
    expect(result.backupPath).toBe(join(home, "omo.jsonc.bak-omo-start-2026-10-31T00-00-00-000Z"));
    expect(await Bun.file(result.backupPath ?? "").text()).toBe(EXISTING);
    expect((await readdir(join(agent, "extensions"))).includes("omo-turbomode.js")).toBe(true);
    expect(await Bun.file(result.extensionPath ?? "").text()).toBe(turbomodeSource(SETUP.turbo!));
  } finally {
    delete process.env.OMO_START_CONFIG_HOME;
    await rm(home, { recursive: true, force: true });
  }
});

test("custom providers merge into models.json without touching other providers", () => {
  const before = '{\n  // mine\n  "providers": { "ollama": { "baseUrl": "http://localhost:11434/v1", "api": "openai-completions", "models": [] } }\n}\n';
  const out = mergeCustomModels(before, [{ id: "relay", baseUrl: "https://relay.test/v1", api: "anthropic-messages", models: ["claude-opus-5-5"] }]);
  expect(out).toContain("// mine");
  const doc = parse(out) as Record<string, any>;
  expect(Object.keys(doc.providers)).toEqual(["ollama", "relay"]);
  expect(doc.providers.relay).toEqual({ baseUrl: "https://relay.test/v1", api: "anthropic-messages", models: [{ id: "claude-opus-5-5" }] });
});

test("roles, plan tiers and budgets steer the recommendation", () => {
  const ctx = (providers: [string, object][], usage: "single" | "plenty" | "free" | "api" = "single") => ({
    providers: new Map(providers) as never,
    excludes: [],
    usage,
  });
  const explore = slot("explore");
  const both = [
    ["anthropic-subscription", { role: "main", subscription: true, tier: 3 }],
    ["chatgpt-subscription", { role: "efficient", subscription: true, tier: 1 }],
  ] as [string, object][];
  expect(rankFor(explore, ctx(both))[0]).toMatchObject({ provider: "chatgpt-subscription", why: "efficient" });
  const heavy = slot("plan-consultant");
  expect(rankFor(heavy, ctx(both))[0]).toMatchObject({ provider: "anthropic-subscription", model: "claude-opus-5-5" });
  const lowTier = rankFor(heavy, ctx([["anthropic-subscription", { subscription: true, tier: 1 }]]))[0];
  expect(lowTier).toMatchObject({ model: "claude-opus-5-5", reasoning: "high", why: "capped" });
  expect(rankFor(heavy, ctx([["anthropic-subscription", { subscription: true, tier: 1 }]], "plenty"))[0]?.reasoning).toBe("max");
  const free = rankFor(explore, ctx([["opencode", {}]], "free"))[0];
  expect(free).toMatchObject({ provider: "opencode", why: "free" });
  const router = rankFor(slot("daily-normal"), ctx([["openrouter", { role: "main" }]]))[0];
  expect(router).toMatchObject({ provider: "openrouter", model: "anthropic/claude-opus-5.5" });
});
