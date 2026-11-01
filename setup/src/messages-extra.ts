import type { Messages } from "./i18n.ts";

type Extra = {
  readonly usageTitle: string;
  readonly usageSubtitle: string;
  readonly fieldLabels: Readonly<Record<"plan" | "role" | "budget" | "baseUrl" | "apiKey" | "api" | "models" | "relays", string>>;
  readonly fieldHelp: Readonly<Record<"name" | "plan" | "role" | "budget" | "baseUrl" | "apiKey" | "api" | "models" | "relays" | "remove", string>>;
  readonly notSet: string;
  readonly perMonth: (amount: string) => string;
  readonly typeDigits: string;
  readonly typeText: string;
  readonly fetchIdle: string;
  readonly fetchLoading: string;
  readonly fetchOk: (count: number) => string;
  readonly fetchError: (error: string) => string;
  readonly allModels: (count: number) => string;
  readonly pickedModels: (count: number, total: number) => string;
  readonly autoRelays: string;
  readonly planGroups: Readonly<Record<"personal" | "team", string>>;
  readonly dropdownHint: string;
  readonly multiHint: string;
  readonly badUrl: string;
  readonly reservedName: string;
  readonly customIncomplete: string;
  readonly whyTag: Readonly<Record<"order" | "main" | "efficient" | "volume" | "free" | "capped" | "depth" | "capacity" | "profile" | "gateway" | "relay" | "rescue", string>>;
  readonly excludedNote: (n: number) => string;
  readonly acceptTitle: string;
  readonly acceptHint: string;
  readonly basedOn: string;
  readonly mainAiTitle: string;
  readonly mainAiHint: string;
  readonly helpersTitle: string;
  readonly helpersHint: string;
  readonly tasksTitle: string;
  readonly tasksHint: string;
  readonly chainLabel: string;
  readonly changeHint: string;
  readonly tunedFor: string;
  readonly usageBadge: (label: string) => string;
  readonly editHintCell: string;
  readonly accountSettings: string;
  readonly doneLabel: string;
  readonly doneHint: string;
  readonly openAccountHint: string;
  readonly saveClose: string;
  readonly saveHelp: string;
  readonly budgetCustom: string;
  readonly budgetNone: string;
  readonly usdPerMonth: string;
  readonly nextToModels: string;
  readonly expensiveTitle: string;
  readonly expensiveHint: string;
  readonly expensiveYes: string;
  readonly expensiveNo: string;
  readonly providerPriorities: string;
  readonly priorityHint: string;
  readonly priorityReserve: string;
  readonly priorityKeys: string;
  readonly priorityMoving: string;
  readonly priorityRecommend: string;
  readonly priorityEmpty: string;
  readonly priorityEarlier: string;
  readonly priorityLater: string;
};

export type ExtraMessages = Extra;

