import type { Localized } from "./i18n.ts";

/**
 * Copied by hand from the OmO agent-model-matching guide (dev, 2026-10-31):
 * docs/guide/agent-model-matching.md, sections "Four lanes", "Curated agents" and "Categories".
 * Each rung lists the providers that serve the model, in OmO's own priority order.
 * Re-check on engine upgrades.
 */

export type Reasoning = "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

export type Rung = { readonly model: string; readonly reasoning?: Reasoning; readonly providers: readonly string[] };

export type SlotKind = "lane" | "agent" | "category";

export type Load = "volume" | "normal" | "heavy";

export type Slot = {
  readonly id: string;
  readonly kind: SlotKind;
  readonly title: Localized;
  readonly omoName: string;
  readonly about: Localized;
  readonly detail: Localized;
  readonly load: Load;
  readonly chain: readonly Rung[];
};

const CLAUDE = ["anthropic-subscription", "anthropic", "github-copilot", "opencode"];
const GPT = ["chatgpt-subscription", "openai", "github-copilot", "opencode"];
const GPT_DIRECT = ["chatgpt-subscription", "openai"];
const KIMI = ["kimi-coding", "moonshotai", "opencode-go"];
const GLM = ["zai", "zai-coding-cn", "opencode-go"];
const GEMINI = ["google", "opencode"];
const QWEN = ["qwen-token-plan-individual", "qwen-token-plan-cn"];

const r = (model: string, providers: readonly string[], reasoning?: Reasoning): Rung =>
  reasoning ? { model, providers, reasoning } : { model, providers };

export const LANES: readonly Slot[] = [
  {
    id: "daily-normal",
    kind: "lane",
    omoName: "Daily · Normal",
    title: { ko: "평소 모드", en: "Everyday mode" },
    about: { ko: "대부분의 일을 이 모드로 합니다. 빠르고 무난하게 끝냅니다.", en: "Most work runs here. Fast and steady." },
    detail: {
      ko: "메인 AI는 나와 대화하며 계획을 세우고, 도우미 AI와 작업 종류 칸에 일을 나눠 맡기는 AI입니다. 이 모드는 OmO가 기본으로 추천하는 모드입니다.",
      en: "The main AI talks with you, plans, and hands work to the helpers and task kinds. This is the mode OmO recommends by default.",
    },
    load: "normal",
    chain: [
      r("claude-opus-5-5", CLAUDE, "medium"),
      r("kimi-k3.1-pro", KIMI, "max"),
      r("glm-5.3", GLM, "max"),
      r("gpt-6.1-sol", GPT_DIRECT, "medium"),
    ],
  },
  {
    id: "daily-heavy",
    kind: "lane",
    omoName: "Daily · Heavy",
    title: { ko: "꼼꼼 모드", en: "Careful mode" },
    about: { ko: "같은 일을 더 오래 생각하고 여러 방향에서 검토합니다.", en: "Thinks longer and checks the work from more sides." },
    detail: {
      ko: "중요한 작업이나 실수하면 안 되는 일에 씁니다. 평소 모드보다 느리고 토큰을 더 씁니다.",
      en: "For important work where mistakes are costly. Slower and uses more tokens than everyday mode.",
    },
    load: "heavy",
    chain: [
      r("claude-fable-5-1", CLAUDE, "xhigh"),
      r("claude-opus-5-5", CLAUDE, "high"),
      r("gpt-6-astra", GPT, "high"),
      r("gpt-6.1-sol", GPT_DIRECT, "high"),
    ],
  },
  {
    id: "geeky-normal",
    kind: "lane",
    omoName: "Obsessive · Normal",
    title: { ko: "몰입 모드", en: "Focus mode" },
    about: { ko: "어려운 문제 하나에 오래 집중합니다.", en: "Stays on one hard problem for a long time." },
    detail: {
      ko: "목표를 받아 구현과 검증을 끝까지 이어갑니다. 연결된 GPT·Claude·GLM 등에서 역할 적합도와 사용 한도를 비교해 추천합니다.",
      en: "Works from a goal through implementation and verification. Compares connected GPT, Claude, GLM and other models by task fit and usage limits.",
    },
    load: "normal",
    chain: [
      r("gpt-6-astra", GPT, "medium"),
      r("gpt-6.1-sol", GPT_DIRECT, "medium"),
      r("gpt-6.1-sol-fast", GPT_DIRECT, "medium"),
      r("gpt-5.6-sol", GPT, "medium"),
    ],
  },
  {
    id: "geeky-heavy",
    kind: "lane",
    omoName: "Obsessive · Heavy",
    title: { ko: "초몰입 모드", en: "Deep focus mode" },
    about: { ko: "가장 어려운 문제를 모든 방향에서 검증합니다.", en: "Checks the hardest problems from every side." },
    detail: {
      ko: "토큰을 가장 많이 쓰는 모드입니다. 정말 어려운 문제에만 쓰세요.",
      en: "The mode that spends the most tokens. Keep it for truly hard problems.",
    },
    load: "heavy",
    chain: [r("gpt-6-astra", GPT, "high"), r("gpt-6.1-sol", GPT, "high")],
  },
];

