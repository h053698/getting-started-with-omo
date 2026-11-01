import { expect, test } from "bun:test";
import { ALL_SLOTS, type Slot } from "./catalog.ts";
import { applySetupToText } from "./omoconfig.ts";
import { parse } from "jsonc-parser";
import { providerInfos } from "./wizard.ts";
import { chainFrom, choiceKey, rankFor, recommendFor, turboPlan, type Context, type ProviderInfo } from "./recommend.ts";

function slot(id: string): Slot {
  const found = ALL_SLOTS.find((item) => item.id === id);
  if (!found) throw new Error(`Missing slot: ${id}`);
  return found;
}

const gpt = ["chatgpt-subscription", { tier: 2, subscription: true }] as const;
const claude = ["anthropic-subscription", { tier: 1, subscription: true }] as const;
const glm = ["zai", { role: "main", tier: 2 }] as const;
const context = (providers: readonly (readonly [string, ProviderInfo])[]): Context => ({
  providers: new Map(providers),
  excludes: [],
  usage: "multi",
});

const scenarios = [
  { name: "GPT", providers: [gpt], column: 0 },
  { name: "Claude", providers: [claude], column: 1 },
  { name: "both", providers: [gpt, claude], column: 2 },
  { name: "GLM main with both", providers: [glm, gpt, claude], column: 3 },
] as const;

