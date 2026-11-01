import { type Lang, LANGS, type Localized } from "./i18n.ts";
import {
  CUSTOM_APIS,
  type CustomApi,
  type Field,
  fieldsOf,
  findProvider,
  loginProviderOf,
  planTier,
  PROVIDERS,
  type Provider,
  type Relay,
  RELAYS,
  type Role,
  ROLES,
  type Tier,
} from "./providers.ts";
import { detectRelays } from "./custom.ts";
import { answerQuestion, questionCursor, QUESTIONS, type ReasoningPolicy, type RecommendationPreferences, type UsageStep } from "./preferences.ts";
import { buildProviderProfiles, type ProviderProfile, type ProfileIssue } from "./provider-profiles.ts";
import { blockedCount, choiceKey, defaultLane, type ProviderInfo, recommendFor, type SlotPick, turboPlan, type TurboPlan, type Usage } from "./recommend.ts";

export type FetchState = "idle" | "loading" | "ok" | "error";

export type CustomSpec = {
  readonly baseUrl: string;
  readonly api: CustomApi;
  readonly key: string;
  readonly relays: readonly Relay[];
  readonly relaysTouched: boolean;
  readonly fetch: FetchState;
  readonly fetchError: string | null;
  readonly available: readonly string[];
  readonly picked: readonly string[];
};

export function customModels(spec: CustomSpec): readonly string[] {
  return spec.picked.length > 0 ? spec.picked : spec.available;
}

export type Account = {
  readonly key: number;
  readonly provider: string;
  readonly name: string;
  readonly plan: string | null;
  readonly role?: Role;
  readonly budget?: number | null;
  readonly custom?: CustomSpec;
};

export const USAGES: readonly { readonly id: Usage; readonly label: Localized; readonly hint: Localized }[] = [
  {
    id: "single",
    label: { ko: "구독 1개로 씁니다", en: "One subscription" },
    hint: {
      ko: "구독 하나로 버팁니다. 한도를 아끼도록 자주 도는 일에는 싸고 빠른 모델을 씁니다.",
      en: "One plan does it all. Frequent work gets fast, cheap models to save your limits.",
    },
  },
  {
    id: "multi",
    label: { ko: "구독 여러 개를 씁니다", en: "Several subscriptions" },
    hint: {
      ko: "구독을 2개 이상 씁니다. 계정마다 주력·예비·아껴 쓰기 역할을 나눠 골고루 씁니다.",
      en: "Two or more plans. Each account gets a role so the load is spread out.",
    },
  },
  {
    id: "plenty",
    label: { ko: "넉넉한 구독이 있습니다", en: "Generous plans" },
    hint: {
      ko: "Max·Pro처럼 큰 구독이 있어 한도 걱정이 적습니다. 가장 좋은 모델과 깊은 생각을 씁니다.",
      en: "Big plans like Max or Pro, so limits rarely bite. Best models and deep thinking.",
    },
  },
  {
    id: "api",
    label: { ko: "API 요금으로 씁니다", en: "Pay per use (API)" },
    hint: {
      ko: "구독 없이 API 키로 쓴 만큼 냅니다. 월 예산에 맞춰 생각 깊이와 모델을 아낍니다.",
      en: "No plan, you pay per token. Thinking depth and models follow your monthly budget.",
    },
  },
  {
    id: "free",
    label: { ko: "무료로 쓰고 싶습니다", en: "Free models first" },
    hint: {
      ko: "OpenCode Zen, OpenRouter의 무료 모델을 먼저 씁니다. 돈을 쓰지 않는 것이 우선입니다.",
      en: "Free models from OpenCode Zen and OpenRouter come first. Spending nothing is the goal.",
    },
  },
];

export type Stage = "intro" | "language" | "usage" | "accounts" | "models" | "review" | "saving" | "login" | "failed" | "exit";

export type ModelsState = {
  readonly picks: readonly SlotPick[];
  readonly selected: Readonly<Record<string, number>>;
  readonly manual?: Readonly<Record<string, boolean>>;
  readonly defaultLane: string | null;
  readonly turbo: TurboPlan | null;
  readonly turboOn: boolean;
  readonly row: number;
  readonly blocked: Readonly<Record<string, number>>;
  readonly providerProfiles: readonly ProviderProfile[];
  readonly profileIssues: readonly ProfileIssue[];
  readonly profilesOn: boolean;
};

export const DEFAULT_CHOICE = -1;
export const ACCEPT_ROW = 0;

export type Focus = "providers" | "accounts";

export type Warning = "empty-selection" | "duplicate-name" | "reserved-name" | "bad-url" | "custom-incomplete";

export type TextField = "name" | "budget" | "baseUrl" | "apiKey";

export type ListField = "plan" | "role" | "budget" | "api" | "models" | "relays";

export const BUDGETS: readonly number[] = [10, 20, 50, 100, 200, 500, 1000];
export const BUDGET_CUSTOM = BUDGETS.length;
export const BUDGET_NONE = BUDGETS.length + 1;

export type Editing = { readonly key: number; readonly field: TextField; readonly buffer: string };

export type Dropdown = { readonly key: number; readonly field: ListField; readonly cursor: number };

export type Cell =
  | { readonly kind: "name" }
  | { readonly kind: "field"; readonly field: Field }
  | { readonly kind: "save" }
  | { readonly kind: "remove" };

