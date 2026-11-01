import { type Localized, same } from "./i18n.ts";

/**
 * Copied by hand from omo-ai 5.1.48 (engine senpi 2026.10.25-2) on 2026-10-31; plan tiers come from the user.
 * `id` is the provider ID shown in the wizard and, unless `engineId` is set, the engine provider ID used
 * for login. Regional variants are separate providers so a region and a tier can be picked together.
 * `tier` (0 cheapest to 4 priciest) drives the plan effect and the model recommendations.
 * Re-check on engine upgrades.
 */

export type Kind = "oauth" | "api_key" | "custom";

export const KINDS: readonly Kind[] = ["oauth", "api_key", "custom"];

export type Tier = 0 | 1 | 2 | 3 | 4;

export type PlanGroup = "personal" | "team";

export type Plan = {
  readonly id: string;
  readonly label: Localized;
  readonly hint?: Localized;
  readonly tier?: Tier;
  readonly group?: PlanGroup;
  readonly price?: number;
  readonly seat?: boolean;
};

const usd = (plan: Plan, price: number, seat = false): Plan => ({ ...plan, price, ...(seat ? { seat: true } : {}) });

export type Role = "main" | "fallback" | "efficient";

export const ROLES: readonly { readonly id: Role; readonly label: Localized; readonly hint: Localized }[] = [
  {
    id: "main",
    label: { ko: "주력", en: "Main" },
    hint: { ko: "추천에서 이 계정을 먼저 씁니다", en: "Recommendations use this account first" },
  },
  {
    id: "fallback",
    label: { ko: "예비", en: "Fallback" },
    hint: { ko: "다른 계정이 막히거나 한도에 걸릴 때만 씁니다", en: "Used only when the others fail or hit a limit" },
  },
  {
    id: "efficient",
    label: { ko: "아껴 쓰기", en: "Efficient" },
    hint: {
      ko: "자주 도는 가벼운 일(검색, 간단한 수정)에 먼저 쓰고 무거운 일은 피합니다",
      en: "Takes the frequent light work (search, small edits) and stays off heavy work",
    },
  },
];

export type Field = "plan" | "role" | "budget" | "baseUrl" | "apiKey" | "api" | "relays" | "models";

export type CustomApi = "openai-completions" | "anthropic-messages" | "openai-responses";

export const CUSTOM_APIS: readonly { readonly id: CustomApi; readonly label: Localized }[] = [
  { id: "openai-completions", label: { ko: "OpenAI 호환 (chat/completions)", en: "OpenAI-compatible (chat/completions)" } },
  { id: "anthropic-messages", label: { ko: "Anthropic Messages", en: "Anthropic Messages" } },
  { id: "openai-responses", label: { ko: "OpenAI Responses", en: "OpenAI Responses" } },
];

export type Relay = "claude" | "kiro" | "chatgpt" | "grok" | "glm" | "kimi" | "gemini" | "deepseek";

export const RELAYS: readonly { readonly id: Relay; readonly label: string }[] = [
  { id: "claude", label: "Claude" },
  { id: "kiro", label: "Kiro" },
  { id: "chatgpt", label: "ChatGPT" },
  { id: "grok", label: "Grok" },
  { id: "glm", label: "GLM" },
  { id: "kimi", label: "Kimi" },
  { id: "gemini", label: "Gemini" },
  { id: "deepseek", label: "DeepSeek" },
];

export type Provider = {
  readonly id: string;
  readonly name: string;
  readonly kind: Kind;
  readonly detail: Localized;
  readonly plans: readonly Plan[];
  readonly namedAccounts?: boolean;
  readonly detectsPlan?: boolean;
  readonly engineId?: string;
  readonly region?: "global" | "cn";
  readonly budget?: boolean;
  readonly gateway?: boolean;
  readonly freeModels?: boolean;
  readonly defaultRole?: Role;
};

export const AUTO_PLAN = "auto";

const AUTO: Plan = {
  id: AUTO_PLAN,
  label: { ko: "자동 감지", en: "Auto-detect" },
  hint: { ko: "로그인하면 실제 구독 플랜을 읽어 옵니다", en: "Reads the real plan after login" },
};

const p = (id: string, label: string, tier: Tier, group: PlanGroup = "personal", hint?: Localized): Plan => ({
  id,
  label: same(label),
  tier,
  group,
  ...(hint ? { hint } : {}),
});

const ZAI_PLANS: readonly Plan[] = [
  p("lite", "Lite", 0),
  p("pro", "Pro", 1),
  p("max", "Max", 3),
  p("team-standard", "Team Standard", 2, "team"),
  p("team-premium", "Team Premium", 3, "team"),
];

const MINIMAX_PLANS: readonly Plan[] = [p("go", "Go", 0), p("explore", "Explore", 1), p("build", "Build", 2)];

