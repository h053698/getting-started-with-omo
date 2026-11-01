import { expect, test } from "bun:test";
import { buildProviderProfiles } from "./provider-profiles.ts";
import { recommendFor, type Context, type ProfileFamily, type ProviderInfo } from "./recommend.ts";

const providers = new Map<string, ProviderInfo>([
  ["anthropic-subscription", { tier: 1, subscription: true, priority: 0 }],
  ["chatgpt-subscription", { tier: 2, subscription: true, priority: 1 }],
  ["xai", {}], ["zai", {}], ["kimi-coding", {}],
]);
const context: Context = { providers, excludes: [], allowExpensive: false };

test.each(["opencode", "opencode-go", "openrouter", "vercel-ai-gateway"])(
  "%s catalog alone does not invent unregistered family profiles",
  (gateway) => {
    const plan = buildProviderProfiles({
      ...context,
      providers: new Map<string, ProviderInfo>([
        ["anthropic-subscription", {}], ["chatgpt-subscription", {}], [gateway, {}],
      ]),
    }, null);
    expect(plan.profiles.map((profile) => profile.name)).toEqual(["omo-claude", "omo-gpt"]);
  },
);

test("an explicit gateway inventory creates only model families actually supplied", () => {
  const plan = buildProviderProfiles({
    ...context,
    providers: new Map<string, ProviderInfo>([
      ["anthropic-subscription", {}], ["chatgpt-subscription", {}],
      ["openrouter", { models: ["moonshotai/kimi-k3.1-pro"] }],
    ]),
  }, null);
  expect(plan.profiles.map((profile) => profile.name)).toEqual(["omo-claude", "omo-gpt", "omo-kimi"]);
  expect(plan.profiles.find((profile) => profile.family === "kimi")?.main.provider).toBe("openrouter");
});

test.each(["claude", "gpt", "grok", "glm", "kimi"] satisfies readonly ProfileFamily[])(
  "%s main profile favors that family for everyday work without forcing every specialist",
  (family) => {
    const before = recommendFor(context);
    const plan = buildProviderProfiles(context, "daily-normal");
    const profile = plan.profiles.find((item) => item.family === family);
    expect(profile?.name).toBe(`omo-${family}`);
    expect(profile?.slots.find((slot) => slot.slotId === "daily-normal")?.chain[0]?.canonical).toStartWith(`${family}-`);
    expect(profile?.slots.find((slot) => slot.slotId === "architect")?.chain[0]?.model).toBe("claude-opus-5-5");
    expect(recommendFor(context)).toEqual(before);
    expect(profile?.slots.flatMap((slot) => slot.chain).some((choice) => /fable|astra/.test(choice.model))).toBe(false);
  },
);

test("family discovery uses canonical models across custom relays and keeps every reserve", () => {
  const ctx: Context = {
    ...context,
    providers: new Map<string, ProviderInfo>([
      ["relay", { models: ["openai/gpt-6.1-sol", "openai/gpt-6-luna-fast", "anthropic/claude-opus-5.5", "anthropic/claude-haiku-5.5"] }],
      ["zai", { role: "fallback", reserve: true }],
    ]),
  };
  const plan = buildProviderProfiles(ctx, null);
  expect(plan.profiles.map((profile) => profile.name)).toEqual(["omo-claude", "omo-gpt"]);
  const reserves = recommendFor(ctx).map((pick) => ({
    id: pick.slot.id, keys: pick.options.filter((choice) => choice.reserve).map((choice) => `${choice.provider}/${choice.model}`).sort(),
  }));
  for (const profile of plan.profiles) {
    for (const slot of profile.slots) {
      const expected = reserves.find((pick) => pick.id === slot.slotId);
      if (!expected) throw new Error(`Missing baseline slot ${slot.slotId}`);
      expect(slot.chain[0]?.reserve).not.toBe(true);
      expect(slot.chain.filter((choice) => choice.reserve).map((choice) => `${choice.provider}/${choice.model}`).sort()).toEqual(expected.keys);
    }
  }
});

test.each([
  { models: [] },
  { models: ["gpt-6-astra"] },
  { models: ["gpt-6.1-sol"], role: "fallback", reserve: true },
  { models: ["unrecognized-custom-model"] },
] satisfies readonly ProviderInfo[])("ineligible-only relay creates no unusable commands: %j", (info) => {
  const plan = buildProviderProfiles({ providers: new Map([["relay", info]]), excludes: [], allowExpensive: false }, null);
  expect(plan.profiles).toEqual([]);
});

test("incomplete profiles are blocked rather than inheriting excluded models", () => {
  const plan = buildProviderProfiles({
    providers: new Map([["relay", { models: ["gpt-6-luna-fast"] }]]), excludes: [], allowExpensive: false,
  }, null);
  expect(plan.profiles).toEqual([]);
  expect(plan.issues[0]?.slots).toContain("daily-normal");
});

test("preferred family cannot promote merged reserve hosts or displace free-first volume", () => {
  const ctx: Context = {
    ...context, freeFirst: true,
    providers: new Map<string, ProviderInfo>([
      ["anthropic-subscription", { role: "main", reserve: true }],
      ["chatgpt-subscription", {}], ["opencode", { models: ["deepseek-v4.1-flash-free"] }],
    ]),
  };
  const plan = buildProviderProfiles(ctx, null);
  expect(plan.profiles.map((profile) => profile.name)).toEqual(["omo-gpt"]);
  expect(plan.profiles[0]?.slots.find((slot) => slot.slotId === "explore")?.chain[0]?.provider).toBe("opencode");
});