export type WizardState = {
  readonly stage: Stage;
  readonly lang: Lang;
  readonly langCursor: number;
  readonly usage: Usage;
  readonly allowExpensive: boolean | null;
  readonly usageCursor: number;
  readonly usageStep: UsageStep;
  readonly freeFirst: boolean;
  readonly reasoningPolicy: ReasoningPolicy;
  readonly providerCursor: number;
  readonly focus: Focus;
  readonly row: number;
  readonly col: number;
  readonly accounts: readonly Account[];
  readonly providerOrder: readonly string[];
  readonly priority: { readonly cursor: number; readonly recommend: boolean; readonly grabbed: boolean } | null;
  readonly nextKey: number;
  readonly editing: Editing | null;
  readonly dropdown: Dropdown | null;
  readonly popup: number | null;
  readonly warning: Warning | null;
  readonly reviewCursor: number;
  readonly models: ModelsState | null;
  readonly excludes: readonly string[];
  readonly savedPath: string | null;
  readonly error: string | null;
};

export type KeyFlags = {
  readonly upArrow?: boolean;
  readonly downArrow?: boolean;
  readonly leftArrow?: boolean;
  readonly rightArrow?: boolean;
  readonly return?: boolean;
  readonly escape?: boolean;
  readonly backspace?: boolean;
  readonly delete?: boolean;
};

export type Command = "up" | "down" | "left" | "right" | "enter" | "back" | "quit" | "other";

export type Target =
  | { readonly kind: "start" }
  | { readonly kind: "lang"; readonly index: number }
  | { readonly kind: "usage"; readonly index: number }
  | { readonly kind: "expensive"; readonly on: boolean }
  | { readonly kind: "provider"; readonly index: number }
  | { readonly kind: "next" }
  | { readonly kind: "priorities" }
  | { readonly kind: "priorityRow"; readonly index: number }
  | { readonly kind: "priorityMove"; readonly index: number; readonly step: -1 | 1 }
  | { readonly kind: "priorityDone" }
  | { readonly kind: "priorityRecommend" }
  | { readonly kind: "back" }
  | { readonly kind: "cell"; readonly key: number; readonly cell: number }
  | { readonly kind: "option"; readonly key: number; readonly field: ListField; readonly index: number }
  | { readonly kind: "rename"; readonly key: number }
  | { readonly kind: "remove"; readonly key: number }
  | { readonly kind: "add" }
  | { readonly kind: "open"; readonly key: number }
  | { readonly kind: "done" }
  | { readonly kind: "review"; readonly index: number }
  | { readonly kind: "modelRow"; readonly row: number }
  | { readonly kind: "modelChoice"; readonly row: number; readonly choice: number }
  | { readonly kind: "lane"; readonly id: string }
  | { readonly kind: "turbo"; readonly on: boolean }
  | { readonly kind: "providerProfiles"; readonly on: boolean }
  | { readonly kind: "modelsNext" };

export type Action =
  | { readonly type: "key"; readonly input: string; readonly flags: KeyFlags }
  | { readonly type: "click"; readonly target: Target }
  | { readonly type: "wheel"; readonly delta: number }
  | { readonly type: "paste"; readonly text: string }
  | { readonly type: "excludes"; readonly excludes: readonly string[] }
  | { readonly type: "customFetched"; readonly key: number; readonly ids: readonly string[] | null; readonly error: string | null }
  | { readonly type: "saved"; readonly path: string }
  | { readonly type: "failed"; readonly message: string }
  | { readonly type: "exit" };

export const NEXT_INDEX = PROVIDERS.length;
export const EXPENSIVE_INDEX = NEXT_INDEX + 1;
export const PRIORITY_INDEX = NEXT_INDEX + 2;
export const REVIEW_EDIT = 0;
export const REVIEW_LOGIN = 1;

const NAME_CHAR = /[A-Za-z0-9_-]/;
const NAME_MAX = 64;
const BUDGET_MAX = 7;
const URL_MAX = 300;
const RESERVED = new Set(PROVIDERS.flatMap((p) => [p.id, loginProviderOf(p)]));

export function createInitialState(lang: Lang): WizardState {
  return {
    stage: "intro",
    lang,
    langCursor: Math.max(0, LANGS.indexOf(lang)),
    usage: "single",
    allowExpensive: false,
    usageCursor: 0,
    usageStep: 0,
    freeFirst: false,
    reasoningPolicy: "auto",
    providerCursor: 0,
    focus: "providers",
    row: 0,
    col: 0,
    accounts: [],
    providerOrder: [],
    priority: null,
    nextKey: 1,
    editing: null,
    dropdown: null,
    popup: null,
    warning: null,
    reviewCursor: REVIEW_LOGIN,
    models: null,
    excludes: [],
    savedPath: null,
    error: null,
  };
}

export function toCommand(input: string, flags: KeyFlags): Command {
  if (flags.upArrow) return "up";
  if (flags.downArrow) return "down";
  if (flags.leftArrow) return "left";
  if (flags.rightArrow) return "right";
  if (flags.return || input === "\r" || input === "\n") return "enter";
  if (flags.escape) return "back";
  if (input === "q") return "quit";
  return "other";
}

export function toCommands(input: string, flags: KeyFlags): Command[] {
  const chars = [...input];
  if (Object.values(flags).some(Boolean) || chars.length < 2) return [toCommand(input, flags)];
  return chars.map((char) => toCommand(char, {}));
}

export function accountsOf(state: WizardState, providerId: string): readonly Account[] {
  return state.accounts.filter((a) => a.provider === providerId);
}

export function focusedProvider(state: WizardState): Provider | undefined {
  return PROVIDERS[state.providerCursor];
}

export function focusedAccount(state: WizardState): Account | undefined {
  const provider = focusedProvider(state);
  return provider ? accountsOf(state, provider.id)[state.row] : undefined;
}

export function cellsOf(provider: Provider): readonly Cell[] {
  return [{ kind: "name" }, ...fieldsOf(provider).map((field): Cell => ({ kind: "field", field })), { kind: "save" }, { kind: "remove" }];
}

