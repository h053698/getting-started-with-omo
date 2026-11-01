import { expect, spyOn, test } from "bun:test";
import { toSetup } from "./app.tsx";
import { autoAnswerFor } from "./engine.ts";
import { splitMouse } from "./mouse.ts";
import { PROVIDERS } from "./providers.ts";
import * as recommendations from "./recommend.ts";
import {
  ACCEPT_ROW,
  BUDGET_CUSTOM,
  BUDGETS,
  buildModels,
  cellsOf,
  createInitialState,
  defaultAccountName,
  EXPENSIVE_INDEX,
  focusedAccount,
  focusedProvider,
  type KeyFlags,
  NEXT_INDEX,
  PRIORITY_INDEX,
  providerInfos,
  reduce,
  slotRow,
  type Target,
  turboRow,
  USAGES,
  type WizardState,
} from "./wizard.ts";

const key = (state: WizardState, input: string, flags: KeyFlags = {}) => reduce(state, { type: "key", input, flags });
const press = (state: WizardState, ...keys: (string | KeyFlags)[]) =>
  keys.reduce<WizardState>((s, k) => (typeof k === "string" ? key(s, k) : key(s, "", k)), state);
const click = (state: WizardState, target: Target) => reduce(state, { type: "click", target });

const ENTER = { return: true };
const ESC = { escape: true };
const UP = { upArrow: true };
const DOWN = { downArrow: true };
const LEFT = { leftArrow: true };
const RIGHT = { rightArrow: true };

const onAccounts = () => press(createInitialState("ko"), ENTER, ENTER, ENTER, ENTER, ENTER);
const indexOf = (id: string) => PROVIDERS.findIndex((p) => p.id === id);
const cellIndex = (state: WizardState, field: string) =>
  cellsOf(focusedProvider(state)!).findIndex((c) => (c.kind === "field" ? c.field === field : c.kind === field));
const addTo = (id: string) => press(onAccounts(), ...Array(indexOf(id)).fill(DOWN), ENTER);
const toNext = (state: WizardState) => {
  const next = click(click(state, { kind: "done" }), { kind: "next" });
  return next.priority ? click(next, { kind: "priorityRecommend" }) : next;
};

test("intro, language and usage lead to the accounts step", () => {
  let state = press(createInitialState("en"), ENTER, LEFT, ENTER);
  expect(state.stage).toBe("usage");
  expect(state.lang).toBe("ko");
  state = press(state, DOWN, ENTER, DOWN, ENTER, ENTER);
  expect(state.stage).toBe("accounts");
  expect(state.freeFirst).toBe(true);
  expect(state.reasoningPolicy).toBe("deep");
  expect(state.allowExpensive).toBe(false);
});

test("adding a subscription opens its plan list, and picking a plan closes it", () => {
  let state = addTo("anthropic-subscription");
  expect(state.accounts.map((a) => [a.provider, a.name, a.plan])).toEqual([["anthropic-subscription", "default", "auto"]]);
  expect(state.dropdown?.field).toBe("plan");
  state = press(state, DOWN, DOWN, ENTER);
  expect(focusedAccount(state)?.plan).toBe("max");
  expect(state.dropdown).toBeNull();
});

test("up and down walk the fields of one card, Enter edits the focused one", () => {
  let state = press(addTo("anthropic-subscription"), ESC);
  expect(state.dropdown).toBeNull();
  state = press(state, DOWN);
  expect(state.col).toBe(cellIndex(state, "role"));
  state = press(state, ENTER, DOWN, ENTER);
  expect(focusedAccount(state)?.role).toBe("fallback");
  state = press(state, UP, UP, ENTER);
  expect(state.editing?.field).toBe("name");
});

test("only Esc leaves the accounts step; the left arrow stays on the page", () => {
  const state = press(addTo("anthropic-subscription"), ESC, ESC, LEFT, LEFT);
  expect(state.stage).toBe("accounts");
  expect(state.popup).toBeNull();
  expect(state.focus).toBe("providers");
  expect(press(state, ESC).stage).toBe("usage");
});