export const PROVIDERS: readonly Provider[] = [
  {
    id: "anthropic-subscription",
    name: "Claude (Anthropic)",
    kind: "oauth",
    detail: { ko: "Claude 구독 로그인", en: "Claude subscription login" },
    namedAccounts: true,
    detectsPlan: true,
    plans: [
      AUTO,
      usd(p("pro", "Pro", 1), 20),
      usd(p("max", "Max", 3), 100),
      usd(p("ultra", "Ultra", 4), 200),
      usd(p("team-standard", "Team Standard", 2, "team"), 25, true),
      usd(p("team-premium", "Team Premium", 3, "team"), 125, true),
    ],
  },
  {
    id: "chatgpt-subscription",
    name: "ChatGPT (OpenAI)",
    kind: "oauth",
    detail: { ko: "ChatGPT 구독 로그인", en: "ChatGPT subscription login" },
    detectsPlan: true,
    plans: [
      AUTO,
      usd(p("plus", "Plus", 1), 20),
      usd(p("pro-100", "Pro 100", 2), 100),
      usd(p("pro-200", "Pro 200", 3), 200),
      usd(p("pro-500", "Pro 500", 4), 500),
      usd(p("business-standard", "Business Standard", 2, "team"), 25, true),
      usd(p("business-premium", "Business Premium", 3, "team"), 125, true),
    ],
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    kind: "oauth",
    detail: { ko: "GitHub 기기 코드 로그인", en: "GitHub device-code login" },
    detectsPlan: true,
    plans: [
      AUTO,
      usd(p("pro", "Pro", 1), 10),
      usd(p("pro-plus", "Pro+", 2), 39),
      usd(p("max", "Max", 3), 100),
      usd(p("edu", "Edu", 1, "personal", { ko: "GitHub Education 인증 학생·교사는 무료", en: "Free for verified GitHub Education students and teachers" }), 0),
      usd(p("business", "Business", 2, "team"), 19, true),
      usd(p("enterprise", "Enterprise", 3, "team", {
        ko: "로그인할 때 회사 GitHub 도메인을 묻습니다. github.com이면 비워 두세요",
        en: "Asks for your company GitHub domain at login. Leave it empty for github.com",
      }), 39, true),
    ],
  },
  {
    id: "cursor",
    name: "Cursor",
    kind: "oauth",
    detail: { ko: "Cursor 구독 로그인", en: "Cursor subscription login" },
    plans: [
      usd(p("plus", "Plus", 0), 8),
      usd(p("premium", "Premium", 2), 30),
      p("pro", "Pro (legacy)", 1),
      p("pro-plus", "Pro+ (legacy)", 2),
      p("ultra", "Ultra (legacy)", 4),
      p("teams", "Teams (legacy)", 2, "team"),
    ],
  },
  {
    id: "kimi-coding",
    name: "Kimi for Coding",
    kind: "oauth",
    region: "global",
    detail: { ko: "Kimi Code 구독 · 중국 본토 밖 (kimi.ai)", en: "Kimi Code subscription · outside mainland China (kimi.ai)" },
    plans: [
      usd(p("plus", "Plus", 0), 19),
      usd(p("pro", "Pro", 1), 39),
      usd(p("max", "Max", 3), 99),
      usd(p("ultra", "Ultra", 4), 199),
      p("business-premium", "Business Premium", 3, "team"),
    ],
  },
  {
    id: "kimi-coding-cn",
    name: "Kimi for Coding (China)",
    kind: "oauth",
    engineId: "kimi-coding",
    region: "cn",
    detail: { ko: "Kimi Code 구독 · 중국 본토 (kimi.com)", en: "Kimi Code subscription · mainland China (kimi.com)" },
    plans: [],
  },
  {
    id: "xai",
    name: "xAI (Grok)",
    kind: "oauth",
    detail: { ko: "Grok/X 구독 로그인", en: "Grok/X subscription login" },
    plans: [
      usd(p("plus", "Plus", 0), 8),
      usd(p("premium", "Premium", 1), 30),
      usd(p("super", "Super", 3), 100),
      usd(p("ultra", "Ultra", 4), 200),
      p("team-premium", "Team Premium", 2, "team"),
      p("team-super", "Team Super", 3, "team"),
      p("team-ultra", "Team Ultra", 4, "team"),
    ],
  },
  {
    id: "anthropic",
    name: "Anthropic API",
    kind: "api_key",
    budget: true,
    defaultRole: "fallback",
    detail: { ko: "Anthropic 콘솔 API 키 · 쓴 만큼 결제", en: "Anthropic console API key · pay as you go" },
    plans: [],
  },
  {
    id: "openai",
    name: "OpenAI API",
    kind: "api_key",
    budget: true,
    defaultRole: "fallback",
    detail: { ko: "OpenAI 플랫폼 API 키 · 쓴 만큼 결제", en: "OpenAI platform API key · pay as you go" },
    plans: [],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    kind: "api_key",
    budget: true,
    gateway: true,
    freeModels: true,
    defaultRole: "fallback",
    detail: { ko: "여러 회사 모델을 한 키로 · 쓴 만큼 결제 · 무료 모델 있음", en: "Many vendors with one key · pay as you go · has free models" },
    plans: [],
  },
  {
    id: "vercel-ai-gateway",
    name: "Vercel AI Gateway",
    kind: "api_key",
    budget: true,
    gateway: true,
    defaultRole: "fallback",
    detail: { ko: "Vercel AI Gateway API 키 · 쓴 만큼 결제", en: "Vercel AI Gateway API key · pay as you go" },
    plans: [],
  },
  {
    id: "google",
    name: "Google Gemini",
    kind: "api_key",
    detail: { ko: "Gemini API 키", en: "Gemini API key" },
    plans: [],
  },
  {
    id: "zai",
    name: "Z.ai Coding Plan",
    kind: "api_key",
    region: "global",
    detail: { ko: "Z.ai 코딩 플랜 API 키 · 글로벌", en: "Z.ai Coding Plan API key · global" },
    plans: ZAI_PLANS,
  },
  {
    id: "zai-coding-cn",
    name: "Z.ai Coding Plan (China)",
    kind: "api_key",
    region: "cn",
    detail: { ko: "Z.ai 코딩 플랜 API 키 · 중국", en: "Z.ai Coding Plan API key · China" },
    plans: ZAI_PLANS,
  },
  {
    id: "qwen-token-plan-individual",
    name: "Bailian Coding Plan (Qwen)",
    kind: "api_key",
    region: "global",
    detail: { ko: "알리바바 Bailian 코딩 플랜 API 키 · 글로벌", en: "Alibaba Bailian Coding Plan API key · global" },
    plans: [],
  },
  {
    id: "qwen-token-plan-cn",
    name: "Bailian Coding Plan (China)",
    kind: "api_key",
    region: "cn",
    detail: { ko: "알리바바 Bailian 코딩 플랜 API 키 · 중국", en: "Alibaba Bailian Coding Plan API key · China" },
    plans: [],
  },
  {
    id: "minimax",
    name: "MiniMax",
    kind: "api_key",
    region: "global",
    detail: { ko: "MiniMax API 키 · 글로벌 (minimax.io)", en: "MiniMax API key · global (minimax.io)" },
    plans: MINIMAX_PLANS,
  },
  {
    id: "minimax-cn",
    name: "MiniMax (China)",
    kind: "api_key",
    region: "cn",
    detail: { ko: "MiniMax API 키 · 중국 (minimaxi.com)", en: "MiniMax API key · China (minimaxi.com)" },
    plans: MINIMAX_PLANS,
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    kind: "api_key",
    detail: { ko: "DeepSeek API 키", en: "DeepSeek API key" },
    plans: [],
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    kind: "api_key",
    detail: { ko: "OpenCode Go 구독 API 키", en: "OpenCode Go subscription API key" },
    plans: [p("go", "Go", 0), p("plus", "Plus", 1), p("teams", "Teams", 2, "team")],
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    kind: "api_key",
    freeModels: true,
    detail: { ko: "OpenCode Zen API 키 · 무료 모델 있음", en: "OpenCode Zen API key · has free models" },
    plans: [],
  },
  {
    id: "custom",
    name: "Custom API",
    kind: "custom",
    detail: {
      ko: "릴레이, 사내 게이트웨이, 로컬 서버 같은 직접 주소를 넣는 API",
      en: "A relay, company gateway or local server you point at yourself",
    },
    plans: [],
  },
];

export function providersOf(kind: Kind): readonly Provider[] {
  return PROVIDERS.filter((provider) => provider.kind === kind);
}

export function findProvider(id: string): Provider {
  const provider = PROVIDERS.find((candidate) => candidate.id === id);
  if (!provider) throw new Error(`Unknown provider id: ${id}`);
  return provider;
}

export function loginProviderOf(provider: Provider): string {
  return provider.engineId ?? provider.id;
}

export function fieldsOf(provider: Provider): readonly Field[] {
  if (provider.kind === "custom") return ["baseUrl", "apiKey", "api", "models", "relays", "role"];
  return [...(provider.plans.length > 0 ? (["plan"] as const) : []), "role", ...(provider.budget ? (["budget"] as const) : [])];
}

export function priceText(plan: Plan, lang: "ko" | "en"): string | null {
  if (plan.price === undefined) return null;
  if (plan.price === 0) return lang === "ko" ? "무료" : "free";
  return `$${plan.price}${plan.seat ? (lang === "ko" ? "/1인" : "/seat") : ""}`;
}

export function planTier(provider: Provider, planId: string | null): Tier | null {
  return provider.plans.find((plan) => plan.id === planId)?.tier ?? null;
}