export function roleOf(account: Account): Role {
  return account.role ?? findProvider(account.provider).defaultRole ?? "main";
}

export function engineProviderOf(account: Account): string {
  const provider = findProvider(account.provider);
  return provider.kind === "custom" ? account.name : loginProviderOf(provider);
}

export function optionCount(provider: Provider, field: ListField, account?: Account): number {
  if (field === "models") return 1 + (account?.custom?.available.length ?? 0);
  switch (field) {
    case "plan":
      return provider.plans.length;
    case "role":
      return ROLES.length;
    case "api":
      return CUSTOM_APIS.length;
    case "relays":
      return RELAYS.length;
    case "budget":
      return BUDGETS.length + 2;
  }
}

export function sortedAccounts(accounts: readonly Account[]): Account[] {
  const order = new Map(PROVIDERS.map((p, i) => [p.id, i]));
  return [...accounts].sort((a, b) => (order.get(a.provider) ?? 0) - (order.get(b.provider) ?? 0) || a.key - b.key);
}

export function defaultAccountName(existing: readonly string[], base = "default"): string {
  if (existing.length === 0 && base === "default") return "default";
  if (!existing.includes(base) && base !== "default") return base;
  let n = existing.length + 1;
  const stem = base === "default" ? "account" : base;
  while (existing.includes(`${stem}-${n}`)) n += 1;
  return `${stem}-${n}`;
}

const wrap = (index: number, size: number) => (size === 0 ? 0 : (index + size) % size);

function patchAccount(state: WizardState, key: number, patch: (a: Account) => Account): WizardState {
  return { ...state, accounts: state.accounts.map((a) => (a.key === key ? patch(a) : a)) };
}

function patchCustom(account: Account, change: Partial<CustomSpec>): Account {
  return account.custom ? { ...account, custom: { ...account.custom, ...change } } : account;
}

function locate(state: WizardState, key: number): WizardState {
  const account = state.accounts.find((a) => a.key === key);
  if (!account) return state;
  const provider = findProvider(account.provider);
  return {
    ...state,
    providerCursor: PROVIDERS.indexOf(provider),
    focus: "accounts",
    row: accountsOf(state, provider.id).indexOf(account),
    popup: key,
  };
}

function openList(state: WizardState, key: number, field: ListField): WizardState {
  const account = state.accounts.find((a) => a.key === key);
  if (!account) return state;
  const provider = findProvider(account.provider);
  const current = (() => {
    switch (field) {
      case "plan":
        return provider.plans.findIndex((p) => p.id === account.plan);
      case "role":
        return ROLES.findIndex((r) => r.id === roleOf(account));
      case "api":
        return CUSTOM_APIS.findIndex((a) => a.id === account.custom?.api);
      case "budget": {
        if (account.budget == null) return 0;
        const preset = BUDGETS.indexOf(account.budget);
        return preset >= 0 ? preset : BUDGET_CUSTOM;
      }
      case "models":
      case "relays":
        return 0;
    }
  })();
  return { ...state, dropdown: { key, field, cursor: Math.max(0, current) }, warning: null };
}

function startEditing(state: WizardState, key: number, field: TextField): WizardState {
  const account = state.accounts.find((a) => a.key === key);
  if (!account) return state;
  const buffer =
    field === "name"
      ? account.name
      : field === "budget"
        ? account.budget == null
          ? ""
          : String(account.budget)
        : field === "baseUrl"
          ? (account.custom?.baseUrl ?? "")
          : "";
  return { ...state, editing: { key, field, buffer }, warning: null };
}

function activateCell(state: WizardState, account: Account, cell: Cell): WizardState {
  switch (cell.kind) {
    case "name":
      return startEditing(state, account.key, "name");
    case "remove":
      return removeAccount(state, account.key);
    case "save":
      return { ...state, popup: null, dropdown: null, editing: null, warning: null };
    case "field":
      if (cell.field === "baseUrl" || cell.field === "apiKey") return startEditing(state, account.key, cell.field);
      if (cell.field === "models" && account.custom?.fetch !== "ok") return startEditing(state, account.key, "apiKey");
      return openList(state, account.key, cell.field);
  }
}

function addAccount(state: WizardState): WizardState {
  const provider = focusedProvider(state);
  if (!provider) return state;
  const existing = accountsOf(state, provider.id);
  const custom = provider.kind === "custom";
  const account: Account = {
    key: state.nextKey,
    provider: provider.id,
    name: defaultAccountName(
      existing.map((a) => a.name),
      custom ? "relay" : "default",
    ),
    plan: provider.plans[0]?.id ?? null,
    role: provider.defaultRole ?? "main",
    budget: null,
    ...(custom
      ? {
          custom: {
            baseUrl: "",
            api: "openai-completions",
            key: "",
            relays: [],
            relaysTouched: false,
            fetch: "idle",
            fetchError: null,
            available: [],
            picked: [],
          } satisfies CustomSpec,
        }
      : {}),
  };
  const added: WizardState = {
    ...state,
    accounts: [...state.accounts, account],
    nextKey: state.nextKey + 1,
    focus: "accounts",
    row: existing.length,
    col: 1,
    popup: account.key,
    warning: null,
  };
  if (custom) return startEditing(added, account.key, "baseUrl");
  return provider.plans.length > 0 ? openList(added, account.key, "plan") : added;
}

function openProvider(state: WizardState, index: number): WizardState {
  const opened: WizardState = { ...state, providerCursor: index, warning: null, dropdown: null, editing: null, popup: null };
  const provider = focusedProvider(opened);
  if (!provider) return opened;
  return accountsOf(opened, provider.id).length === 0 ? addAccount(opened) : { ...opened, focus: "accounts", row: 0, col: 0 };
}