// Each row asserts the actual recommendation for a user-visible role, not just
// that the selected family is connected.
const selections = [
  ["daily-normal", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["daily-heavy", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["geeky-normal", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["geeky-heavy", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "gpt-6.1-sol"],
  ["explore", "gpt-6-luna-fast", "claude-haiku-5-5", "gpt-6-luna-fast", "glm-5.3-flash"],
  ["librarian", "gpt-6-luna-fast", "claude-haiku-5-5", "gpt-6-luna-fast", "glm-5.3-flash"],
  ["plan-consultant", "gpt-6.1-sol", "claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"],
  ["plan-reviewer", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "gpt-6.1-sol"],
  ["architect", "gpt-6.1-sol", "claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"],
  ["visual-engineering", "gpt-6.1-sol", "claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"],
  ["ultrabrain", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "gpt-6.1-sol"],
  ["deep-low", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["deep-high", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "gpt-6.1-sol"],
  ["artistry", "gpt-6.1-sol", "claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"],
  ["quick", "gpt-6-luna-fast", "claude-haiku-5-5", "gpt-6-luna-fast", "glm-5.3-flash"],
  ["unspecified-low", "gpt-6.1-sol", "claude-sonnet-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["unspecified-high", "gpt-6.1-sol", "claude-opus-5-5", "gpt-6.1-sol", "glm-5.3"],
  ["writing", "gpt-6.1-sol", "claude-opus-5-5", "claude-opus-5-5", "claude-opus-5-5"],
] as const;

for (const scenario of scenarios) {
  for (const [id, ...models] of selections) {
    test(`${scenario.name}: ${id} uses the best available task fit`, () => {
      expect(rankFor(slot(id), context(scenario.providers))[0]?.canonical).toBe(models[scenario.column]);
    });
  }
}

for (const [id, gptModel, claudeModel, _both, glmModel] of selections) {
  for (const [name, account, expected] of [
    ["GPT", gpt, glmModel.startsWith("glm") ? glmModel : gptModel],
    ["Claude", claude, glmModel.startsWith("glm") ? glmModel : claudeModel],
  ] as const) {
    test(`GLM main with ${name}: ${id} retains a suitable specialist`, () => {
      expect(rankFor(slot(id), context([glm, account]))[0]?.canonical).toBe(expected);
    });
  }
}

test.each([
  { usage: "multi", allowExpensive: undefined, allowed: false },
  { usage: "plenty", allowExpensive: undefined, allowed: true },
  { usage: "plenty", allowExpensive: false, allowed: false },
  { usage: "single", allowExpensive: true, allowed: true },
] as const)("expensive permission is $allowed for $usage with $allowExpensive", ({ usage, allowExpensive, allowed }) => {
  const ctx = { ...context([gpt, claude]), usage, ...(allowExpensive === undefined ? {} : { allowExpensive }) };
  const picks = recommendFor(ctx);
  const expensive = picks.flatMap((pick) => pick.options).filter((choice) => /fable|astra/.test(choice.canonical ?? ""));
  expect(expensive.length > 0).toBe(allowed);
  if (!allowed) {
    for (const pick of picks) {
      expect(chainFrom(pick.options, 0).some((choice) => /fable|astra/.test(choice.model))).toBe(false);
    }
  }
});

test.each([
  ["openrouter", {}],
  ["vercel-ai-gateway", {}],
  ["relay", { relays: ["claude", "chatgpt"] }],
  ["relay", { models: ["anthropic/claude-fable-5.1", "openai/gpt-6-astra", "openai/gpt-6.1-sol"] }],
] satisfies (readonly [string, ProviderInfo])[])("canonical expensive gate also applies to %s", (provider, info) => {
  const picks = recommendFor({ ...context([[provider, info]]), usage: "plenty", allowExpensive: false });
  expect(picks.flatMap((pick) => pick.options).some((choice) => /fable|astra/.test(choice.model))).toBe(false);
  expect(picks.every((pick) => pick.options.length > 0)).toBe(true);
});

test("excluding ordinary models cannot rescue a forbidden expensive model", () => {
  const ctx = { ...context([gpt]), excludes: ["*sol*", "*luna*"] };
  expect(rankFor(slot("deep-high"), ctx)).toEqual([]);
});

test("turbo uses Sol high unless Astra is explicitly permitted", () => {
  const connected = new Set(["chatgpt-subscription"]);
  expect(turboPlan(connected)?.main).toMatchObject({ model: "gpt-6.1-sol", reasoning: "high" });
  expect(turboPlan(connected, [], { usage: "plenty", allowExpensive: false })?.main.model).toBe("gpt-6.1-sol");
  expect(turboPlan(connected, [], { allowExpensive: true })?.main.model).toBe("gpt-6-astra");
});

test("an explicit main wins within the careful-mode fit tier", () => {
  const ctx = context([claude, ["chatgpt-subscription", { role: "main" }]]);
  expect(rankFor(slot("daily-heavy"), ctx)[0]?.model).toBe("gpt-6.1-sol");
});

test("fallback stays behind active accounts but remains usable alone", () => {
  const fallback = ["anthropic-subscription", { role: "fallback" }] as const;
  expect(rankFor(slot("architect"), context([gpt, fallback]))[0]?.provider).toBe(gpt[0]);
  expect(rankFor(slot("architect"), context([fallback]))[0]?.model).toBe("claude-opus-5-5");
});

test("model availability is authoritative even for a known provider", () => {
  const ctx = context([["anthropic", { models: ["claude-sonnet-5-5"] }]]);
  expect(recommendFor(ctx).flatMap((pick) => pick.options).every((choice) => choice.model === "claude-sonnet-5-5")).toBe(true);
  expect(rankFor(slot("architect"), ctx)[0]?.model).toBe("claude-sonnet-5-5");
});

test("an empty advertised model list offers no inferred provider models", () => {
  expect(recommendFor(context([["anthropic", { models: [] }]])).flatMap((pick) => pick.options)).toEqual([]);
});

test.each(["single", "plenty"] as const)("GLM reasoning only uses confirmed levels under %s", (usage) => {
  const picks = recommendFor({ ...context([glm]), usage });
  for (const pick of picks) {
    expect(pick.options.length).toBeGreaterThan(0);
    for (const choice of pick.options.filter((option) => option.canonical?.startsWith("glm-5.3"))) {
      expect(["low", "high", "max"]).toContain(choice.reasoning ?? "");
    }
  }
});

test("unrecognized custom models do not inherit capabilities from a relay family", () => {
  const ctx = context([["custom", { models: ["custom-thinking-model"], relays: ["claude"] }]]);
  expect(recommendFor(ctx).flatMap((pick) => pick.options)).toEqual([]);
});

test("an unrelated gateway does not change the ordering of existing model choices", () => {
  const before = context([gpt, claude, ["zai", {}]]);
  const after = { ...before, providers: new Map([...before.providers, ["relay", { models: ["gpt-6-astra"] }]]) };
  for (const item of ALL_SLOTS) {
    expect(rankFor(item, after)).toEqual(rankFor(item, before));
  }
});

test.each([gpt, claude])("%s keeps serious reasoning distinct from volume work on a small plan", (provider, info) => {
  const ctx = context([[provider, info]]);
  const heavy = rankFor(slot("deep-high"), ctx)[0];
  const volume = rankFor(slot("explore"), ctx)[0];
  expect(heavy?.reasoning).toBe("high");
  expect(volume?.reasoning).toBe(provider === "chatgpt-subscription" ? "low" : "medium");
});

test("generated config persists role reasoning and never runtime effort fields", () => {
  const picks = recommendFor(context([gpt]));
  const out = applySetupToText("{}", {
    slots: picks.map((pick) => ({ slotId: pick.slot.id, kind: pick.slot.kind, chain: chainFrom(pick.options, 0) })),
    defaultLane: "daily-normal",
    turbo: null,
  });
  const doc: unknown = parse(out);
  expect(doc).toMatchObject({
    "[native]": {
      model_profiles: { "daily-heavy": { models: [{ model: "chatgpt-subscription/gpt-6.1-sol", reasoning: "high" }] } },
      agents: { explore: { models: [{ model: "chatgpt-subscription/gpt-6-luna-fast", reasoning: "low" }] } },
    },
  });
  expect(out).not.toMatch(/reasoning_effort|thinkingLevel|effort|astra|fable/);
});

test("explicit provider priority chooses between equally suitable models", () => {
  const ctx = context([
    ["anthropic-subscription", { priority: 1 }],
    ["chatgpt-subscription", { priority: 2 }],
    ["zai", { priority: 0 }],
  ]);
  expect(rankFor(slot("daily-normal"), ctx)[0]?.provider).toBe("zai");
  expect(rankFor(slot("explore"), ctx)[0]?.provider).toBe("zai");
  expect(rankFor(slot("architect"), ctx)[0]?.provider).toBe("anthropic-subscription");
});

test("fallback uses other providers before more models of the selected provider", () => {
  const options = rankFor(slot("daily-normal"), context([gpt, claude, ["zai", {}]]));
  const chain = chainFrom(options, 0);
  expect(chain.map(choice => choice.provider)).toEqual(["anthropic-subscription", "zai", "chatgpt-subscription"]);
});

test("every eligible reserve model survives every saved fallback chain beyond the normal limit", () => {
  const ctx = context([gpt, ["anthropic-subscription", { role: "fallback", priority: 0 }], ["zai", { role: "fallback", priority: 1 }]]);
  const picks = recommendFor(ctx);
  for (const pick of picks) {
    const reserves = pick.options.filter(choice => choice.reserve);
    expect(reserves.length, pick.slot.id).toBeGreaterThan(0);
    const chain = chainFrom(pick.options, 0);
    expect(chain[0]?.provider).toBe(gpt[0]);
    expect(new Set(chain.map(choiceKey)).size).toBe(chain.length);
    expect(reserves.every(choice => chain.some(item => choiceKey(item) === choiceKey(choice)))).toBe(true);
    expect(chain.some(choice => /fable|astra/.test(choice.model))).toBe(false);
  }
  expect(picks.some(pick => chainFrom(pick.options, 0).length > 3)).toBe(true);
  const output = applySetupToText("{}", {
    slots: picks.map(pick => ({ slotId: pick.slot.id, kind: pick.slot.kind, chain: chainFrom(pick.options, 0) })),
    defaultLane: "daily-normal", turbo: null,
  });
  const doc: unknown = parse(output);
  expect(doc).toMatchObject({ "[native]": { agents: { explore: { models: expect.arrayContaining([
    expect.objectContaining({ model: "anthropic-subscription/claude-haiku-5-5" }),
    expect.objectContaining({ model: "zai/glm-5.3-flash" }),
  ]) } } } });
});

test.each(["daily-normal", "geeky-normal", "deep-low", "writing"])("premium permission does not promote Astra over Sol for %s", id => {
  const picks = rankFor(slot(id), { ...context([gpt]), usage: "plenty" });
  expect(picks[0]?.model).toBe("gpt-6.1-sol");
  if (id === "geeky-normal") expect(picks.some(choice => choice.model === "gpt-6-astra")).toBe(true);
});

test("manually selecting a premium model keeps it first with all reserves still appended", () => {
  const options = rankFor(slot("geeky-normal"), {
    ...context([gpt, ["anthropic-subscription", { role: "fallback" }], ["zai", { role: "fallback" }]]),
    allowExpensive: true,
  });
  const index = options.findIndex(choice => choice.model === "gpt-6-astra");
  expect(index).toBeGreaterThanOrEqual(0);
  const chain = chainFrom(options, index);
  expect(chain[0]?.model).toBe("gpt-6-astra");
  expect(options.filter(choice => choice.reserve).every(choice => chain.some(item => choiceKey(item) === choiceKey(choice)))).toBe(true);
});

test("reserve chains honor model exclusions even when no primary option remains", () => {
  const picks = recommendFor({
    ...context([gpt, ["anthropic-subscription", { role: "fallback" }]]),
    excludes: ["chatgpt-subscription/*", "*haiku*"],
  });
  for (const pick of picks) {
    expect(pick.options.some(choice => choice.reserve)).toBe(true);
    expect(chainFrom(pick.options, 0).every(choice => choice.provider === "anthropic-subscription" && !choice.model.includes("haiku"))).toBe(true);
  }
});

test("Claude Pro does not monopolize recurring work when GPT Pro100 has more headroom", () => {
  const providers = providerInfos([
    { key: 1, provider: "anthropic-subscription", name: "claude", plan: "pro", role: "main" },
    { key: 2, provider: "chatgpt-subscription", name: "gpt", plan: "pro-100", role: "main" },
  ], ["anthropic-subscription", "chatgpt-subscription"]);
  const ctx: Context = { providers, excludes: [], usage: "multi", allowExpensive: false };
  for (const id of ["daily-normal", "geeky-normal", "deep-low", "explore", "quick"]) {
    expect(rankFor(slot(id), ctx)[0]?.provider, id).toBe("chatgpt-subscription");
  }
  for (const id of ["architect", "writing"]) {
    expect(rankFor(slot(id), ctx)[0]?.provider, id).toBe("anthropic-subscription");
  }
});

test("reversing plan headroom reverses recurring allocation despite GPT priority", () => {
  const providers = providerInfos([
    { key: 1, provider: "chatgpt-subscription", name: "gpt", plan: "plus", role: "main" },
    { key: 2, provider: "anthropic-subscription", name: "claude", plan: "max", role: "main" },
  ], ["chatgpt-subscription", "anthropic-subscription"]);
  const ctx: Context = { providers, excludes: [], usage: "multi", allowExpensive: false };
  for (const id of ["daily-normal", "geeky-normal", "deep-low", "explore", "quick"]) {
    expect(rankFor(slot(id), ctx)[0]?.provider, id).toBe("anthropic-subscription");
  }
});

test.each([
  ["anthropic-subscription", "chatgpt-subscription"],
  ["chatgpt-subscription", "anthropic-subscription"],
] as const)("equal small plans respect provider order headed by %s", (first, second) => {
  const providers = providerInfos([
    { key: 1, provider: "anthropic-subscription", name: "claude", plan: "pro", role: "main" },
    { key: 2, provider: "chatgpt-subscription", name: "gpt", plan: "plus", role: "main" },
  ], [first, second]);
  const ctx: Context = { providers, excludes: [], usage: "multi" };
  expect(rankFor(slot("daily-normal"), ctx)[0]?.provider).toBe(first);
  expect(rankFor(slot("explore"), ctx)[0]?.provider).toBe(first);
});