test("rename and remove are cells reached with arrows and Enter", () => {
  let state = press(addTo("anthropic-subscription"), ESC, UP, UP, ENTER);
  expect(state.editing?.buffer).toBe("default");
  state = press(state, ...Array(7).fill({ backspace: true }), "work 한@", ENTER);
  expect(focusedAccount(state)?.name).toBe("work");
  state = press(state, ...Array(cellsOf(focusedProvider(state)!).length).fill(DOWN), ENTER);
  expect(state.accounts).toEqual([]);
  expect(state.focus).toBe("providers");
});

test("API billing offers dollar presets and a numeric custom amount", () => {
  let state = press(addTo("openai"), DOWN, ENTER);
  expect(state.dropdown?.field).toBe("budget");
  state = press(state, DOWN, DOWN, DOWN, ENTER);
  expect(focusedAccount(state)?.budget).toBe(BUDGETS[3]);
  expect(state.dropdown).toBeNull();
  state = press(state, ENTER, ...Array(BUDGET_CUSTOM - 3).fill(DOWN), ENTER);
  expect(state.editing?.field).toBe("budget");
  state = press(state, "0", "1x2.5", "0", ENTER);
  expect(focusedAccount(state)?.budget).toBe(1250);
  expect(focusedAccount(state)?.role).toBe("fallback");
  state = press(state, ENTER, DOWN, ENTER);
  expect(focusedAccount(state)?.budget).toBeNull();
});

test("the popup's save button closes it and keeps the changes", () => {
  let state = press(addTo("anthropic-subscription"), DOWN, ENTER);
  const save = cellsOf(focusedProvider(state)!).findIndex((c) => c.kind === "save");
  state = click(state, { kind: "cell", key: state.accounts[0]!.key, cell: save });
  expect(state.popup).toBeNull();
  expect(state.accounts[0]?.plan).toBe("pro");
});

test("a duplicate account name is refused", () => {
  let state = press(addTo("anthropic-subscription"), ESC, ESC, DOWN, ENTER);
  expect(state.accounts).toHaveLength(2);
  state = press(state, ESC, UP, ENTER, ...Array(9).fill({ backspace: true }), "default", ENTER);
  expect(state.warning).toBe("duplicate-name");
  expect(press(state, ESC).editing).toBeNull();
});

test("a custom API asks for a URL and key, and loading models fills the relay families", () => {
  let state = addTo("custom");
  expect(state.editing?.field).toBe("baseUrl");
  state = press(state, "ftp://x", ENTER);
  expect(state.warning).toBe("bad-url");
  state = press(state, ...Array(7).fill({ backspace: true }), "https://relay.test/v1/", ENTER);
  expect(state.editing?.field).toBe("apiKey");
  state = press(state, "sk-test", ENTER);
  const account = focusedAccount(state)!;
  expect(account.custom?.baseUrl).toBe("https://relay.test/v1");
  expect(account.custom?.fetch).toBe("loading");
  state = reduce(state, { type: "customFetched", key: account.key, ids: ["claude-opus-5-5", "gpt-6-astra"], error: null });
  expect(focusedAccount(state)?.custom?.relays).toEqual(["claude", "chatgpt"]);
  state = toNext(state);
  expect(state.stage).toBe("models");
  const daily = state.models!.picks.find((p) => p.slot.id === "daily-normal")!;
  expect(daily.options[0]).toMatchObject({ provider: "relay", model: "claude-opus-5-5" });
  expect(daily.options[0]?.why).toBe("relay");
});

test("the Next row needs an account, then models opens on the accept row and review follows", () => {
  const atNext = press(onAccounts(), ...Array(NEXT_INDEX + 1).fill(DOWN));
  expect(press(atNext, ENTER).warning).toBe("empty-selection");
  const models = toNext(press(addTo("chatgpt-subscription"), ESC));
  expect(models.stage).toBe("models");
  expect(models.models?.row).toBe(ACCEPT_ROW);
  const review = press(models, ENTER);
  expect(review.stage).toBe("review");
  expect(press(review, LEFT, ENTER).stage).toBe("models");
  const saving = press(review, ENTER);
  expect(saving.stage).toBe("saving");
  expect(reduce(saving, { type: "saved", path: "/tmp/x.json" }).stage).toBe("login");
});