function removeAccount(state: WizardState, key: number): WizardState {
  const account = state.accounts.find((a) => a.key === key);
  if (!account) return state;
  const accounts = state.accounts.filter((a) => a.key !== key);
  const left = accounts.filter((a) => a.provider === account.provider).length;
  const next: WizardState = { ...state, accounts, editing: null, dropdown: null, popup: null };
  return left === 0 ? { ...next, focus: "providers", row: 0, col: 0 } : { ...next, row: Math.min(state.row, left - 1), col: 0 };
}

export function connectedProviders(accounts: readonly Account[]): Set<string> {
  return new Set(accounts.map(engineProviderOf));
}

function reconcileProviderOrder(accounts: readonly Account[], order: readonly string[], previous: readonly Account[] = accounts): readonly string[] {
  const connected = connectedProviders(accounts);
  const renamed = new Map(previous.flatMap((account) => {
    const next = accounts.find((a) => a.key === account.key);
    return next ? [[engineProviderOf(account), engineProviderOf(next)] as const] : [];
  }));
  return [...new Set([...order.map((id) => connected.has(id) ? id : renamed.get(id) ?? id), ...connected])].filter((id) => connected.has(id));
}

export function providerInfos(accounts: readonly Account[], providerOrder: readonly string[] = []): Map<string, ProviderInfo> {
  const rank: Record<Role, number> = { main: 0, efficient: 1, fallback: 2 };
  const priorities = new Map(reconcileProviderOrder(accounts, providerOrder).map((id, index) => [id, index]));
  const out = new Map<string, ProviderInfo>();
  for (const account of accounts) {
    const provider = findProvider(account.provider);
    const id = engineProviderOf(account);
    const info: ProviderInfo = {
      role: roleOf(account),
      tier: planTier(provider, account.plan) ?? null,
      budget: account.budget ?? null,
      subscription: provider.kind === "oauth" || (provider.plans.length > 0 && !provider.budget),
      priority: priorities.get(id) ?? 0,
      reserve: roleOf(account) === "fallback",
      ...(account.custom ? { relays: account.custom.relays, models: customModels(account.custom) } : {}),
    };
    const seen = out.get(id);
    if (!seen) {
      out.set(id, info);
      continue;
    }
    out.set(id, {
      ...seen,
      role: (rank[info.role ?? "main"] < rank[seen.role ?? "main"] ? info.role : seen.role) ?? "main",
      reserve: seen.reserve === true || info.reserve === true,
      tier: Math.max(seen.tier ?? -1, info.tier ?? -1) >= 0 ? (Math.max(seen.tier ?? -1, info.tier ?? -1) as Tier) : null,
      budget: seen.budget == null && info.budget == null ? null : (seen.budget ?? 0) + (info.budget ?? 0),
    });
  }
  return out;
}

export function allowsExpensive(state: Pick<WizardState, "usage" | "allowExpensive">): boolean {
  return state.allowExpensive ?? state.usage === "plenty";
}

export function buildModels(
  accounts: readonly Account[],
  excludes: readonly string[],
  usage: Usage | RecommendationPreferences,
  previous: ModelsState | null,
  allowExpensive = usage === "plenty",
  providerOrder: readonly string[] = [],
): ModelsState {
  const providers = providerInfos(accounts, providerOrder);
  const subscriptions = [...providers.values()].filter((info) => info.subscription).length;
  const preferences = typeof usage === "string" ? {} : usage;
  const derivedUsage: Usage = typeof usage === "string" ? usage : usage.freeFirst ? "free"
    : usage.reasoningPolicy === "deep" ? "plenty" : subscriptions > 1 ? "multi" : subscriptions === 1 ? "single" : "api";
  const ctx = { providers, excludes, usage: derivedUsage, allowExpensive, ...preferences };
  const picks = recommendFor(ctx);
  const blocked = Object.fromEntries(picks.map((pick) => [pick.slot.id, blockedCount(pick.slot, ctx)]));
  const selected: Record<string, number> = {};
  const manual: Record<string, boolean> = {};
  for (const pick of picks) {
    const explicit = previous?.manual?.[pick.slot.id] === true;
    const kept = explicit ? previous?.selected[pick.slot.id] : undefined;
    const oldChoice = kept === undefined ? undefined : previous?.picks.find((p) => p.slot.id === pick.slot.id)?.options[kept];
    const index = oldChoice ? pick.options.findIndex((option) => choiceKey(option) === choiceKey(oldChoice)) : DEFAULT_CHOICE;
    selected[pick.slot.id] = kept === DEFAULT_CHOICE ? DEFAULT_CHOICE : index >= 0 ? index : pick.options.length > 0 ? pick.recommended : DEFAULT_CHOICE;
    if (explicit && (kept === DEFAULT_CHOICE || index >= 0)) manual[pick.slot.id] = true;
  }
  const lane = previous?.defaultLane && (selected[previous.defaultLane] ?? DEFAULT_CHOICE) >= 0 ? previous.defaultLane : defaultLane(picks);
  const turbo = turboPlan(connectedProviders(accounts), excludes, { usage: derivedUsage, allowExpensive });
  const profiles = buildProviderProfiles(ctx, lane);
  return {
    picks,
    selected,
    manual,
    defaultLane: lane,
    turbo,
    turboOn: turbo !== null && allowExpensive && (previous?.turboOn ?? usage === "plenty"),
    row: ACCEPT_ROW,
    blocked,
    providerProfiles: profiles.profiles,
    profileIssues: profiles.issues,
    profilesOn: profiles.profiles.length > 0 && (previous?.profilesOn ?? false),
  };
}

export function slotRow(index: number): number {
  return index + 1;
}

