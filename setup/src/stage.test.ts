import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { applyStaged, mergeAuth, previewApply, resetStaging, StoreBusyError } from "./stage.ts";

const dirs: string[] = [];
const temp = async () => {
  const dir = await mkdtemp(join(tmpdir(), "omo-stage-"));
  dirs.push(dir);
  return dir;
};

afterEach(async () => {
  delete process.env.OMO_START_HOME;
  await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

test("merging adds new providers and appends accounts without overwriting existing ones", () => {
  const real = {
    "chatgpt-subscription": { type: "oauth", access: "a", refresh: "r", expires: 1, accounts: [{ name: "default", access: "a" }] },
    deepseek: { type: "api_key", key: "old" },
  };
  const staged = {
    "chatgpt-subscription": { type: "oauth", access: "b", refresh: "s", expires: 2, accounts: [{ name: "default", access: "b" }] },
    deepseek: { type: "api_key", key: "new" },
    "github-copilot": { type: "oauth", access: "c", refresh: "t", expires: 3 },
  };
  const { merged, changes } = mergeAuth(real, staged);
  expect(changes).toEqual([
    { provider: "chatgpt-subscription", action: "merge", accounts: ["default-2"] },
    { provider: "deepseek", action: "merge", accounts: ["default-2"] },
    { provider: "github-copilot", action: "add", accounts: ["default"] },
  ]);
  const gpt = merged["chatgpt-subscription"] as { access: string; accounts: { name: string; access: string }[] };
  expect(gpt.access).toBe("a");
  expect(gpt.accounts.map((a) => [a.name, a.access])).toEqual([
    ["default", "a"],
    ["default-2", "b"],
  ]);
  const key = merged.deepseek as { key: string; accounts: { name: string; key: string }[] };
  expect(key.key).toBe("old");
  expect(key.accounts.map((a) => [a.name, a.key])).toEqual([
    ["default", "old"],
    ["default-2", "new"],
  ]);
});

test("a login of the other kind replaces the provider's credential, as the engine does", () => {
  const { merged, changes } = mergeAuth({ zai: { type: "api_key", key: "k" } }, { zai: { type: "oauth", access: "a", refresh: "r", expires: 1 } });
  expect(changes).toEqual([{ provider: "zai", action: "replace", accounts: ["default"] }]);
  expect((merged.zai as { type: string }).type).toBe("oauth");
});

test("applying backs up the real file, writes it privately and clears the staging folder", async () => {
  process.env.OMO_START_HOME = await temp();
  const target = await temp();
  await Bun.write(join(target, "auth.json"), JSON.stringify({ openrouter: { type: "api_key", key: "keep" } }));
  const staging = await resetStaging();
  await Bun.write(join(staging, "auth.json"), JSON.stringify({ deepseek: { type: "api_key", key: "sk" } }));
  expect(await previewApply(target)).toEqual([{ provider: "deepseek", action: "add", accounts: ["default"] }]);
  const result = await applyStaged(target, new Date("2026-10-31T00:00:00Z"));
  const written = await Bun.file(join(target, "auth.json")).json();
  expect(Object.keys(written)).toEqual(["openrouter", "deepseek"]);
  expect(result.backupPath).toBe(join(target, "auth.json.bak-omo-start-2026-10-31T00-00-00-000Z"));
  expect(await Bun.file(result.backupPath ?? "").json()).toEqual({ openrouter: { type: "api_key", key: "keep" } });
  expect((await stat(join(target, "auth.json"))).mode & 0o777).toBe(0o600);
  expect(await readdir(process.env.OMO_START_HOME)).toEqual([]);
});

test("applying refuses while OmO holds the store lock", async () => {
  process.env.OMO_START_HOME = await temp();
  const target = await temp();
  await Bun.write(join(target, "auth.json.lock"), "");
  await resetStaging();
  await expect(applyStaged(target)).rejects.toBeInstanceOf(StoreBusyError);
});