export const extraKo: Extra = {
  usageTitle: "OmO를 어떻게 쓰실 건가요?",
  usageSubtitle: "답에 따라 어떤 모델을 얼마나 깊게 쓸지 자동으로 맞춥니다. 나중에 다시 바꿀 수 있습니다.",
  fieldLabels: {
    plan: "플랜",
    role: "역할",
    budget: "월 예산",
    baseUrl: "주소",
    apiKey: "API 키",
    api: "형식",
    models: "모델",
    relays: "모델 종류",
  },
  fieldHelp: {
    name: "OmO 안에서 이 계정을 구분하는 별칭입니다. 예: work, personal",
    plan: "구독 등급입니다. 등급이 높을수록 무거운 일을 이 계정에 더 맡깁니다.",
    role: "주력은 먼저, 예비는 막힐 때만, 아껴 쓰기는 가벼운 일에만 씁니다.",
    budget: "한 달에 쓸 금액(달러)입니다. 숫자만 입력합니다. 적으면 생각 깊이를 낮춰 아낍니다.",
    baseUrl: "API 주소입니다. 예: https://relay.example.com/v1",
    apiKey: "이 주소의 API 키입니다. 넣으면 바로 모델 목록을 불러옵니다.",
    api: "서버가 받는 요청 형식입니다. 모르면 OpenAI 호환을 고르세요.",
    models: "불러온 모델 중 쓸 것만 고릅니다. 아무것도 고르지 않으면 전부 씁니다.",
    relays: "이 주소가 어느 회사 모델을 중계하는지입니다. 모델 목록을 불러오면 자동으로 채워집니다.",
    remove: "이 계정을 목록에서 뺍니다.",
  },
  notSet: "안 정함",
  perMonth: (amount) => `월 $${amount}`,
  typeDigits: "달러 금액을 숫자로만 입력 · Enter 저장 · Esc 취소",
  typeText: "입력 · Enter 저장 · Esc 취소 · 붙여넣기 가능",
  fetchIdle: "API 키를 넣으면 모델을 불러옵니다",
  fetchLoading: "모델 목록을 불러오는 중",
  fetchOk: (count) => `모델 ${count}개를 찾았습니다`,
  fetchError: (error) => `불러오지 못했습니다: ${error}`,
  allModels: (count) => `전부 사용 (${count}개)`,
  pickedModels: (count, total) => `${count}/${total}개 선택`,
  autoRelays: "자동 감지",
  planGroups: { personal: "개인", team: "팀 · 비즈니스" },
  dropdownHint: "↑↓ 고르기 · Enter 확정 · Esc 닫기",
  multiHint: "↑↓ 이동 · Enter 켜기/끄기 · Esc 닫기",
  badUrl: "주소는 http:// 또는 https://로 시작해야 합니다.",
  reservedName: "이미 OmO에 있는 공급자 이름입니다. 다른 이름을 쓰세요.",
  customIncomplete: "사용자 정의 API의 주소를 먼저 넣어 주세요.",
  whyTag: {
    order: "OmO 권장",
    main: "주력 계정",
    efficient: "아껴 쓰기 계정",
    volume: "자주 돌아서 싼 모델",
    free: "무료 모델",
    capped: "한도에 맞춰 생각 깊이 낮춤",
    depth: "선택에 맞춰 더 깊게 생각",
    capacity: "반복 작업에 알려진 플랜 여유 반영",
    profile: "이 프로필의 주력 모델 계열",
    gateway: "게이트웨이 경유",
    relay: "릴레이 경유",
    rescue: "제외 규칙을 피해 고른 모델",
  },
  excludedNote: (n) => `내 exclude_models가 빠른 모델 ${n}종을 막아, 가까운 다른 모델을 골랐습니다`,
  acceptTitle: "추천대로 쓰기",
  acceptHint: "Enter를 누르면 아래 추천을 그대로 쓰고 넘어갑니다. 바꾸고 싶은 줄만 골라 ←→로 바꾸세요.",
  basedOn: "받은 정보",
  mainAiTitle: "메인 AI 모드",
  mainAiHint: "메인 AI는 나와 대화하며 계획을 세우고 일을 나눠 맡기는 AI입니다. ★ 표시가 시작할 때 쓰는 모드입니다.",
  helpersTitle: "도우미 AI",
  helpersHint: "메인 AI가 검색이나 계획 검토를 맡기는 작은 AI들입니다.",
  tasksTitle: "작업 종류별 모델",
  tasksHint: "메인 AI가 일을 넘길 때 일의 종류에 따라 이 모델이 맡습니다.",
  chainLabel: "막히면 이 순서로 넘어갑니다",
  changeHint: "←→ 다른 모델 · Enter 시작 모드로 정하기",
  tunedFor: "OmO 원래 이름",
  usageBadge: (label) => `사용 방식: ${label}`,
  editHintCell: "↑↓ 칸 이동 · Enter 고치기 · Esc 목록으로",
  accountSettings: "계정 설정",
  doneLabel: "완료",
  doneHint: "Esc를 눌러도 저장됩니다",
  openAccountHint: "계정을 Enter나 클릭으로 열면 상세 설정 창이 뜹니다.",
  saveClose: "저장하고 닫기",
  saveHelp: "고친 내용을 저장하고 계정 목록으로 돌아갑니다.",
  budgetCustom: "직접 입력 ($)",
  budgetNone: "정하지 않음",
  usdPerMonth: "달러(USD) / 월",
  nextToModels: "다음: 모델 추천",
  expensiveTitle: "Fable·Astra처럼 비싼 모델도 추천에 포함할까요?",
  expensiveHint: "후보에만 추가하며 항상 상위 모델로 바꾸지는 않습니다. ← 아니요 / → 예 · Enter 전환",
  expensiveYes: "예, 포함합니다",
  expensiveNo: "아니요, 제외합니다",
  providerPriorities: "공급자 우선순위",
  priorityHint: "먼저 쓰고 싶은 제공업체를 위로 옮기세요.",
  priorityReserve: "역할 적합도와 플랜 여유도 반영합니다. 예비 모델은 끝에 모두 추가됩니다.",
  priorityKeys: "Enter로 집기 → ↑↓ 이동 → Enter로 놓기",
  priorityMoving: "위치를 옮기는 중 · ↑↓ 이동 · Enter로 놓기",
  priorityRecommend: "이 순서로 추천하기",
  priorityEmpty: "계정을 연결하면 공급자가 여기에 표시됩니다.",
  priorityEarlier: "위로",
  priorityLater: "아래로",
};