export function slotAt(models: ModelsState, row: number): SlotPick | undefined {
  return row >= 1 ? models.picks[row - 1] : undefined;
}

export function modelRows(models: ModelsState): number {
  return 1 + models.picks.length + (models.turbo ? 1 : 0) + (profilesRow(models) === null ? 0 : 1);
}

export function profilesRow(models: ModelsState): number | null {
  return models.providerProfiles.length > 0 || models.profileIssues.length > 0
    ? models.picks.length + 1 + (models.turbo ? 1 : 0) : null;
}

export function turboRow(models: ModelsState): number | null {
  return models.turbo ? models.picks.length + 1 : null;
}

function goNext(state: WizardState, confirmed = false): WizardState {
  if (state.accounts.length === 0) return { ...state, priority: null, warning: "empty-selection" };
  const broken = state.accounts.find((a) => a.custom && !/^https?:\/\/\S+/.test(a.custom.baseUrl));
  if (broken) return { ...locate(state, broken.key), priority: null, col: 1, warning: "custom-incomplete" };
  if (!confirmed && connectedProviders(state.accounts).size >= 2) return openPriorities(state, true);
  return {
    ...state,
    stage: "models",
    models: buildModels(state.accounts, state.excludes, { freeFirst: state.freeFirst, reasoningPolicy: state.reasoningPolicy }, state.models, allowsExpensive(state), state.providerOrder),
    warning: null,
    editing: null,
    dropdown: null,
    popup: null,
    priority: null,
  };
}

function goReview(state: WizardState): WizardState {
  return { ...state, stage: "review", reviewCursor: REVIEW_LOGIN };
}

function withModels(state: WizardState, change: (m: ModelsState) => ModelsState): WizardState {
  return state.models ? { ...state, models: change(state.models) } : state;
}

function setChoice(models: ModelsState, row: number, choice: number): ModelsState {
  const pick = slotAt(models, row);
  if (!pick) return models;
  const lane = models.defaultLane === pick.slot.id && choice === DEFAULT_CHOICE ? null : models.defaultLane;
  return { ...models, row, defaultLane: lane, selected: { ...models.selected, [pick.slot.id]: choice }, manual: { ...models.manual, [pick.slot.id]: true } };
}

function cycleChoice(models: ModelsState, row: number, step: number): ModelsState {
  const pick = slotAt(models, row);
  if (!pick) return models;
  const size = pick.options.length + 1;
  const current = (models.selected[pick.slot.id] ?? DEFAULT_CHOICE) + 1;
  return setChoice(models, row, wrap(current + step, size) - 1);
}

function onModels(state: WizardState, command: Command): WizardState {
  const models = state.models;
  if (!models) return state;
  const size = modelRows(models);
  const turbo = turboRow(models);
  const profiles = profilesRow(models);
  switch (command) {
    case "up":
      return withModels(state, (m) => ({ ...m, row: wrap(m.row - 1, size) }));
    case "down":
      return withModels(state, (m) => ({ ...m, row: wrap(m.row + 1, size) }));
    case "left":
    case "right": {
      if (models.row === profiles) return withModels(state, (m) => ({ ...m, profilesOn: m.providerProfiles.length > 0 && !m.profilesOn }));
      if (models.row === turbo) return withModels(state, (m) => ({ ...m, turboOn: !m.turboOn }));
      return withModels(state, (m) => cycleChoice(m, m.row, command === "left" ? -1 : 1));
    }
    case "enter": {
      if (models.row === ACCEPT_ROW) return goReview(state);
      if (models.row === profiles) return withModels(state, (m) => ({ ...m, profilesOn: m.providerProfiles.length > 0 && !m.profilesOn }));
      if (models.row === turbo) return withModels(state, (m) => ({ ...m, turboOn: !m.turboOn }));
      const pick = slotAt(models, models.row);
      if (pick && pick.slot.kind === "lane" && (models.selected[pick.slot.id] ?? DEFAULT_CHOICE) >= 0) {
        return withModels(state, (m) => ({ ...m, defaultLane: pick.slot.id }));
      }
      return withModels(state, (m) => ({ ...m, row: wrap(m.row + 1, size) }));
    }
    case "back":
      return { ...state, stage: "accounts" };
    default:
      return state;
  }
}

function openPriorities(state: WizardState, recommend = false): WizardState {
  return {
    ...state,
    priority: { cursor: 0, recommend, grabbed: false },
    providerCursor: PRIORITY_INDEX,
    focus: "providers",
    popup: null,
    editing: null,
    dropdown: null,
    warning: null,
  };
}

function movePriority(state: WizardState, step: -1 | 1): WizardState {
  if (!state.priority) return state;
  const from = state.priority.cursor;
  const to = from + step;
  const id = state.providerOrder[from];
  if (!id || to < 0 || to >= state.providerOrder.length) return state;
  const order = [...state.providerOrder];
  order.splice(from, 1);
  order.splice(to, 0, id);
  return { ...state, providerOrder: order, priority: { ...state.priority, cursor: to } };
}

function onPriority(state: WizardState, command: Command): WizardState {
  const priority = state.priority;
  if (!priority) return state;
  const last = state.providerOrder.length;
  switch (command) {
    case "up":
      if (priority.grabbed) return movePriority(state, -1);
      return { ...state, priority: { ...priority, cursor: Math.max(0, priority.cursor - 1) } };
    case "down":
      if (priority.grabbed) return movePriority(state, 1);
      return { ...state, priority: { ...priority, cursor: Math.min(last, priority.cursor + 1) } };
    case "left":
    case "right":
      return state;
    case "enter":
      return priority.cursor === state.providerOrder.length
        ? goNext(state, true)
        : { ...state, priority: { ...priority, grabbed: !priority.grabbed } };
    case "back":
      return { ...state, priority: null };
    default:
      return state;
  }
}