test("clicks do the same work as keys", () => {
  let state = click(click(click(createInitialState("en"), { kind: "start" }), { kind: "lang", index: 1 }), { kind: "usage", index: 0 });
  state = click(click(state, { kind: "usage", index: 1 }), { kind: "usage", index: 0 });
  expect(state.stage).toBe("accounts");
  expect(state.lang).toBe("en");
  state = click(state, { kind: "provider", index: indexOf("github-copilot") });
  const account = state.accounts[0]!;
  expect(account.provider).toBe("github-copilot");
  const enterprise = PROVIDERS[indexOf("github-copilot")]!.plans.findIndex((p) => p.id === "enterprise");
  state = click(state, { kind: "option", key: account.key, field: "plan", index: enterprise });
  expect(state.accounts[0]?.plan).toBe("enterprise");
  expect(state.dropdown).toBeNull();
  state = click(state, { kind: "next" });
  expect(state.stage).toBe("models");
  state = click(state, { kind: "modelsNext" });
  expect(state.stage).toBe("review");
  expect(click(state, { kind: "review", index: 1 }).stage).toBe("saving");
});

test("the wheel moves the cursor like the arrow keys", () => {
  const state = reduce(onAccounts(), { type: "wheel", delta: 1 });
  expect(state.providerCursor).toBe(1);
});

test("mouse sequences are pulled out of keyboard input, even when split across chunks", () => {
  const first = splitMouse("a\u001B[<0;12;5Mb\u001B[<0;3");
  expect(first.text).toBe("ab");
  expect(first.events).toEqual([{ button: 0, x: 11, y: 4, release: false }]);
  const second = splitMouse(`${first.rest};7m\u001B[B`);
  expect(second.events).toEqual([{ button: 0, x: 2, y: 6, release: true }]);
  expect(second.text).toBe("\u001B[B");
});

test("default account names follow the engine's pattern", () => {
  expect(defaultAccountName([])).toBe("default");
  expect(defaultAccountName(["default"])).toBe("account-2");
  expect(defaultAccountName(["default", "account-3"])).toBe("account-4");
});

test("engine prompts are answered from the account the user configured", () => {
  const claude = { key: 1, provider: "anthropic-subscription", name: "work", plan: "max" };
  expect(autoAnswerFor(claude, null)("Name for this account (existing: default; press Enter to add account-2)")).toBe("work");
  const kimi = { key: 2, provider: "kimi-coding-cn", name: "default", plan: null };
  const options = ["Mainland China (kimi.com)", "Outside mainland China (kimi.ai)"];
  expect(autoAnswerFor(kimi, null)("Which Kimi service hosts your account?", options)).toBe(options[0]);
  const gpt = { key: 3, provider: "chatgpt-subscription", name: "default", plan: "pro-200" };
  expect(
    autoAnswerFor(gpt, null)("Select ChatGPT Subscription login method:", ["Browser login (default)", "Device code login (headless)"]),
  ).toBe("Browser login (default)");
  expect(autoAnswerFor(gpt, null)("Complete login in your browser, or paste the code:")).toBeUndefined();
});

test("the models step recommends from the added accounts and lets the user change or clear a slot", () => {
  let state = click(click(press(addTo("chatgpt-subscription"), ESC, ESC), { kind: "expensive", on: true }), { kind: "next" });
  expect(state.stage).toBe("models");
  const models = state.models!;
  expect(models.defaultLane).toBe("daily-normal");
  expect(models.turbo?.main.model).toBe("gpt-6-astra");
  expect(models.turboOn).toBe(false);
  const explore = slotRow(models.picks.findIndex((p) => p.slot.id === "explore"));
  state = click(state, { kind: "modelRow", row: explore });
  const first = state.models!.selected.explore;
  state = press(state, LEFT);
  expect(state.models!.selected.explore).toBe(-1);
  state = press(state, RIGHT);
  expect(state.models!.selected.explore).toBe(first);
  state = click(state, { kind: "modelRow", row: turboRow(state.models!)! });
  state = press(state, ENTER);
  expect(state.models!.turboOn).toBe(true);
  state = click(state, { kind: "lane", id: "daily-heavy" });
  expect(state.models!.defaultLane).toBe("daily-heavy");
});