const FAST: readonly Rung[] = [
  r("kimi-for-coding-highspeed", ["kimi-coding"], "off"),
  r("gpt-6-luna-fast", GPT_DIRECT, "low"),
  r("claude-haiku-5-5", ["anthropic-subscription", "anthropic", "github-copilot"], "medium"),
  r("deepseek-flash", ["deepseek"], "max"),
  r("qwen3.7-plus", ["opencode-go", ...QWEN]),
  r("minimax-m2.7", ["opencode-go"]),
];

const FAST_DETAIL: Localized = {
  ko: "한 작업에도 수십 번 불릴 만큼 자주 돕니다. 빠르고 싼 모델을 쓰면 구독 한도를 아낄 수 있습니다.",
  en: "Runs dozens of times per task. A fast, cheap model saves your plan limits.",
};

export const AGENTS: readonly Slot[] = [
  {
    id: "explore",
    kind: "agent",
    omoName: "explore",
    title: { ko: "코드 찾기 도우미", en: "Code search helper" },
    about: { ko: "프로젝트 안에서 파일과 코드 위치를 빠르게 찾아 메인 AI에게 알려 줍니다.", en: "Finds files and code in your project and reports back." },
    detail: FAST_DETAIL,
    load: "volume",
    chain: FAST,
  },
  {
    id: "librarian",
    kind: "agent",
    omoName: "librarian",
    title: { ko: "문서 찾기 도우미", en: "Docs search helper" },
    about: { ko: "라이브러리 공식 문서와 오픈소스 코드를 찾아 읽어 옵니다.", en: "Looks up library docs and open-source code." },
    detail: FAST_DETAIL,
    load: "volume",
    chain: FAST,
  },
  {
    id: "plan-consultant",
    kind: "agent",
    omoName: "plan-consultant",
    title: { ko: "계획 빈틈 찾기", en: "Plan gap finder" },
    about: { ko: "/ulw-plan으로 계획을 세울 때 빠진 요구사항과 숨은 위험을 찾아 줍니다.", en: "Finds missing needs and hidden risks in a /ulw-plan plan." },
    detail: {
      ko: "계획마다 한 번만 돌아서, 비싼 모델을 써도 부담이 적은 자리입니다.",
      en: "Runs once per plan, so a pricey model costs little here.",
    },
    load: "heavy",
    chain: [
      r("claude-fable-5-1", CLAUDE, "max"),
      r("claude-opus-5-5", CLAUDE, "max"),
      r("kimi-k3.1-pro", ["opencode-go", "kimi-coding", "moonshotai"], "max"),
      r("kimi-k3", ["opencode"], "max"),
    ],
  },
  {
    id: "plan-reviewer",
    kind: "agent",
    omoName: "plan-reviewer",
    title: { ko: "계획 심사", en: "Plan reviewer" },
    about: { ko: "완성된 계획이 명확하고 검증할 수 있는지 엄격하게 심사합니다.", en: "Strictly checks that a finished plan is clear and testable." },
    detail: {
      ko: "심사에서 떨어지면 계획을 고쳐 다시 돕니다. 꼼꼼한 모델이 좋습니다.",
      en: "A rejected plan is fixed and reviewed again. A thorough model fits.",
    },
    load: "heavy",
    chain: [
      r("gpt-6-astra", GPT_DIRECT, "xhigh"),
      r("gpt-6-astra", ["github-copilot", "opencode"], "high"),
      r("gpt-6.1-sol", GPT, "high"),
      r("claude-opus-5-5", CLAUDE, "max"),
      r("glm-5.2", ["opencode-go"]),
    ],
  },
];