function onProviders(state: WizardState, command: Command): WizardState {
  const cursors = [...PROVIDERS.map((_, index) => index), PRIORITY_INDEX, NEXT_INDEX, EXPENSIVE_INDEX];
  const cursor = cursors.indexOf(state.providerCursor);
  if (state.providerCursor === EXPENSIVE_INDEX) {
    switch (command) {
      case "left":
        return { ...state, allowExpensive: false };
      case "right":
        return { ...state, allowExpensive: true };
      case "enter":
        return { ...state, allowExpensive: !allowsExpensive(state) };
    }
  }
  switch (command) {
    case "up":
      return { ...state, providerCursor: cursors[wrap(cursor - 1, cursors.length)] ?? 0, warning: null };
    case "down":
      return { ...state, providerCursor: cursors[wrap(cursor + 1, cursors.length)] ?? 0, warning: null };
    case "right":
    case "enter":
      return state.providerCursor === NEXT_INDEX ? goNext(state) : state.providerCursor === PRIORITY_INDEX ? openPriorities(state) : openProvider(state, state.providerCursor);
    case "back":
      return { ...state, stage: "usage", usageStep: 2, usageCursor: state.allowExpensive ? 1 : 0, warning: null };
    default:
      return state;
  }
}

function onAccountsPanel(state: WizardState, command: Command): WizardState {
  const provider = focusedProvider(state);
  if (!provider) return state;
  const accounts = accountsOf(state, provider.id);
  const open = state.popup === null ? undefined : state.accounts.find((a) => a.key === state.popup);
  if (open) {
    const cells = cellsOf(provider);
    switch (command) {
      case "up":
        return { ...state, col: Math.max(0, state.col - 1) };
      case "down":
        return { ...state, col: Math.min(cells.length - 1, state.col + 1) };
      case "enter": {
        const cell = cells[state.col];
        return cell ? activateCell(state, open, cell) : state;
      }
      case "back":
        return { ...state, popup: null, warning: null };
      default:
        return state;
    }
  }
  switch (command) {
    case "up":
      return { ...state, row: Math.max(0, state.row - 1) };
    case "down":
      return { ...state, row: Math.min(accounts.length, state.row + 1) };
    case "enter": {
      const account = accounts[state.row];
      return account ? { ...state, popup: account.key, col: 0 } : addAccount(state);
    }
    case "left":
    case "back":
      return { ...state, focus: "providers" };
    default:
      return state;
  }
}

function pickOption(state: WizardState, dropdown: Dropdown, index: number): WizardState {
  const account = state.accounts.find((a) => a.key === dropdown.key);
  if (!account) return { ...state, dropdown: null };
  const provider = findProvider(account.provider);
  const close = (next: WizardState): WizardState => ({ ...next, dropdown: null });
  switch (dropdown.field) {
    case "plan": {
      const plan = provider.plans[index];
      return close(plan ? patchAccount(state, account.key, (a) => ({ ...a, plan: plan.id })) : state);
    }
    case "role": {
      const role = ROLES[index];
      return close(role ? patchAccount(state, account.key, (a) => ({ ...a, role: role.id })) : state);
    }
    case "budget": {
      if (index === BUDGET_CUSTOM) {
        const editing = startEditing(close(state), account.key, "budget");
        const preset = account.budget != null && BUDGETS.includes(account.budget);
        return preset && editing.editing ? { ...editing, editing: { ...editing.editing, buffer: "" } } : editing;
      }
      const amount = index === BUDGET_NONE ? null : (BUDGETS[index] ?? null);
      return close(patchAccount(state, account.key, (a) => ({ ...a, budget: amount })));
    }
    case "api": {
      const api = CUSTOM_APIS[index];
      return close(api ? patchAccount(state, account.key, (a) => patchCustom(a, { api: api.id })) : state);
    }
    case "models": {
      if (index === 0) return close(patchAccount(state, account.key, (a) => patchCustom(a, { picked: [] })));
      const id = account.custom?.available[index - 1];
      if (!id) return close(state);
      const toggled = patchAccount(state, account.key, (a) => {
        const picked = a.custom?.picked ?? [];
        return patchCustom(a, { picked: picked.includes(id) ? picked.filter((m) => m !== id) : [...picked, id] });
      });
      return { ...toggled, dropdown: { ...dropdown, cursor: index } };
    }
    case "relays": {
      const relay = RELAYS[index];
      if (!relay) return close(state);
      const toggled = patchAccount(state, account.key, (a) => {
        const relays = a.custom?.relays ?? [];
        return patchCustom(a, {
          relaysTouched: true,
          relays: relays.includes(relay.id) ? relays.filter((r) => r !== relay.id) : [...relays, relay.id],
        });
      });
      return { ...toggled, dropdown: { ...dropdown, cursor: index } };
    }
  }
}

function onDropdown(state: WizardState, dropdown: Dropdown, command: Command): WizardState {
  const account = state.accounts.find((a) => a.key === dropdown.key);
  if (!account) return { ...state, dropdown: null };
  const size = optionCount(findProvider(account.provider), dropdown.field, account);
  switch (command) {
    case "up":
      return { ...state, dropdown: { ...dropdown, cursor: wrap(dropdown.cursor - 1, size) } };
    case "down":
      return { ...state, dropdown: { ...dropdown, cursor: wrap(dropdown.cursor + 1, size) } };
    case "enter":
      return pickOption(state, dropdown, dropdown.cursor);
    case "back":
    case "left":
      return { ...state, dropdown: null };
    default:
      return state;
  }
}

