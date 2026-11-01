import type { SlotSetting } from "./omoconfig.ts";
import { chainFrom, defaultLane, recommendFor, type Choice, type Context, type ProfileFamily } from "./recommend.ts";
import { expensiveAllowed } from "./recommend-policy.ts";

export const PROFILE_FAMILIES: readonly { readonly id: ProfileFamily; readonly label: string }[] = [
  { id: "claude", label: "Claude" }, { id: "gpt", label: "ChatGPT" },
  { id: "grok", label: "Grok" }, { id: "glm", label: "GLM" }, { id: "kimi", label: "Kimi" },
  { id: "gemini", label: "Gemini" }, { id: "deepseek", label: "DeepSeek" },
  { id: "minimax", label: "MiniMax" }, { id: "qwen", label: "Qwen" },
];

export type ProviderProfile = {
  readonly name: `omo-${ProfileFamily}`;
  readonly family: ProfileFamily;
  readonly label: string;
  readonly slots: readonly SlotSetting[];
  readonly defaultLane: string;
  readonly main: Choice;
  readonly excludes: readonly string[];
};
export type ProfileIssue = { readonly name: string; readonly slots: readonly string[] };
export type ProviderProfilePlan = { readonly profiles: readonly ProviderProfile[]; readonly issues: readonly ProfileIssue[] };

const DIRECT_PROVIDERS: ReadonlySet<string> = new Set([
  "anthropic-subscription", "anthropic", "chatgpt-subscription", "openai",
  "xai", "zai", "zai-coding-cn", "kimi-coding", "moonshotai", "google",
  "deepseek", "minimax", "minimax-cn", "qwen-token-plan-individual", "qwen-token-plan-cn",
]);

export function buildProviderProfiles(ctx: Context, lane: string | null): ProviderProfilePlan {
  const registered: Context = {
    ...ctx,
    providers: new Map([...ctx.providers].filter(([id, info]) =>
      DIRECT_PROVIDERS.has(id) || info.models !== undefined || Boolean(info.relays?.length),
    )),
  };
  const eligible = recommendFor(registered).flatMap((pick) => pick.options).filter((choice) => !choice.reserve);
  const profiles: ProviderProfile[] = [];
  const issues: ProfileIssue[] = [];
  for (const { id: family, label } of PROFILE_FAMILIES) {
    if (!eligible.some((choice) => (choice.canonical ?? choice.model).startsWith(`${family}-`))) continue;
    const picks = recommendFor({ ...registered, preferredFamily: family });
    const defaultId = lane ?? defaultLane(picks);
    const main = picks.find((pick) => pick.slot.id === defaultId)?.options[0];
    const blocked = picks.filter((pick) => !pick.options[0] || pick.options[0].reserve).map((pick) => pick.slot.id);
    if (main && !(main.canonical ?? main.model).startsWith(`${family}-`) && defaultId) blocked.push(defaultId);
    const name = `omo-${family}` as const;
    if (blocked.length > 0 || !main || !defaultId) {
      issues.push({ name, slots: [...new Set(blocked)] });
      continue;
    }
    profiles.push({
      name, family, label, defaultLane: defaultId, main,
      excludes: [...ctx.excludes, ...(expensiveAllowed(ctx) ? [] : ["*claude-fable*", "*gpt-6-astra*"])],
      slots: picks.map((pick) => ({ slotId: pick.slot.id, kind: pick.slot.kind, chain: chainFrom(pick.options, 0) })),
    });
  }
  return { profiles, issues };
}