const CLAUDE_MAX = [r("claude-fable-5-1", CLAUDE, "max"), r("claude-opus-5-5", CLAUDE, "max"), r("kimi-k3.1-pro", KIMI, "max")];

export const CATEGORIES: readonly Slot[] = [
  {
    id: "architect",
    kind: "category",
    omoName: "architect",
    title: { ko: "설계 상담", en: "Design advice" },
    about: { ko: "전체 구조를 살펴보고 설계안을 제안합니다. 코드는 직접 고치지 않습니다.", en: "Surveys the whole system and proposes designs. Does not edit code." },
    detail: { ko: "가끔만 불리지만 판단이 중요한 자리입니다.", en: "Called rarely, but the judgment matters." },
    load: "heavy",
    chain: [r("claude-fable-5-1", CLAUDE, "max")],
  },
  {
    id: "visual-engineering",
    kind: "category",
    omoName: "visual-engineering",
    title: { ko: "화면·디자인 작업", en: "UI and design work" },
    about: { ko: "웹 화면, UI/UX, CSS, 애니메이션을 만듭니다.", en: "Builds web screens, UI/UX, CSS and animation." },
    detail: { ko: "화면을 보는 눈이 좋은 모델이 맞습니다.", en: "Models with a good eye for layout fit here." },
    load: "normal",
    chain: [r("gemini-4-argon", GEMINI, "low"), ...CLAUDE_MAX],
  },
  {
    id: "ultrabrain",
    kind: "category",
    omoName: "ultrabrain",
    title: { ko: "아주 어려운 논리 문제", en: "Hardest logic" },
    about: { ko: "알고리즘처럼 논리가 매우 어려운 문제를 목표만 받아 끝까지 풉니다.", en: "Solves very hard logic problems from a goal alone." },
    detail: { ko: "가장 깊게 생각하는 설정이라 토큰을 많이 씁니다.", en: "The deepest thinking setting, so it spends many tokens." },
    load: "heavy",
    chain: [r("gpt-6-astra", GPT, "max"), r("gpt-6.1-sol", GPT, "high"), r("gpt-5.6-sol", GPT, "max")],
  },
  {
    id: "deep-low",
    kind: "category",
    omoName: "deep-low",
    title: { ko: "깊은 작업 (기본)", en: "Deep work" },
    about: { ko: "백엔드, 알고리즘, 브라우저·컴퓨터 조작처럼 오래 걸리는 작업을 맡습니다.", en: "Takes long jobs: backend, algorithms, browser and computer use." },
    detail: { ko: "실제 구현을 가장 많이 하는 자리 중 하나입니다.", en: "One of the places that writes the most code." },
    load: "normal",
    chain: [
      r("gpt-6.1-sol", GPT_DIRECT, "medium"),
      r("gpt-6.1-sol-fast", GPT_DIRECT, "medium"),
      r("gpt-5.6-sol", GPT, "medium"),
      r("gpt-5.6-sol-fast", GPT_DIRECT, "medium"),
    ],
  },
  {
    id: "deep-high",
    kind: "category",
    omoName: "deep-high",
    title: { ko: "판단이 어려운 깊은 작업", en: "Deep work, hard calls" },
    about: { ko: "자료만으로는 정답을 정할 수 없는 핵심 결정이 걸린 작업을 맡습니다.", en: "Work whose central decision the evidence cannot settle." },
    detail: { ko: "깊은 작업 (기본)에서 막힐 때 올라오는 자리입니다.", en: "Where deep work escalates when it gets stuck." },
    load: "heavy",
    chain: [r("gpt-6-astra", GPT, "high"), r("gpt-6.1-sol", GPT, "high")],
  },
  {
    id: "artistry",
    kind: "category",
    omoName: "artistry",
    title: { ko: "창의적인 해결", en: "Creative solving" },
    about: { ko: "정해진 틀을 벗어난 새로운 방법이 필요한 문제를 맡습니다.", en: "Problems that need an unusual approach." },
    detail: { ko: "자주 불리지는 않습니다.", en: "Not called often." },
    load: "normal",
    chain: CLAUDE_MAX,
  },
  {
    id: "quick",
    kind: "category",
    omoName: "quick",
    title: { ko: "간단한 수정", en: "Small fixes" },
    about: { ko: "파일 하나 고치기, 오타 수정 같은 작은 일을 맡습니다.", en: "One-file edits, typos and other small jobs." },
    detail: FAST_DETAIL,
    load: "volume",
    chain: [
      r("gpt-6-luna-fast", GPT_DIRECT, "low"),
      r("claude-haiku-5-5", ["anthropic-subscription", "anthropic", "github-copilot"], "medium"),
      r("deepseek-flash", ["deepseek"], "off"),
      r("qwen3.6-flash", QWEN, "low"),
      r("glm-5.3-flash", ["zai", "zai-coding-cn"], "low"),
    ],
  },
  {
    id: "unspecified-low",
    kind: "category",
    omoName: "unspecified-low",
    title: { ko: "기타 가벼운 일", en: "Other light work" },
    about: { ko: "다른 칸에 맞지 않는 가벼운 일을 맡습니다.", en: "Light work that fits nowhere else." },
    detail: FAST_DETAIL,
    load: "volume",
    chain: [
      r("claude-sonnet-5-5", CLAUDE, "medium"),
      r("grok-4.7", ["xai", "github-copilot", "opencode-go"], "xhigh"),
      r("glm-5.3", GLM, "high"),
      r("gpt-6.1-sol", GPT_DIRECT, "medium"),
      r("gpt-5.6-sol", GPT, "medium"),
      r("deepseek-v4-pro", ["deepseek", "opencode-go", ...QWEN], "max"),
    ],
  },
  {
    id: "unspecified-high",
    kind: "category",
    omoName: "unspecified-high",
    title: { ko: "기타 무거운 일", en: "Other heavy work" },
    about: { ko: "다른 칸에 맞지 않는 무거운 일을 맡습니다. 코드 리뷰어도 이 칸을 씁니다.", en: "Heavy work that fits nowhere else. Code reviewers run here too." },
    detail: { ko: "검토와 큰 수정이 이 칸으로 옵니다.", en: "Reviews and large edits land here." },
    load: "normal",
    chain: [r("claude-opus-5-5", CLAUDE, "medium"), r("glm-5.3", GLM, "max"), r("kimi-k3.1-pro", KIMI, "max")],
  },
  {
    id: "writing",
    kind: "category",
    omoName: "writing",
    title: { ko: "글쓰기", en: "Writing" },
    about: { ko: "문서, 설명, 기술 글을 씁니다.", en: "Docs, explanations and technical writing." },
    detail: { ko: "문장을 잘 쓰는 모델이 맞습니다.", en: "Models that write well fit here." },
    load: "normal",
    chain: [r("gemini-4-argon", GEMINI, "low"), r("claude-opus-5-5", CLAUDE, "low"), r("claude-opus-4-6", CLAUDE, "max")],
  },
];

