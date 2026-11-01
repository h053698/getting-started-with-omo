import { expect, test } from "bun:test";
import { ALL_SLOTS } from "./catalog.ts";
import { rankFor, type ProviderInfo } from "./recommend.ts";

test.each([
  { name: "unknown plan", first: { tier: null, subscription: true } },
  { name: "API budget", first: { budget: 1000, subscription: false } },
  { name: "unspecified metadata", first: {} },
] satisfies readonly { readonly name: string; readonly first: ProviderInfo }[])(
  "$name is not converted into a subscription capacity",
  ({ first }) => {
    const slot = ALL_SLOTS.find((item) => item.id === "daily-normal");
    if (!slot) throw new Error("Missing daily-normal slot");
    const options = rankFor(slot, {
      providers: new Map<string, ProviderInfo>([
        ["anthropic-subscription", { ...first, role: "main", priority: 0 }],
        ["chatgpt-subscription", { subscription: true, tier: 4, role: "main", priority: 1 }],
      ]),
      excludes: [],
      usage: "multi",
    });
    expect(options[0]?.provider).toBe("anthropic-subscription");
    expect(options[0]?.why).not.toBe("capacity");
  },
);

test("fallback capacity never displaces an active subscription", () => {
  const slot = ALL_SLOTS.find((item) => item.id === "daily-normal");
  if (!slot) throw new Error("Missing daily-normal slot");
  const options = rankFor(slot, {
    providers: new Map<string, ProviderInfo>([
      ["anthropic-subscription", { subscription: true, tier: 1, role: "main", priority: 1 }],
      ["chatgpt-subscription", { subscription: true, tier: 4, role: "fallback", reserve: true, priority: 0 }],
    ]),
    excludes: [],
  });
  expect(options[0]?.provider).toBe("anthropic-subscription");
});

test.each([
  { id: "openai", info: { subscription: false }, excludes: ["openai/*"] },
  { id: "openai", info: { subscription: false, models: [] }, excludes: [] },
  { id: "relay", info: { models: ["gpt-6-astra"] }, excludes: [] },
  { id: "relay", info: { role: "efficient", models: [] }, excludes: [] },
] satisfies readonly { readonly id: string; readonly info: ProviderInfo; readonly excludes: readonly string[] }[])(
  "unavailable $id does not change eligible subscription allocation ($excludes)",
  ({ id, info, excludes }) => {
    for (const name of ["daily-normal", "explore"]) {
      const slot = ALL_SLOTS.find((item) => item.id === name);
      if (!slot) throw new Error(`Missing ${name} slot`);
      const options = rankFor(slot, {
        providers: new Map<string, ProviderInfo>([
          ["anthropic-subscription", { subscription: true, tier: 1, priority: 0 }],
          ["chatgpt-subscription", { subscription: true, tier: 2, priority: 1 }],
          [id, info],
        ]),
        excludes,
        allowExpensive: false,
      });
      expect(options[0]?.provider, name).toBe("chatgpt-subscription");
    }
  },
);
