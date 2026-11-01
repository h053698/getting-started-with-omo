import { expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { saveAccounts, toSavedFile } from "./answers.ts";
import { findProvider, loginProviderOf, PROVIDERS } from "./providers.ts";

test("provider ids are unique and every plan id is unique within its provider", () => {
  const ids = PROVIDERS.map((p) => p.id);
  expect(new Set(ids).size).toBe(ids.length);
  for (const provider of PROVIDERS) {
    const planIds = provider.plans.map((p) => p.id);
    expect(new Set(planIds).size).toBe(planIds.length);
  }
});

test("subscriptions that can report their plan start on auto-detect and list the real tiers", () => {
  const plans = (id: string) => findProvider(id).plans.map((p) => p.id);
  expect(plans("anthropic-subscription")).toEqual(["auto", "pro", "max", "ultra", "team-standard", "team-premium"]);
  expect(plans("chatgpt-subscription")).toEqual(["auto", "plus", "pro-100", "pro-200", "pro-500", "business-standard", "business-premium"]);
  expect(plans("github-copilot")).toEqual(["auto", "pro", "pro-plus", "max", "edu", "business", "enterprise"]);
  for (const provider of PROVIDERS) expect(provider.plans[0]?.id === "auto").toBe(provider.detectsPlan === true);
});

test("each region is its own provider and logs in as its own engine provider", () => {
  expect(loginProviderOf(findProvider("zai-coding-cn"))).toBe("zai-coding-cn");
  expect(loginProviderOf(findProvider("zai"))).toBe("zai");
  expect(loginProviderOf(findProvider("minimax-cn"))).toBe("minimax-cn");
  expect(loginProviderOf(findProvider("kimi-coding-cn"))).toBe("kimi-coding");
  expect(findProvider("kimi-coding").plans.map((p) => p.id)).toEqual(["plus", "pro", "max", "ultra", "business-premium"]);
  expect(findProvider("xai").plans.map((p) => p.id)).toEqual(["plus", "premium", "super", "ultra", "team-premium", "team-super", "team-ultra"]);
  expect(findProvider("zai-coding-cn").plans.map((p) => p.id)).toEqual(["lite", "pro", "max", "team-standard", "team-premium"]);
  expect(findProvider("minimax").plans.map((p) => p.id)).toEqual(["go", "explore", "build"]);
  expect(findProvider("anthropic").budget).toBe(true);
  expect(findProvider("openrouter").budget).toBe(true);
  expect(findProvider("opencode-go").plans.map((p) => p.id)).toEqual(["go", "plus", "teams"]);
  expect(findProvider("chatgpt-subscription").plans.filter((p) => p.group === "team").map((p) => p.id)).toEqual([
    "business-standard",
    "business-premium",
  ]);
});

test("saved file lists every account in provider order with its plan and login provider", () => {
  const saved = toSavedFile(
    [
      { key: 3, provider: "zai-coding-cn", name: "default", plan: "pro" },
      { key: 2, provider: "anthropic-subscription", name: "work", plan: "max20" },
      { key: 1, provider: "anthropic-subscription", name: "default", plan: "pro" },
    ],
    new Date("2026-10-31T00:00:00Z"),
  );
  expect(saved.version).toBe(2);
  expect(saved.accounts.map((a) => [a.provider, a.name, a.plan, a.kind, a.loginProvider])).toEqual([
    ["anthropic-subscription", "default", "pro", "oauth", "anthropic-subscription"],
    ["anthropic-subscription", "work", "max20", "oauth", "anthropic-subscription"],
    ["zai-coding-cn", "default", "pro", "api_key", "zai-coding-cn"],
  ]);
});

test("saveAccounts writes parseable JSON to the given path", async () => {
  const dir = await mkdtemp(join(tmpdir(), "omo-start-"));
  try {
    const path = join(dir, "nested", "subscriptions.json");
    const preferences = { freeFirst: true, reasoningPolicy: "deep", allowExpensive: false } as const;
    await saveAccounts([{ key: 1, provider: "chatgpt-subscription", name: "default", plan: "pro" }], path, preferences);
    const parsed = await Bun.file(path).json();
    expect(parsed.accounts[0].plan).toBe("pro");
    expect(parsed.preferences).toEqual(preferences);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("findProvider rejects an unknown id", () => {
  expect(() => findProvider("nope")).toThrow("Unknown provider id: nope");
});