/**
 * Additional model/provider rungs, not family-level fallbacks: an expensive or
 * slow model must not hide an affordable sibling. Role suitability is compared
 * before curated order; these rungs also fill single-provider configurations.
 */
export const MODEL_TAIL: Record<Load, readonly Rung[]> = {
  volume: [
    r("claude-haiku-5-5", CLAUDE, "medium"),
    r("gpt-6-luna-fast", GPT, "low"),
    r("kimi-for-coding-highspeed", ["kimi-coding", "moonshotai"], "off"),
    r("glm-5.3-flash", GLM, "low"),
    r("gemini-4-argon", GEMINI, "low"),
    r("grok-4.7", ["xai", "github-copilot"], "low"),
    r("qwen3.6-flash", QWEN, "low"),
    r("deepseek-flash", ["deepseek"], "low"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "medium"),
  ],
  normal: [
    r("claude-opus-5-5", CLAUDE, "medium"),
    r("claude-sonnet-5-5", CLAUDE, "medium"),
    r("gpt-6.1-sol", GPT, "medium"),
    r("kimi-k3.1-pro", KIMI, "high"),
    r("kimi-k3", KIMI, "medium"),
    r("glm-5.3", GLM, "high"),
    r("glm-5.3-flash", GLM, "low"),
    r("gemini-4-argon", GEMINI, "medium"),
    r("grok-4.7", ["xai", "github-copilot"], "medium"),
    r("deepseek-v4-pro", ["deepseek"], "high"),
    r("qwen3.7-plus", QWEN, "medium"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "medium"),
  ],
  heavy: [
    r("claude-opus-5-5", CLAUDE, "high"),
    r("claude-sonnet-5-5", CLAUDE, "medium"),
    r("gpt-6-astra", GPT, "high"),
    r("gpt-6.1-sol", GPT, "high"),
    r("kimi-k3.1-pro", KIMI, "high"),
    r("glm-5.3", GLM, "high"),
    r("grok-4.7", ["xai", "github-copilot"], "high"),
    r("gemini-4-argon", GEMINI, "medium"),
    r("deepseek-v4-pro", ["deepseek"], "high"),
    r("qwen3.7-plus", QWEN, "high"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "medium"),
  ],
};