test("without a Claude or ChatGPT subscription there is no turbo row", () => {
  const state = toNext(addTo("deepseek"));
  expect(state.models!.turbo).toBeNull();
});

test.each([
  { freeFirst: false, reasoningPolicy: "save", freeIndex: 0, thinkingIndex: 0 },
  { freeFirst: true, reasoningPolicy: "deep", freeIndex: 1, thinkingIndex: 2 },
] as const)("independent preferences $freeFirst/$reasoningPolicy reach recommendations without premium opt-in", ({ freeFirst, reasoningPolicy, freeIndex, thinkingIndex }) => {
  const recommend = spyOn(recommendations, "recommendFor");
  try {
    const question = press(createInitialState("ko"), ENTER, ENTER);
    const thinking = click(question, { kind: "usage", index: freeIndex });
    const premium = click(thinking, { kind: "usage", index: thinkingIndex });
    const accounts = press(premium, ENTER);
    const added = click(accounts, { kind: "provider", index: indexOf("chatgpt-subscription") });
    const state = click(added, { kind: "next" });
    expect(recommend.mock.calls.at(-1)?.[0]).toMatchObject({ freeFirst, reasoningPolicy, allowExpensive: false });
    expect(state.models?.turboOn).toBe(false);
  } finally {
    recommend.mockRestore();
  }
});

test("the expensive preference supports arrows and Enter but ignores Tab and Space", () => {
  const focused = press(onAccounts(), UP);
  expect(focused.providerCursor).toBe(EXPENSIVE_INDEX);
  const optedIn = press(focused, RIGHT);
  expect(optedIn.allowExpensive).toBe(true);
  expect(press(optedIn, "\t", " ").allowExpensive).toBe(true);
  expect(press(optedIn, LEFT).allowExpensive).toBe(false);
  expect(press(optedIn, ENTER).allowExpensive).toBe(false);
  expect(press(focused, DOWN).providerCursor).toBe(0);
});

test.each([
  { on: true, usageIndex: 0 },
  { on: false, usageIndex: 2 },
])("explicit expensive preference $on persists across models and usage navigation", ({ on, usageIndex }) => {
  const recommend = spyOn(recommendations, "recommendFor");
  try {
    const selected = click(press(addTo("chatgpt-subscription"), ESC, ESC), { kind: "expensive", on });
    const models = click(selected, { kind: "next" });
    const back = press(models, ESC, ESC, ESC);
    const thinking = click(back, { kind: "usage", index: usageIndex });
    const accounts = press(thinking, ENTER);
    const rebuilt = click(accounts, { kind: "next" });
    expect(rebuilt.allowExpensive).toBe(on);
    expect(recommend.mock.calls.at(-1)?.[0]).toMatchObject({ allowExpensive: on });
    expect(rebuilt.models?.turboOn).toBe(false);
  } finally {
    recommend.mockRestore();
  }
});

test("opting out disables a previously enabled turbo on rebuild", () => {
  const optedIn = click(press(addTo("chatgpt-subscription"), ESC, ESC), { kind: "expensive", on: true });
  const models = click(click(optedIn, { kind: "next" }), { kind: "turbo", on: true });
  const accounts = click(press(models, ESC), { kind: "expensive", on: false });
  const rebuilt = click(accounts, { kind: "next" });
  expect(rebuilt.models?.turboOn).toBe(false);
});

test("buildModels keeps four-argument callers compatible and honors explicit opt-out", () => {
  const recommend = spyOn(recommendations, "recommendFor");
  try {
    buildModels([], [], "plenty", null);
    expect(recommend.mock.calls.at(-1)?.[0]).toMatchObject({ allowExpensive: true });
    buildModels([], [], "plenty", null, false);
    expect(recommend.mock.calls.at(-1)?.[0]).toMatchObject({ allowExpensive: false });
  } finally {
    recommend.mockRestore();
  }
});