function onCommand(state: WizardState, command: Command): WizardState {
  switch (state.stage) {
    case "intro":
      if (command === "enter") return { ...state, stage: "language" };
      if (command === "quit" || command === "back") return { ...state, stage: "exit" };
      return state;
    case "language":
      if (command === "up" || command === "left") return { ...state, langCursor: wrap(state.langCursor - 1, LANGS.length) };
      if (command === "down" || command === "right") return { ...state, langCursor: wrap(state.langCursor + 1, LANGS.length) };
      if (command === "enter") return { ...state, lang: LANGS[state.langCursor] ?? state.lang, stage: "usage" };
      if (command === "back") return { ...state, stage: "intro" };
      if (command === "quit") return { ...state, stage: "exit" };
      return state;
    case "usage":
      if (command === "up") return { ...state, usageCursor: wrap(state.usageCursor - 1, QUESTIONS[state.usageStep]?.options.length ?? 0) };
      if (command === "down") return { ...state, usageCursor: wrap(state.usageCursor + 1, QUESTIONS[state.usageStep]?.options.length ?? 0) };
      if (command === "enter") return answerQuestion(state, state.usageCursor);
      if (command === "back") {
        if (state.usageStep === 0) return { ...state, stage: "language" };
        const back = { ...state, usageStep: state.usageStep === 2 ? 1 : 0 } satisfies WizardState;
        return { ...back, usageCursor: questionCursor(back) };
      }
      return state;
    case "accounts":
      if (state.priority) return onPriority(state, command);
      if (state.dropdown) return onDropdown(state, state.dropdown, command);
      return state.focus === "providers" ? onProviders(state, command) : onAccountsPanel(state, command);
    case "models":
      return onModels(state, command);
    case "review":
      if (command === "left" || command === "up") return { ...state, reviewCursor: REVIEW_EDIT };
      if (command === "right" || command === "down") return { ...state, reviewCursor: REVIEW_LOGIN };
      if (command === "enter") return state.reviewCursor === REVIEW_LOGIN ? { ...state, stage: "saving" } : { ...state, stage: "models" };
      if (command === "back") return { ...state, stage: "models" };
      return state;
    case "failed":
      return { ...state, stage: "exit" };
    case "saving":
    case "login":
    case "exit":
      return state;
  }
}

function onClick(state: WizardState, target: Target): WizardState {
  if (state.priority && !["priorityRow", "priorityMove", "priorityDone", "priorityRecommend", "back"].includes(target.kind)) return state;
  if (state.editing && !(target.kind === "rename" && target.key === state.editing.key)) {
    return onClick({ ...state, editing: null }, target);
  }
  if (state.dropdown && target.kind !== "option") return onClick({ ...state, dropdown: null }, target);
  switch (target.kind) {
    case "priorities":
      return state.stage === "accounts" ? openPriorities(state) : state;
    case "priorityRow":
      return state.priority && target.index >= 0 && target.index < state.providerOrder.length
        ? { ...state, priority: { ...state.priority, cursor: target.index, grabbed: false } } : state;
    case "priorityMove":
      return state.priority && target.index >= 0 && target.index < state.providerOrder.length
        ? movePriority({ ...state, priority: { ...state.priority, cursor: target.index, grabbed: false } }, target.step)
        : state;
    case "priorityDone":
      return { ...state, priority: null };
    case "priorityRecommend":
      return state.priority ? goNext(state, true) : state;
    case "start":
      return state.stage === "intro" ? { ...state, stage: "language" } : state;
    case "lang":
      return state.stage === "language" ? { ...state, langCursor: target.index, lang: LANGS[target.index] ?? state.lang, stage: "usage" } : state;
    case "usage":
      return state.stage === "usage" ? answerQuestion(state, target.index) : state;
    case "expensive":
      return state.stage === "accounts" && state.popup === null
        ? { ...state, focus: "providers", providerCursor: EXPENSIVE_INDEX, allowExpensive: target.on, warning: null }
        : state;
    case "provider":
      return state.stage === "accounts" ? openProvider(state, target.index) : state;
    case "next":
      return state.stage === "accounts" ? goNext(state) : state;
    case "back":
      return onCommand({ ...state, focus: "providers" }, "back");
    case "add":
      return state.stage === "accounts" ? addAccount(state) : state;
    case "open":
      return state.stage === "accounts" ? { ...locate(state, target.key), col: 0, warning: null } : state;
    case "done":
      return state.stage === "accounts" ? { ...state, popup: null, dropdown: null, editing: null, warning: null } : state;
    case "cell":
    case "rename":
    case "remove": {
      const account = state.accounts.find((a) => a.key === target.key);
      if (state.stage !== "accounts" || !account) return state;
      const cells = cellsOf(findProvider(account.provider));
      const col = target.kind === "cell" ? target.cell : target.kind === "rename" ? 0 : cells.length - 1;
      const cell = cells[col];
      const placed = { ...locate(state, account.key), col, warning: null };
      return cell ? activateCell(placed, account, cell) : placed;
    }
    case "option": {
      if (state.stage !== "accounts") return state;
      const dropdown = state.dropdown?.key === target.key && state.dropdown.field === target.field ? state.dropdown : { key: target.key, field: target.field, cursor: target.index };
      return pickOption(locate(state, target.key), dropdown, target.index);
    }
    case "review":
      if (state.stage !== "review") return state;
      return target.index === REVIEW_LOGIN ? { ...state, stage: "saving" } : { ...state, stage: "models" };
    case "modelRow":
      return state.stage === "models" ? withModels(state, (m) => ({ ...m, row: target.row })) : state;
    case "modelChoice":
      return state.stage === "models" ? withModels(state, (m) => setChoice(m, target.row, target.choice)) : state;
    case "lane":
      return state.stage === "models"
        ? withModels(state, (m) => {
            const row = slotRow(m.picks.findIndex((p) => p.slot.id === target.id));
            return (m.selected[target.id] ?? DEFAULT_CHOICE) >= 0 ? { ...m, row, defaultLane: target.id } : { ...m, row };
          })
        : state;
    case "turbo":
      return state.stage === "models" ? withModels(state, (m) => ({ ...m, turboOn: m.turbo !== null && target.on })) : state;
    case "providerProfiles":
      return state.stage === "models" ? withModels(state, (m) => ({ ...m, profilesOn: m.providerProfiles.length > 0 && target.on })) : state;
    case "modelsNext":
      return state.stage === "models" ? goReview(state) : state;
  }
}