export const extraEn: Extra = {
  usageTitle: "How will you use OmO?",
  usageSubtitle: "Your answer decides which models run and how deeply they think. You can change it later.",
  fieldLabels: {
    plan: "Plan",
    role: "Role",
    budget: "Monthly budget",
    baseUrl: "URL",
    apiKey: "API key",
    api: "Format",
    models: "Models",
    relays: "Model families",
  },
  fieldHelp: {
    name: "A nickname OmO uses to tell this account apart. For example work, personal",
    plan: "Your plan tier. Higher tiers take more of the heavy work.",
    role: "Main runs first, fallback only when others fail, efficient takes only light work.",
    budget: "What you spend per month, in dollars. Digits only. Small budgets think less deeply.",
    baseUrl: "The API address. For example https://relay.example.com/v1",
    apiKey: "The key for this address. Entering it loads the model list right away.",
    api: "The request format the server accepts. If unsure, pick OpenAI-compatible.",
    models: "Pick the loaded models to use. Pick none to use them all.",
    relays: "Which vendors this address relays. Filled in automatically once models load.",
    remove: "Removes this account from the list.",
  },
  notSet: "not set",
  perMonth: (amount) => `$${amount}/month`,
  typeDigits: "Dollar amount, digits only · Enter saves · Esc cancels",
  typeText: "Type · Enter saves · Esc cancels · paste works",
  fetchIdle: "Enter an API key to load models",
  fetchLoading: "Loading the model list",
  fetchOk: (count) => `Found ${count} models`,
  fetchError: (error) => `Could not load: ${error}`,
  allModels: (count) => `Use all (${count})`,
  pickedModels: (count, total) => `${count} of ${total} picked`,
  autoRelays: "auto-detect",
  planGroups: { personal: "Personal", team: "Team · Business" },
  dropdownHint: "↑↓ choose · Enter picks · Esc closes",
  multiHint: "↑↓ move · Enter toggles · Esc closes",
  badUrl: "The URL must start with http:// or https://.",
  reservedName: "That is already an OmO provider name. Use another.",
  customIncomplete: "Enter the URL for the custom API first.",
  whyTag: {
    order: "OmO pick",
    main: "main account",
    efficient: "efficient account",
    volume: "runs often, cheap model",
    free: "free model",
    capped: "thinking lowered to fit limits",
    depth: "deeper reasoning as requested",
    capacity: "known plan headroom for recurring work",
    profile: "preferred model family for this profile",
    gateway: "via gateway",
    relay: "via relay",
    rescue: "picked around your exclusions",
  },
  excludedNote: (n) => `your exclude_models blocked ${n} faster picks, so a close alternative was chosen`,
  acceptTitle: "Use the recommendation",
  acceptHint: "Press Enter to keep everything below and continue. To change one, pick its row and use ←→.",
  basedOn: "Based on",
  mainAiTitle: "Main AI mode",
  mainAiHint: "The main AI talks with you, plans, and hands out work. ★ marks the mode it starts in.",
  helpersTitle: "Helper AIs",
  helpersHint: "Small AIs the main AI sends searches and plan reviews to.",
  tasksTitle: "Models per task kind",
  tasksHint: "When the main AI hands work off, the task kind decides which model takes it.",
  chainLabel: "If it gets stuck, it moves on in this order",
  changeHint: "←→ other model · Enter makes it the start mode",
  tunedFor: "OmO name",
  usageBadge: (label) => `Usage: ${label}`,
  editHintCell: "↑↓ move between fields · Enter edits · Esc back to list",
  accountSettings: "Account settings",
  doneLabel: "Done",
  doneHint: "Esc also saves",
  openAccountHint: "Open an account with Enter or a click to see its detailed settings.",
  saveClose: "Save and close",
  saveHelp: "Saves your changes and goes back to the account list.",
  budgetCustom: "Enter an amount ($)",
  budgetNone: "No limit set",
  usdPerMonth: "US dollars / month",
  nextToModels: "Next: model picks",
  expensiveTitle: "Include expensive models such as Fable and Astra?",
  expensiveHint: "Adds candidates, not an automatic upgrade. ← No / → Yes · Enter toggles",
  expensiveYes: "Yes, include them",
  expensiveNo: "No, exclude them",
  providerPriorities: "Provider priorities",
  priorityHint: "Move the providers you prefer toward the top.",
  priorityReserve: "Task fit and plan capacity also matter. All reserves are appended.",
  priorityKeys: "Enter to pick up → ↑↓ move → Enter to drop",
  priorityMoving: "Moving this provider · ↑↓ move · Enter to drop",
  priorityRecommend: "Use order and recommend",
  priorityEmpty: "Connect an account to see its provider here.",
  priorityEarlier: "Move up",
  priorityLater: "Move down",
};

export type AllMessages = Messages & Extra;