test("rebuilding recommendations preserves model identity when earlier choices are removed", () => {
  const accounts = [
    { key: 1, provider: "anthropic-subscription", name: "default", plan: "max" },
    { key: 2, provider: "chatgpt-subscription", name: "default", plan: "pro-200" },
  ];
  const models = buildModels(accounts, [], "single", null, true);
  const pick = models.picks.find((p) => p.slot.id === "daily-heavy");
  const first = pick?.options[0];
  const chosen = pick?.options[1];
  expect(first).toBeDefined();
  expect(chosen).toBeDefined();
  if (!pick || !first || !chosen) return;
  const previous = { ...models, selected: { ...models.selected, [pick.slot.id]: 1, explore: -1 }, manual: { [pick.slot.id]: true, explore: true } };

  const rebuilt = buildModels(accounts, [recommendations.choiceKey(first)], "single", previous, true);
  const selected = rebuilt.picks.find((p) => p.slot.id === pick.slot.id)?.options[rebuilt.selected[pick.slot.id] ?? -1];

  expect(selected ? recommendations.choiceKey(selected) : null).toBe(recommendations.choiceKey(chosen));
  expect(rebuilt.selected.explore).toBe(-1);
});

test("opting out removes expensive models from saved chains and Turbo", () => {
  const optedIn = click(press(addTo("chatgpt-subscription"), ESC, ESC), { kind: "expensive", on: true });
  const enabled = click(click(optedIn, { kind: "next" }), { kind: "turbo", on: true });
  expect(enabled.models).not.toBeNull();
  if (!enabled.models) return;
  const before = toSetup(enabled.models, enabled.accounts);
  expect(before.slots.flatMap((slot) => slot.chain).some((choice) => /fable|astra/.test(choice.model))).toBe(true);
  expect(before.turbo?.model).toBe("gpt-6-astra");

  const rebuilt = click(click(press(enabled, ESC), { kind: "expensive", on: false }), { kind: "next" });
  expect(rebuilt.models).not.toBeNull();
  if (!rebuilt.models) return;
  const saved = toSetup(rebuilt.models, rebuilt.accounts);
  expect(saved.slots.flatMap((slot) => slot.chain).some((choice) => /fable|astra/.test(choice.model))).toBe(false);
  expect(rebuilt.models.turbo?.main.model).toBe("gpt-6.1-sol");
  expect(saved.turbo).toBeNull();
});

const priorityAccounts = (): WizardState => ({
  ...onAccounts(),
  accounts: [
    { key: 1, provider: "anthropic-subscription", name: "work", plan: "max", role: "main" },
    { key: 2, provider: "chatgpt-subscription", name: "personal", plan: "pro-200", role: "main" },
  ],
  nextKey: 3,
});

test("Next with multiple providers focuses priorities until the explicit recommendation button", () => {
  const state = click(priorityAccounts(), { kind: "next" });
  expect(state.stage).toBe("accounts");
  expect(state.priority).toEqual({ cursor: 0, recommend: true, grabbed: false });
  expect(state.models).toBeNull();
  expect(press(state, ENTER).priority?.grabbed).toBe(true);
  const accepted = press(state, DOWN, DOWN, ENTER);
  expect(accepted.stage).toBe("models");
  expect(accepted.priority).toBeNull();
});

test("the priority action is keyboard reachable without changing Next and expensive indices", () => {
  const state = press({ ...onAccounts(), providerCursor: PROVIDERS.length - 1 }, DOWN);
  expect(state.providerCursor).toBe(PRIORITY_INDEX);
  expect(press(state, ENTER).priority).not.toBeNull();
  expect(press(state, DOWN).providerCursor).toBe(NEXT_INDEX);
  expect(press(state, DOWN, DOWN).providerCursor).toBe(EXPENSIVE_INDEX);
});

