import type { CustomApi, Relay } from "./providers.ts";

export type FetchResult = { readonly ok: true; readonly ids: readonly string[] } | { readonly ok: false; readonly error: string };

const NOT_CHAT = /embed|whisper|tts|dall-e|image|audio|rerank|moderation|transcribe|speech|vision-exp/i;

const FAMILY: readonly (readonly [Relay, RegExp])[] = [
  ["claude", /claude|anthropic|opus|sonnet|haiku|fable/i],
  ["kiro", /kiro/i],
  ["chatgpt", /gpt|openai|\bo[134]\b|codex/i],
  ["grok", /grok|x-ai|xai/i],
  ["glm", /glm|zhipu|z-ai/i],
  ["kimi", /kimi|moonshot|\bk[23](\.|-|$)/i],
  ["gemini", /gemini|gemma/i],
  ["deepseek", /deepseek/i],
];

export function modelsUrl(baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return /\/v\d+(beta)?$/.test(base) ? `${base}/models` : `${base}/v1/models`;
}

export function authHeaders(api: CustomApi, key: string): Record<string, string> {
  return api === "anthropic-messages"
    ? { "x-api-key": key, "anthropic-version": "2023-06-01", Authorization: `Bearer ${key}` }
    : { Authorization: `Bearer ${key}` };
}

export function chatModelIds(body: unknown): string[] {
  const list = (body as { data?: unknown } | null)?.data;
  if (!Array.isArray(list)) return [];
  const ids = list
    .map((item) => (typeof item === "object" && item !== null ? (item as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === "string" && id !== "" && !NOT_CHAT.test(id));
  return [...new Set(ids)].sort();
}

export function detectRelays(ids: readonly string[]): Relay[] {
  return FAMILY.filter(([, pattern]) => ids.some((id) => pattern.test(id))).map(([relay]) => relay);
}

const normalize = (id: string) =>
  (id.split("/").pop() ?? id)
    .toLowerCase()
    .replace(/[._]/g, "-")
    .replace(/-(latest|preview|\d{8})$/, "");

export function matchModel(canonical: string, ids: readonly string[]): string | undefined {
  const want = normalize(canonical);
  return ids.find((id) => normalize(id) === want) ?? ids.find((id) => normalize(id).startsWith(`${want}-`));
}

export async function fetchModels(baseUrl: string, api: CustomApi, key: string, signal?: AbortSignal): Promise<FetchResult> {
  try {
    const response = await fetch(modelsUrl(baseUrl), { headers: authHeaders(api, key), signal: signal ?? AbortSignal.timeout(10_000) });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    const ids = chatModelIds(await response.json());
    return ids.length > 0 ? { ok: true, ids } : { ok: false, error: "no models" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export type CustomProviderEntry = {
  readonly baseUrl: string;
  readonly api: CustomApi;
  readonly models: readonly { readonly id: string }[];
};

export function customEntry(baseUrl: string, api: CustomApi, models: readonly string[]): CustomProviderEntry {
  return { baseUrl, api, models: models.map((id) => ({ id })) };
}
