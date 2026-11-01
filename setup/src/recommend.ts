import { LAST_RESORT, MODEL_TAIL, ALL_SLOTS, DEFAULT_LANE_ORDER, LANES, type Reasoning, type Rung, type Slot } from "./catalog.ts";
import { matchModel } from "./custom.ts";
import type { Relay, Role, Tier } from "./providers.ts";
import type { ReasoningPolicy } from "./preferences.ts";
import { compareJudged, judge, modelAllowed, type Candidate, type Judged } from "./recommend-policy.ts";

export type Usage = "free" | "single" | "multi" | "plenty" | "api";

export type Why = "order" | "main" | "efficient" | "volume" | "free" | "capped" | "depth" | "capacity" | "profile" | "gateway" | "relay" | "rescue";
export type ProfileFamily = "claude" | "gpt" | "grok" | "glm" | "kimi" | "gemini" | "deepseek" | "minimax" | "qwen";

export type Choice = {
  readonly provider: string;
  readonly model: string;
  readonly reasoning?: Reasoning;
  readonly canonical?: string;
  readonly why?: Why;
  readonly reserve?: boolean;
};

export type SlotPick = { readonly slot: Slot; readonly options: readonly Choice[]; readonly recommended: number };

export type TurboPlan = { readonly main: Choice; readonly reason: "claude" | "chatgpt" };

export type ProviderInfo = {
  readonly priority?: number;
  readonly reserve?: boolean;
  readonly role?: Role;
  readonly tier?: Tier | null;
  readonly budget?: number | null;
  readonly subscription?: boolean;
  readonly relays?: readonly Relay[];
  readonly models?: readonly string[];
};

export type Context = {
  readonly providers: ReadonlyMap<string, ProviderInfo>;
  readonly excludes: readonly string[];
  readonly usage?: Usage;
  readonly allowExpensive?: boolean;
  readonly freeFirst?: boolean;
  readonly reasoningPolicy?: ReasoningPolicy;
  readonly preferredFamily?: ProfileFamily;
};

const PROVIDER_MODEL_IDS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "kimi-coding": { "kimi-k3.1-pro": "k3.1-pro", "kimi-k3": "k3" },
};

const OPENROUTER: Readonly<Record<string, string>> = {
  "claude-opus-5-5": "anthropic/claude-opus-5.5",
  "claude-fable-5-1": "anthropic/claude-fable-5.1",
  "claude-sonnet-5-5": "anthropic/claude-sonnet-5.5",
  "claude-haiku-5-5": "anthropic/claude-haiku-5.5",
  "claude-opus-4-6": "anthropic/claude-opus-4.6",
  "gpt-6-astra": "openai/gpt-6-astra",
  "gpt-6.1-sol": "openai/gpt-6.1-sol",
  "gpt-5.6-sol": "openai/gpt-5.6-sol",
  "kimi-k3.1-pro": "moonshotai/kimi-k3.1-pro",
  "kimi-k3": "moonshotai/kimi-k3",
  "glm-5.3": "z-ai/glm-5.3",
  "glm-5.2": "z-ai/glm-5.2",
  "glm-5.3-flash": "z-ai/glm-5.3-flash",
  "gemini-4-argon": "google/gemini-4-argon",
  "deepseek-v4-pro": "deepseek/deepseek-v4-pro",
  "deepseek-flash": "deepseek/deepseek-v4.1-flash",
  "grok-4.7": "x-ai/grok-4.7",
  "minimax-m2.7": "minimax/minimax-m2.7",
};

const VERCEL: Readonly<Record<string, string>> = {
  "claude-opus-5-5": "anthropic/claude-opus-5.5",
  "claude-fable-5-1": "anthropic/claude-fable-5.1",
  "claude-sonnet-5-5": "anthropic/claude-sonnet-5.5",
  "claude-haiku-5-5": "anthropic/claude-haiku-5.5",
  "claude-opus-4-6": "anthropic/claude-opus-4.6",
  "gpt-6-astra": "openai/gpt-6-astra",
  "gpt-6.1-sol": "openai/gpt-6.1-sol",
  "gpt-6.1-sol-fast": "openai/gpt-6.1-sol-fast",
  "gpt-5.6-sol": "openai/gpt-5.6-sol",
  "gpt-5.6-sol-fast": "openai/gpt-5.6-sol-fast",
  "gpt-6-luna-fast": "openai/gpt-6-luna-fast",
  "kimi-k3.1-pro": "moonshotai/kimi-k3.1-pro",
  "kimi-k3": "moonshotai/kimi-k3",
  "gemini-4-argon": "google/gemini-4-argon",
  "deepseek-v4-pro": "deepseek/deepseek-v4-pro",
  "deepseek-flash": "deepseek/deepseek-v4.1-flash",
  "minimax-m2.7": "minimax/minimax-m2.7",
};

