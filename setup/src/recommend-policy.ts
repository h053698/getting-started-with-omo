import { ALL_SLOTS, LAST_RESORT, MODEL_TAIL, type Reasoning, type Slot } from "./catalog.ts";
import type { Choice, Context, ProviderInfo, Why } from "./recommend.ts";

export type Candidate = {
  readonly choice: Choice;
  readonly base: number;
  readonly host: number;
  readonly gateway: boolean;
  readonly relay: boolean;
};

export type Judged = { readonly score: readonly number[]; readonly choice: Choice };

export function expensiveAllowed(policy: Pick<Context, "usage" | "allowExpensive">): boolean {
  return policy.allowExpensive ?? policy.usage === "plenty";
}

export function modelAllowed(model: string, policy: Pick<Context, "usage" | "allowExpensive">): boolean {
  return expensiveAllowed(policy) || (model !== "claude-fable-5-1" && model !== "gpt-6-astra");
}

const CHEAP = new Set([
  "gpt-6-luna-fast", "claude-haiku-5-5", "deepseek-flash", "kimi-for-coding-highspeed",
  "glm-5.3-flash", "minimax-m2.7", "qwen3.6-flash", "qwen3.7-plus",
]);

// Fit groups are recommendation policy, not claims about provider capabilities.
const GENERAL = [
  ["opus", "fable", "astra", "sol", "kimi", "glm"],
  ["sonnet", "sol-fast", "legacy-sol", "grok", "deepseek"],
];
const REASONING = [
  ["astra", "sol", "opus", "fable"],
  ["legacy-sol", "kimi", "glm", "deepseek", "grok"],
];
const CONSULTING = [["fable", "opus"], ["sol", "kimi", "astra"], ["glm", "sonnet", "legacy-sol"]];
const FIT: Readonly<Record<string, readonly (readonly string[])[]>> = {
  "daily-normal": GENERAL,
  "daily-heavy": GENERAL,
  "geeky-normal": GENERAL,
  "geeky-heavy": REASONING,
  "plan-consultant": CONSULTING,
  "plan-reviewer": REASONING,
  architect: CONSULTING,
  "visual-engineering": [["gemini", "fable", "opus"], ["sol", "sonnet"], ["kimi", "glm", "legacy-sol"]],
  ultrabrain: REASONING,
  "deep-low": GENERAL,
  "deep-high": REASONING,
  artistry: [["fable", "opus"], ["sol", "gemini", "kimi"], ["glm", "sonnet", "legacy-sol"]],
  "unspecified-low": [["sonnet", "sol", "glm", "grok", "deepseek"], ["opus", "kimi", "legacy-sol"]],
  "unspecified-high": GENERAL,
  writing: [["gemini", "opus", "sonnet"], ["sol", "legacy-opus"], ["kimi", "glm", "legacy-sol"]],
};

const PREMIUM_TASKS = new Set([
  "daily-heavy", "geeky-heavy", "ultrabrain", "deep-high",
  "plan-reviewer", "plan-consultant", "architect",
]);

// Calling frequency is separate from reasoning difficulty (slot.load).
const RECURRING_TASKS = new Set([
  "daily-normal", "daily-heavy", "geeky-normal", "geeky-heavy",
  "explore", "librarian", "quick", "deep-low", "unspecified-low", "unspecified-high",
]);

function modelGroup(model: string): string {
  const groups: Readonly<Record<string, string>> = {
    "claude-fable-5-1": "fable",
    "claude-opus-5-5": "opus",
    "claude-opus-4-6": "legacy-opus",
    "claude-sonnet-5-5": "sonnet",
    "gpt-6-astra": "astra",
    "gpt-6.1-sol": "sol",
    "gpt-6.1-sol-fast": "sol-fast",
    "gpt-5.6-sol": "legacy-sol",
    "gpt-5.6-sol-fast": "sol-fast",
    "kimi-k3.1-pro": "kimi",
    "kimi-k3": "kimi",
    "glm-5.3": "glm",
    "glm-5.2": "glm",
    "gemini-4-argon": "gemini",
    "grok-4.7": "grok",
    "deepseek-v4-pro": "deepseek",
  };
  return groups[model] ?? model;
}

function suitability(slot: Slot, model: string, free: boolean): number {
  if (slot.load === "volume" && !FIT[slot.id]) return CHEAP.has(model) || free ? 0 : 1;
  const tiers = FIT[slot.id] ?? GENERAL;
  const tier = tiers.findIndex((models) => models.includes(modelGroup(model)));
  return tier < 0 ? tiers.length : tier;
}

const REASONING_ORDER: readonly Reasoning[] = ["off", "minimal", "low", "medium", "high", "xhigh", "max"];

// Checked against pi-ai's bundled providers/data/{zai,anthropic}.json on
// 2026-11-01. This is a snapshot, not a setup-time capability query. Other model
// rungs remain provisional hints; runtime provider metadata is authoritative.
const CONFIRMED_REASONING: Readonly<Record<string, readonly Reasoning[]>> = {
  "glm-5.3": ["low", "high", "max"],
  "glm-5.3-flash": ["low", "high", "max"],
  "claude-fable-5-1": ["xhigh", "max"],
};