test("Enter picks up a provider, arrows move it, and Enter puts it down", () => {
  const state = click(priorityAccounts(), { kind: "priorities" });
  expect(press(state, DOWN).providerOrder).toEqual(state.providerOrder);
  const moved = press(state, ENTER, DOWN);
  expect(moved.providerOrder).toEqual(["chatgpt-subscription", "anthropic-subscription"]);
  expect(moved.priority?.cursor).toBe(1);
  expect(moved.accounts).toBe(state.accounts);
  expect(moved.priority?.grabbed).toBe(true);
  expect(press(moved, UP).providerOrder).toEqual(state.providerOrder);
  const dropped = press(moved, ENTER);
  expect(dropped.priority?.grabbed).toBe(false);
  expect(press(dropped, UP).providerOrder).toEqual(moved.providerOrder);
  expect(press(moved, LEFT, RIGHT).providerOrder).toEqual(moved.providerOrder);
  expect(press(moved, "\t", " ").providerOrder).toEqual(moved.providerOrder);
});

test("priority movement at either boundary is a no-op", () => {
  const state = press(click(priorityAccounts(), { kind: "priorities" }), ENTER);
  expect(press(state, UP)).toBe(state);
  const last = press(state, DOWN);
  expect(press(last, DOWN)).toBe(last);
  expect(last.priority?.cursor).toBe(1);
});

test("inline mouse arrows move their own row without a prior selection", () => {
  const state = click(priorityAccounts(), { kind: "priorities" });
  const moved = click(state, { kind: "priorityMove", index: 1, step: -1 });
  expect(moved.providerOrder).toEqual(["chatgpt-subscription", "anthropic-subscription"]);
  expect(moved.priority?.cursor).toBe(0);
  expect(moved.priority?.grabbed).toBe(false);
  expect(press(moved, ESC).priority).toBeNull();
});

test("priority focus blocks underlying account clicks and Esc closes only the popup", () => {
  const state = click(priorityAccounts(), { kind: "priorities" });
  expect(click(state, { kind: "provider", index: 0 })).toBe(state);
  const closed = press(state, ENTER, DOWN, ESC);
  expect(closed.stage).toBe("accounts");
  expect(closed.priority).toBeNull();
  expect(closed.providerOrder).toEqual(["chatgpt-subscription", "anthropic-subscription"]);
  expect(press(closed, LEFT).stage).toBe("accounts");
});

test("recommending from manual priorities reveals account validation instead of hiding it", () => {
  const opened = click(addTo("custom"), { kind: "priorities" });
  const state = click(opened, { kind: "priorityRecommend" });
  expect(state.priority).toBeNull();
  expect(state.warning).toBe("custom-incomplete");
  expect(state.popup).toBe(state.accounts[0]?.key ?? -1);
  expect(state.stage).toBe("accounts");
});

test("regional variants and multiple accounts share one engine provider priority", () => {
  const state = click({
    ...onAccounts(),
    accounts: [
      { key: 1, provider: "kimi-coding-cn", name: "china", plan: null },
      { key: 2, provider: "kimi-coding", name: "global", plan: null },
      { key: 3, provider: "kimi-coding", name: "work", plan: null },
    ],
  }, { kind: "next" });
  expect(state.providerOrder).toEqual(["kimi-coding"]);
  expect(state.stage).toBe("models");
  expect(providerInfos(state.accounts, state.providerOrder).size).toBe(1);
});

test("deleting the last grouped account drops its priority and readding appends it", () => {
  const state = click({
    ...priorityAccounts(),
    accounts: [...priorityAccounts().accounts, { key: 3, provider: "anthropic-subscription", name: "second", plan: "pro" }],
    nextKey: 4,
  }, { kind: "priorities" });
  const closed = press(state, ESC);
  const oneLeft = click(closed, { kind: "remove", key: 1 });
  expect(oneLeft.providerOrder).toEqual(["anthropic-subscription", "chatgpt-subscription"]);
  const removed = click(oneLeft, { kind: "remove", key: 3 });
  expect(removed.providerOrder).toEqual(["chatgpt-subscription"]);
  const readded = click(removed, { kind: "provider", index: indexOf("anthropic-subscription") });
  expect(readded.providerOrder).toEqual(["chatgpt-subscription", "anthropic-subscription"]);
});