const GATEWAYS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  openrouter: OPENROUTER,
  "vercel-ai-gateway": VERCEL,
};

export const RELAY_MODELS: Readonly<Record<Relay, readonly string[]>> = {
  claude: ["claude-opus-5-5", "claude-fable-5-1", "claude-sonnet-5-5", "claude-haiku-5-5"],
  kiro: ["claude-sonnet-5-5", "claude-opus-5-5", "claude-haiku-5-5"],
  chatgpt: ["gpt-6-astra", "gpt-6.1-sol", "gpt-5.6-sol", "gpt-6-luna-fast"],
  grok: ["grok-4.7"],
  glm: ["glm-5.3", "glm-5.2", "glm-5.3-flash"],
  kimi: ["kimi-k3.1-pro", "kimi-k3"],
  gemini: ["gemini-4-argon"],
  deepseek: ["deepseek-v4-pro", "deepseek-flash"],
};

const FREE: readonly Rung[] = [
  { model: "deepseek-v4.1-flash-free", providers: ["opencode"] },
  { model: "glm-5.3-flash-free", providers: ["opencode"] },
  { model: "minimax-m3.1-flash-free", providers: ["opencode", "opencode-go"] },
  { model: "nvidia/nemotron-3-ultra-550b-a55b:free", providers: ["openrouter"] },
];

export function servedId(provider: string, model: string): string {
  return GATEWAYS[provider]?.[model] ?? PROVIDER_MODEL_IDS[provider]?.[model] ?? model;
}

export function choiceKey(choice: Choice): string {
  return `${choice.provider}/${choice.model}`;
}

function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

export function isExcluded(choice: Choice, excludes: readonly string[]): boolean {
  return excludes.some((glob) => {
    const pattern = globToRegExp(glob);
    return glob.includes("/") ? pattern.test(choiceKey(choice)) : pattern.test(choice.model);
  });
}

export function familyOf(model: string): string {
  return model.split(/[-.]/)[0] ?? model;
}

function candidates(slot: Slot, ctx: Context): Candidate[] {
  const baseChain = slot.load === "volume" ? [...slot.chain, ...FREE] : [...slot.chain];
  const chain = [...baseChain, ...MODEL_TAIL[slot.load]];
  const out: Candidate[] = [];
  for (const [base, rung] of chain.entries()) {
    if (!modelAllowed(rung.model, ctx)) continue;
    const relayHosts = [...ctx.providers]
      .map(([id, info]) => {
        if (info.models !== undefined) {
          const served = matchModel(rung.model, info.models);
          return served ? { id, served } : null;
        }
        return info.relays?.some((relay) => RELAY_MODELS[relay].includes(rung.model)) ? { id, served: rung.model } : null;
      })
      .filter((host): host is { id: string; served: string } => host !== null);
    const providers: readonly { readonly id: string; readonly gateway: boolean; readonly relay: boolean; readonly served?: string }[] = [
      ...rung.providers.map((id) => ({ id, gateway: false, relay: false })),
      ...Object.keys(GATEWAYS)
        .filter((id) => GATEWAYS[id]?.[rung.model])
        .map((id) => ({ id, gateway: true, relay: false })),
      ...relayHosts.map((host) => ({ id: host.id, gateway: false, relay: true, served: host.served })),
    ];
    for (const [hostOrder, host] of providers.entries()) {
      const info = ctx.providers.get(host.id);
      if (!info) continue;
      const served = info.models === undefined ? host.served ?? servedId(host.id, rung.model) : matchModel(rung.model, info.models);
      if (!served) continue;
      out.push({
        choice: {
          provider: host.id,
          model: served,
          canonical: rung.model,
          ...(info.reserve || info.role === "fallback" ? { reserve: true } : {}),
          ...(rung.reasoning ? { reasoning: rung.reasoning } : {}),
        },
        base,
        host: hostOrder,
        gateway: host.gateway,
        relay: host.relay,
      });
    }
  }
  return out;
}

function dedupeSorted(judged: readonly Judged[]): Choice[] {
  const seen = new Set<string>();
  const out: Choice[] = [];
  for (const { choice } of [...judged].sort(compareJudged)) {
    const key = choiceKey(choice);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(choice);
  }
  return out;
}

