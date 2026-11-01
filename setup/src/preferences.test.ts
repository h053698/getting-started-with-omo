import { expect, test } from "bun:test";
import { ALL_SLOTS } from "./catalog.ts";
import { rankFor, type Context } from "./recommend.ts";
import { createInitialState, reduce, type WizardState } from "./wizard.ts";

const enter = (state: WizardState) => reduce(state, { type: "key", input: "", flags: { return: true } });
const back = (state: WizardState) => reduce(state, { type: "key", input: "", flags: { escape: true } });
const choose = (state: WizardState, index: number) => reduce(state, { type: "click", target: { kind: "usage", index } });

test("three questions preserve independent answers, accounts and focus through Esc navigation", () => {
  const first = enter(enter(createInitialState("ko")));
  const second = choose(first, 1);
  const third = choose(second, 2);
  const accounts = choose(third, 0);
  expect(accounts).toMatchObject({ stage: "accounts", freeFirst: true, reasoningPolicy: "deep", allowExpensive: false });
  const premium = back(accounts);
  expect(premium).toMatchObject({ stage: "usage", usageStep: 2, usageCursor: 0 });
  const thinking = back(premium);
  expect(thinking).toMatchObject({ usageStep: 1, usageCursor: 2 });
  expect(back(thinking)).toMatchObject({ usageStep: 0, usageCursor: 1 });
  expect(back(back(thinking)).stage).toBe("language");
});

test("horizontal arrows, Tab and Space cannot confirm questionnaire answers", () => {
  const first = enter(enter(createInitialState("en")));
  for (const [input, flags] of [["", { leftArrow: true }], ["", { rightArrow: true }], ["\t", {}], [" ", {}]] as const) {
    expect(reduce(first, { type: "key", input, flags })).toEqual(first);
  }
});

test("free-first and deep reasoning coexist without implicitly enabling premium models", () => {
  const ctx: Context = {
    providers: new Map([["anthropic-subscription", { tier: 1, subscription: true }], ["opencode", {}]]),
    excludes: [], freeFirst: true, reasoningPolicy: "deep", allowExpensive: false,
  };
  const explore = ALL_SLOTS.find((slot) => slot.id === "explore");
  const architect = ALL_SLOTS.find((slot) => slot.id === "architect");
  if (!explore || !architect) throw new Error("Missing tested slots");
  expect(rankFor(explore, ctx)[0]?.why).toBe("free");
  const options = rankFor(architect, ctx);
  expect(options[0]).toMatchObject({ provider: "anthropic-subscription", model: "claude-opus-5-5", reasoning: "max", why: "depth" });
  expect(options.some((choice) => /fable|astra/.test(choice.model))).toBe(false);
});

test.each([
  { policy: "save", subscription: true, tier: 4, budget: null, expected: "high" },
  { policy: "auto", subscription: false, tier: null, budget: 1000, expected: "high" },
  { policy: "auto", subscription: true, tier: 4, budget: null, expected: "max" },
  { policy: "deep", subscription: true, tier: 1, budget: null, expected: "max" },
] as const)("reasoning $policy follows explicit preference without API budget quota conversion ($subscription/$tier)", ({ policy, subscription, tier, budget, expected }) => {
  const slot = ALL_SLOTS.find((item) => item.id === "plan-consultant");
  if (!slot) throw new Error("Missing plan-consultant slot");
  const options = rankFor(slot, { providers: new Map([["anthropic-subscription", { subscription, tier, budget }]]), excludes: [], reasoningPolicy: policy, allowExpensive: false });
  expect(options[0]?.reasoning).toBe(expected);
});