function acceptChar(field: TextField, buffer: string, char: string): string {
  switch (field) {
    case "name":
      if (!NAME_CHAR.test(char) || (buffer === "" && (char === "-" || char === "_")) || buffer.length >= NAME_MAX) return buffer;
      return buffer + char;
    case "budget":
      if (!/[0-9]/.test(char) || buffer.length >= BUDGET_MAX || (buffer === "" && char === "0")) return buffer;
      return buffer + char;
    case "baseUrl":
    case "apiKey":
      if (/\s/.test(char) || buffer.length >= URL_MAX) return buffer;
      return buffer + char;
  }
}

function submitEditing(state: WizardState, editing: Editing): WizardState {
  const account = state.accounts.find((a) => a.key === editing.key);
  if (!account) return { ...state, editing: null };
  const done = (next: WizardState): WizardState => ({ ...next, editing: null, warning: null });
  switch (editing.field) {
    case "name": {
      if (editing.buffer === "") return done(state);
      const taken = state.accounts.some((a) => a.key !== account.key && a.provider === account.provider && a.name === editing.buffer);
      if (taken) return { ...state, warning: "duplicate-name" };
      if (account.custom && RESERVED.has(editing.buffer)) return { ...state, warning: "reserved-name" };
      return done(patchAccount(state, account.key, (a) => ({ ...a, name: editing.buffer })));
    }
    case "budget":
      return done(patchAccount(state, account.key, (a) => ({ ...a, budget: editing.buffer === "" ? null : Number(editing.buffer) })));
    case "baseUrl": {
      const url = editing.buffer.replace(/\/+$/, "");
      if (!/^https?:\/\/\S+/.test(url)) return { ...state, warning: "bad-url" };
      const saved = done(patchAccount(state, account.key, (a) => patchCustom(a, { baseUrl: url, fetch: a.custom?.key ? "loading" : "idle" })));
      return account.custom?.key ? saved : { ...startEditing(saved, account.key, "apiKey"), col: 2 };
    }
    case "apiKey": {
      if (editing.buffer === "") return done(state);
      return { ...done(patchAccount(state, account.key, (a) => patchCustom(a, { key: editing.buffer, fetch: "loading", fetchError: null }))), col: 2 };
    }
  }
}

function onEditing(state: WizardState, editing: Editing, input: string, flags: KeyFlags): WizardState {
  if (flags.escape) return { ...state, editing: null, warning: null };
  if (flags.return) return submitEditing(state, editing);
  if (flags.backspace || flags.delete) return { ...state, editing: { ...editing, buffer: editing.buffer.slice(0, -1) }, warning: null };
  if (flags.upArrow || flags.downArrow || flags.leftArrow || flags.rightArrow) return state;
  let buffer = editing.buffer;
  for (const char of input) buffer = acceptChar(editing.field, buffer, char);
  return { ...state, editing: { ...editing, buffer }, warning: null };
}

function reduceAction(state: WizardState, action: Action): WizardState {
  switch (action.type) {
    case "key":
      if (state.editing && state.stage === "accounts") return onEditing(state, state.editing, action.input, action.flags);
      return toCommands(action.input, action.flags).reduce(onCommand, state);
    case "click":
      return onClick(state, action.target);
    case "wheel":
      if (state.editing) return state;
      return onCommand(state, action.delta < 0 ? "up" : "down");
    case "paste":
      return pasteInto(state, action.text);
    case "excludes":
      return { ...state, excludes: action.excludes };
    case "customFetched":
      return patchAccount(state, action.key, (a) =>
        patchCustom(a, {
          fetch: action.ids ? "ok" : "error",
          fetchError: action.error,
          available: action.ids ?? [],
          picked: (a.custom?.picked ?? []).filter((id) => action.ids?.includes(id)),
          ...(action.ids && !a.custom?.relaysTouched ? { relays: detectRelays(action.ids) } : {}),
        }),
      );
    case "saved":
      return state.stage === "saving" ? { ...state, stage: "login", savedPath: action.path } : state;
    case "failed":
      return { ...state, stage: "failed", error: action.message };
    case "exit":
      return { ...state, stage: "exit" };
  }
}

export function reduce(state: WizardState, action: Action): WizardState {
  const normalized = reconcileProviderOrder(state.accounts, state.providerOrder);
  const current = normalized.length === state.providerOrder.length && normalized.every((id, i) => id === state.providerOrder[i])
    ? state : { ...state, providerOrder: normalized };
  const next = reduceAction(current, action);
  const providerOrder = reconcileProviderOrder(next.accounts, next.providerOrder, current.accounts);
  return providerOrder.length === next.providerOrder.length && providerOrder.every((id, i) => id === next.providerOrder[i])
    ? next : { ...next, providerOrder };
}

export function pasteInto(state: WizardState, text: string): WizardState {
  if (!state.editing || state.stage !== "accounts") return state;
  return onEditing(state, state.editing, text.replace(/[\r\n]+/g, ""), {});
}