test("renaming a custom provider transfers its order position by account key", () => {
  const custom = press(addTo("custom"), "https://relay.test/v1", ENTER, "secret", ENTER);
  const state = click({
    ...custom,
    accounts: [...custom.accounts, ...priorityAccounts().accounts.map((a) => ({ ...a, key: a.key + 1 }))],
    nextKey: 4,
    providerOrder: ["chatgpt-subscription", "relay", "anthropic-subscription"],
  }, { kind: "rename", key: 1 });
  const renamed = press(state, ...Array(5).fill({ backspace: true }), "office", ENTER);
  expect(renamed.accounts[0]?.name).toBe("office");
  expect(renamed.providerOrder).toEqual(["chatgpt-subscription", "office", "anthropic-subscription"]);
});

test("priority persists through model back navigation and usage navigation", () => {
  const moved = press(click(priorityAccounts(), { kind: "next" }), ENTER, DOWN, ENTER);
  const models = click(moved, { kind: "priorityRecommend" });
  const back = press(models, ESC);
  expect(back.providerOrder).toEqual(["chatgpt-subscription", "anthropic-subscription"]);
  const usage = press(back, ESC);
  expect(usage.stage).toBe("usage");
  const accounts = click(usage, { kind: "usage", index: 0 });
  expect(click(accounts, { kind: "next" }).providerOrder).toEqual(back.providerOrder);
});

test("recommendations receive normalized provider priorities and the existing expensive preference", () => {
  const recommend = spyOn(recommendations, "recommendFor");
  try {
    const moved = press(click({ ...priorityAccounts(), allowExpensive: false }, { kind: "next" }), ENTER, DOWN, ENTER);
    const models = click(moved, { kind: "priorityRecommend" });
    const context = recommend.mock.calls.at(-1)?.[0];
    expect(context?.providers.get("chatgpt-subscription")?.priority).toBe(0);
    expect(context?.providers.get("anthropic-subscription")?.priority).toBe(1);
    expect(context?.allowExpensive).toBe(false);
    expect(models.models?.turboOn).toBe(false);
  } finally {
    recommend.mockRestore();
  }
});

test("merged provider information keeps reserve intent when an active account wins its role", () => {
  const infos = providerInfos([
    { key: 1, provider: "kimi-coding", name: "main", plan: null, role: "main" },
    { key: 2, provider: "kimi-coding-cn", name: "reserve", plan: null, role: "fallback" },
  ], ["kimi-coding"]);
  expect(infos.get("kimi-coding")).toMatchObject({ priority: 0, role: "main", reserve: true });
  const reversed = providerInfos([
    { key: 1, provider: "kimi-coding-cn", name: "reserve", plan: null, role: "fallback" },
    { key: 2, provider: "kimi-coding", name: "main", plan: null, role: "main" },
  ]);
  expect(reversed.get("kimi-coding")).toMatchObject({ role: "main", reserve: true });
});

test("changing provider order recalculates automatic picks but preserves explicit picks by identity", () => {
  const initial = click(click(priorityAccounts(), { kind: "next" }), { kind: "priorityRecommend" });
  const heavy = initial.models?.picks.findIndex((p) => p.slot.id === "daily-heavy") ?? -1;
  const manual = click(initial, { kind: "modelChoice", row: slotRow(heavy), choice: 1 });
  const original = manual.models?.picks[heavy]?.options[1];
  const reordered = press(click(press(manual, ESC), { kind: "priorities" }), ENTER, DOWN, ENTER);
  const rebuilt = click(reordered, { kind: "priorityRecommend" });
  const models = rebuilt.models;
  expect(models).not.toBeNull();
  if (!models) return;
  const daily = models.picks.find((p) => p.slot.id === "daily-normal");
  const chosen = models.picks[heavy]?.options[models.selected["daily-heavy"] ?? -1];
  expect(daily?.options[models.selected["daily-normal"] ?? -1]?.provider).toBe("chatgpt-subscription");
  expect(chosen).toMatchObject({ provider: original?.provider, model: original?.model });
  expect(models.manual?.["daily-normal"]).toBeUndefined();
  expect(models.manual?.["daily-heavy"]).toBe(true);
});