const hints = new Map<string, Set<Reasoning>>();
for (const rung of [
  ...ALL_SLOTS.flatMap((slot) => slot.chain),
  ...Object.values(MODEL_TAIL).flat(),
  ...Object.values(LAST_RESORT).flat(),
]) {
  if (!rung.reasoning) continue;
  const levels = hints.get(rung.model) ?? new Set<Reasoning>();
  levels.add(rung.reasoning);
  hints.set(rung.model, levels);
}

function ample(info: ProviderInfo, ctx: Context): boolean {
  if (ctx.reasoningPolicy === "save") return false;
  if (ctx.reasoningPolicy === "deep") return true;
  if (ctx.reasoningPolicy === "auto") return info.subscription === true && (info.tier ?? 0) >= 4;
  return ctx.usage === "plenty" || (info.tier ?? 0) >= 4 || (info.budget ?? 0) >= 500;
}

function reasoningFor(choice: Choice, slot: Slot, info: ProviderInfo, ctx: Context): Reasoning | undefined {
  if (!choice.reasoning) return undefined;
  const model = choice.canonical ?? choice.model;
  const levels = REASONING_ORDER.filter((level) =>
    hints.get(model)?.has(level) && (CONFIRMED_REASONING[model]?.includes(level) ?? true),
  );
  if (levels.length === 0) return undefined;
  const deep = slot.load === "heavy" || slot.id === "artistry";
  const target = slot.load === "volume"
    ? Math.min(REASONING_ORDER.indexOf(choice.reasoning), REASONING_ORDER.indexOf("medium"))
    : ctx.reasoningPolicy === "deep"
      ? REASONING_ORDER.length - 1
    : deep
      ? REASONING_ORDER.indexOf(ample(info, ctx) ? choice.reasoning : "high")
      : Math.min(REASONING_ORDER.indexOf(choice.reasoning), REASONING_ORDER.indexOf(ample(info, ctx) ? "max" : "medium"));
  // Never synthesize an intermediate level merely because a budget is smaller.
  return levels.filter((level) => REASONING_ORDER.indexOf(level) <= target).at(-1) ?? levels[0];
}

export function judge(candidate: Candidate, slot: Slot, ctx: Context): Judged {
  const { choice } = candidate;
  const model = choice.canonical ?? choice.model;
  const info = ctx.providers.get(choice.provider) ?? {};
  const free = model.endsWith("-free") || model.endsWith(":free");
  const volume = slot.load === "volume";
  const freeFirst = volume && (ctx.freeFirst ?? ctx.usage === "free");
  const preferred = ctx.preferredFamily !== undefined && model.startsWith(`${ctx.preferredFamily}-`);
  const familyPenalty = ctx.preferredFamily && !preferred ? 1 : 0;
  const recurring = RECURRING_TASKS.has(slot.id);
  const fit = suitability(slot, model, free);
  // Only compare known subscription tiers. Unknown plans and API budgets have
  // no common capacity unit; mixed configurations retain explicit priority.
  // These are coarse policy bands, not token quotas or dollar multipliers.
  const active = [...ctx.providers.values()].filter((provider) => provider.role !== "fallback" && !provider.reserve);
  const capacityComparable = RECURRING_TASKS.has(slot.id) && active.length > 1 &&
    !(volume && active.some((provider) => provider.role === "efficient")) &&
    active.every((provider) => provider.subscription === true && provider.tier != null);
  const headroom = capacityComparable && info.subscription && info.tier != null
    ? info.tier >= 3 ? 2 : info.tier >= 2 ? 1 : 0
    : 0;
  // Permission adds premium candidates; it does not upgrade routine work.
  // A fit-0 ordinary model beats a premium candidate, but an unsuitable one
  // does not displace a premium model that fits the task.
  const routinePremium = !PREMIUM_TASKS.has(slot.id) && (model === "gpt-6-astra" || model === "claude-fable-5-1");
  const preference = volume && info.role === "efficient" ? 0 : info.role === "main" ? 1 : 2;
  const reasoning = reasoningFor(choice, slot, info, ctx);
  let why: Why = info.role === "main" ? "main" : volume && info.role === "efficient" ? "efficient" : "order";
  if (volume && CHEAP.has(model) && why === "order") why = "volume";
  if (reasoning !== choice.reasoning) why = "capped";
  if (reasoning && choice.reasoning && REASONING_ORDER.indexOf(reasoning) > REASONING_ORDER.indexOf(choice.reasoning)) why = "depth";
  if (headroom > 0) why = "capacity";
  if (preferred) why = "profile";
  if (free && freeFirst) why = "free";
  if (candidate.relay) why = "relay";
  else if (candidate.gateway) why = "gateway";
  const { reasoning: _old, ...rest } = choice;
  return {
    score: [
      choice.reserve ? 1 : 0,
      freeFirst && free ? -1 : 0,
      recurring ? familyPenalty : 0,
      fit + (routinePremium && fit === 0 ? 0.5 : 0),
      recurring ? 0 : familyPenalty,
      -headroom,
      info.priority ?? Number.MAX_SAFE_INTEGER,
      preference,
      info.budget != null && info.budget < 50 && !CHEAP.has(model) && !free ? 1 : 0,
      free && !freeFirst ? 1 : 0,
      candidate.base,
      candidate.gateway ? 1 : 0,
      candidate.host,
    ],
    choice: { ...rest, ...(reasoning ? { reasoning } : {}), why },
  };
}

export function compareJudged(a: Judged, b: Judged): number {
  for (let index = 0; index < a.score.length; index += 1) {
    const difference = (a.score[index] ?? 0) - (b.score[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