/**
 * Last-resort rungs used only when a slot's chain plus MODEL_TAIL is entirely
 * excluded by exclude_models (or otherwise yields nothing): mid-tier models of
 * each family at lighter reasoning, so helpers still run instead of going empty.
 * Exclusions are still honored for these rungs - if a family is fully excluded,
 * it simply stays out.
 */
export const LAST_RESORT: Record<Load, readonly Rung[]> = {
  volume: [
    r("gpt-6.1-sol", GPT, "low"),
    r("claude-sonnet-5-5", CLAUDE, "low"),
    r("kimi-k3", KIMI, "low"),
    r("glm-5.3-flash", GLM, "low"),
    r("gemini-4-argon", GEMINI, "low"),
    r("grok-4.7", ["xai", "github-copilot"], "low"),
    r("qwen3.6-flash", QWEN, "low"),
    r("deepseek-flash", ["deepseek"], "low"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "low"),
  ],
  normal: [
    r("gpt-6.1-sol", GPT, "medium"),
    r("claude-sonnet-5-5", CLAUDE, "medium"),
    r("kimi-k3", KIMI, "medium"),
    r("glm-5.3-flash", GLM, "low"),
    r("gemini-4-argon", GEMINI, "medium"),
    r("grok-4.7", ["xai", "github-copilot"], "medium"),
    r("deepseek-v4-pro", ["deepseek"], "medium"),
    r("qwen3.7-plus", QWEN, "medium"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "medium"),
  ],
  heavy: [
    r("gpt-6.1-sol", GPT, "high"),
    r("claude-opus-5-5", CLAUDE, "high"),
    r("kimi-k3", KIMI, "medium"),
    r("glm-5.3", GLM, "high"),
    r("grok-4.7", ["xai", "github-copilot"], "medium"),
    r("gemini-4-argon", GEMINI, "medium"),
    r("deepseek-v4-pro", ["deepseek"], "medium"),
    r("qwen3.7-plus", QWEN, "medium"),
    r("minimax-m2.7", ["minimax", "minimax-cn"], "medium"),
  ],
};

export const ALL_SLOTS: readonly Slot[] = [...LANES, ...AGENTS, ...CATEGORIES];

export const DEFAULT_LANE_ORDER = ["daily-normal", "daily-heavy", "geeky-normal", "geeky-heavy"] as const;