function rankEligible(slot: Slot, ctx: Context): Choice[] {
  const eligible = candidates(slot, ctx).filter(({ choice }) => !isExcluded(choice, ctx.excludes));
  const hosts = new Set(eligible.map(({ choice }) => choice.provider));
  const scoped: Context = { ...ctx, providers: new Map([...ctx.providers].filter(([id]) => hosts.has(id))) };
  return dedupeSorted(eligible.map((candidate) => judge(candidate, slot, scoped)));
}

export function rankFor(slot: Slot, ctx: Context): Choice[] {
  const out = rankEligible(slot, ctx);
  if (out.length > 0) return out;
  // Everything in the chain was excluded (typically by exclude_models): fall back
  // to lighter mid-tier models per family, still honoring the exclusions.
  const rescueSlot: Slot = { ...slot, chain: LAST_RESORT[slot.load] };
  return rankEligible(rescueSlot, ctx).map((choice) => ({ ...choice, why: "rescue" }));
}

/**
 * Number of candidate models a slot's curated chain would offer with these
 * providers if nothing were excluded. Used to warn the user when their
 * exclude_models rules emptied a slot's choices.
 */
export function blockedCount(slot: Slot, ctx: Context): number {
  return dedupeSorted(candidates(slot, ctx).map((candidate) => judge(candidate, slot, ctx))).filter((choice) =>
    isExcluded(choice, ctx.excludes),
  ).length;
}

function plainContext(connected: ReadonlySet<string>, excludes: readonly string[]): Context {
  return { providers: new Map([...connected].map((id) => [id, {}])), excludes };
}

export function optionsFor(slot: Slot, connected: ReadonlySet<string>, excludes: readonly string[]): Choice[] {
  return rankFor(slot, plainContext(connected, excludes)).map(({ why: _why, canonical: _canonical, ...choice }) => choice);
}

export function recommendFor(ctx: Context): SlotPick[] {
  return ALL_SLOTS.map((slot) => ({ slot, options: rankFor(slot, ctx), recommended: 0 }));
}

export function recommend(connected: ReadonlySet<string>, excludes: readonly string[] = []): SlotPick[] {
  return ALL_SLOTS.map((slot) => ({ slot, options: optionsFor(slot, connected, excludes), recommended: 0 }));
}

export function defaultLane(picks: readonly SlotPick[]): string | null {
  for (const id of DEFAULT_LANE_ORDER) {
    if ((picks.find((p) => p.slot.id === id)?.options.length ?? 0) > 0) return id;
  }
  return null;
}

const TURBO_CLAUDE: Rung = { model: "claude-opus-5-5", providers: ["anthropic-subscription"], reasoning: "max" };
const TURBO_GPT: Rung = { model: "gpt-6-astra", providers: ["chatgpt-subscription"], reasoning: "xhigh" };
const TURBO_SOL: Rung = { model: "gpt-6.1-sol", providers: ["chatgpt-subscription"], reasoning: "high" };

export function turboPlan(
  connected: ReadonlySet<string>,
  excludes: readonly string[] = [],
  policy: Pick<Context, "usage" | "allowExpensive"> = {},
): TurboPlan | null {
  for (const [rung, reason] of [
    [TURBO_CLAUDE, "claude"],
    [TURBO_GPT, "chatgpt"],
    [TURBO_SOL, "chatgpt"],
  ] as const) {
    if (!modelAllowed(rung.model, policy)) continue;
    const provider = rung.providers.find((id) => connected.has(id));
    if (!provider) continue;
    const main: Choice = { provider, model: rung.model, ...(rung.reasoning ? { reasoning: rung.reasoning } : {}) };
    if (!isExcluded(main, excludes)) return { main, reason };
  }
  return null;
}

export function laneIds(): readonly string[] {
  return LANES.map((lane) => lane.id);
}

export function chainFrom(options: readonly Choice[], selected: number, size = 3): Choice[] {
  const first = options[selected];
  if (!first) return [];
  const out = [first];
  const active = options.filter(option => !option.reserve);
  for (const option of active) {
    if (out.length >= size) break;
    if (out.some(c => c.provider === option.provider)) continue;
    out.push(option);
  }
  for (const option of active) {
    if (out.length >= size) break;
    if (out.some((c) => choiceKey(c) === choiceKey(option))) continue;
    out.push(option);
  }
  for (const option of options.filter(option => option.reserve)) {
    if (out.some(c => choiceKey(c) === choiceKey(option))) continue;
    out.push(option);
  }
  return out;
}

export { prettyModel, reasoningWord } from "./recommend-display.ts";
