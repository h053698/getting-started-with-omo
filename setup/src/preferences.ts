import type { Lang, Localized } from "./i18n.ts";
import type { WizardState } from "./wizard.ts";

export type ReasoningPolicy = "save" | "auto" | "deep";
export type RecommendationPreferences = {
  readonly freeFirst: boolean;
  readonly reasoningPolicy: ReasoningPolicy;
};
export type SetupPreferences = RecommendationPreferences & { readonly allowExpensive: boolean };
export type UsageStep = 0 | 1 | 2;

type Option = { readonly label: Localized; readonly hint: Localized };
type Question = {
  readonly title: Localized;
  readonly options: readonly [Option, ...Option[]];
};
export const QUESTIONS: readonly Question[] = [
  {
    title: { ko: "가벼운 일은 무료 모델을 먼저 쓸까요?", en: "Free models first for light tasks?" },
    options: [
      { label: { ko: "아니요, 연결한 구독과 API를 활용", en: "Use my subscriptions and APIs" },
        hint: { ko: "추가한 계정의 플랜과 우선순위에 맞춰 추천합니다.", en: "Recommendations follow your connected plans and priorities." } },
      { label: { ko: "예, 가벼운 일은 무료 우선", en: "Yes, free first for light work" },
        hint: { ko: "검색·간단한 수정에 적용합니다. 유료 사용을 막지는 않습니다.", en: "Applies to search and quick edits. Paid models are still available." } },
    ],
  },
  {
    title: { ko: "얼마나 깊게 생각하게 할까요?", en: "How deeply should models think?" },
    options: [
      { label: { ko: "사용량을 아껴서", en: "Conserve usage" },
        hint: { ko: "일상 작업은 절약하고, 어려운 판단에는 충분히 생각합니다.", en: "Save on everyday work while keeping serious tasks thoughtful." } },
      { label: { ko: "플랜과 작업에 맞게 (추천)", en: "Match my plan and task (recommended)" },
        hint: { ko: "실제 플랜 등급과 작업 난도에 맞춥니다. 모르는 한도는 추측하지 않습니다.", en: "Uses known plan tiers and task difficulty, without guessing unknown quotas." } },
      { label: { ko: "더 깊게", en: "Think more deeply" },
        hint: { ko: "모델이 지원하는 범위에서 더 생각합니다. 사용량이 빨리 소진될 수 있습니다.", en: "Uses deeper supported reasoning. Your allowance may run out sooner." } },
    ],
  },
  {
    title: { ko: "고가 특수 모델도 추천에 넣을까요?", en: "Include premium models?" },
    options: [
      { label: { ko: "아니요, 일반 모델로 구성 (추천)", en: "No, use regular models (recommended)" },
        hint: { ko: "Fable·Astra는 제외합니다. 깊게 생각하기를 골라도 자동으로 켜지지 않습니다.", en: "Excludes Fable and Astra, even when deeper reasoning is selected." } },
      { label: { ko: "예, 필요한 전문 작업에 허용", en: "Yes, allow them for specialist work" },
        hint: { ko: "설계·어려운 판단의 후보에 추가합니다. 일상 모델이나 Turbo가 자동으로 바뀌지는 않습니다.", en: "Adds specialist candidates. Does not automatically replace routine models or enable Turbo." } },
    ],
  },
];

export function questionCursor(state: Pick<WizardState, "usageStep" | "freeFirst" | "reasoningPolicy" | "allowExpensive">): number {
  switch (state.usageStep) {
    case 0: return state.freeFirst ? 1 : 0;
    case 1: return ["save", "auto", "deep"].indexOf(state.reasoningPolicy);
    case 2: return state.allowExpensive ? 1 : 0;
  }
}

export function answerQuestion(state: WizardState, index: number): WizardState {
  if (!QUESTIONS[state.usageStep]?.options[index]) return state;
  const answered: WizardState = state.usageStep === 0 ? { ...state, freeFirst: index === 1 }
    : state.usageStep === 1 ? { ...state, reasoningPolicy: index === 0 ? "save" : index === 1 ? "auto" : "deep" }
    : { ...state, allowExpensive: index === 1 };
  if (state.usageStep === 2) return { ...answered, stage: "accounts", usageCursor: index };
  const next: WizardState = { ...answered, usageStep: state.usageStep === 0 ? 1 : 2 };
  return { ...next, usageCursor: questionCursor(next) };
}

export function preferenceSummary(preferences: RecommendationPreferences, lang: Lang): string {
  const thinking = { save: { ko: "사용량 절약", en: "conserve usage" }, auto: { ko: "플랜에 맞게", en: "match plan" }, deep: { ko: "더 깊게 생각", en: "deeper reasoning" } };
  return `${preferences.freeFirst ? (lang === "ko" ? "가벼운 일 무료 우선" : "free first for light work") : (lang === "ko" ? "연결 계정 활용" : "connected accounts")} · ${thinking[preferences.reasoningPolicy][lang]}`;
}
