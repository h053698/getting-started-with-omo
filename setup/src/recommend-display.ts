import type { Reasoning } from "./catalog.ts";

const REASONING_WORD: Readonly<Record<Reasoning, { ko: string; en: string }>> = {
  off: { ko: "생각 없이", en: "no thinking" },
  minimal: { ko: "아주 가볍게", en: "minimal" },
  low: { ko: "가볍게 생각", en: "light thinking" },
  medium: { ko: "보통 생각", en: "medium thinking" },
  high: { ko: "깊게 생각", en: "deep thinking" },
  xhigh: { ko: "아주 깊게", en: "very deep" },
  max: { ko: "최대로 생각", en: "maximum thinking" },
};

export function reasoningWord(reasoning: Reasoning | undefined, lang: "ko" | "en"): string {
  return reasoning ? REASONING_WORD[reasoning][lang] : "";
}

const NAME_PARTS: Readonly<Record<string, string>> = {
  gpt: "GPT",
  glm: "GLM",
  deepseek: "DeepSeek",
  minimax: "MiniMax",
  qwen: "Qwen",
  kimi: "Kimi",
};

export function prettyModel(id: string): string {
  const bare = id.includes("/") ? (id.split("/").pop() ?? id) : id;
  const plain = bare.replace(/:free$/, " (free)").replace(/-free$/, " (free)");
  const k = plain.replace(/^k(\d)/, "kimi-k$1");
  const words = k.split("-");
  const out: string[] = [];
  for (const word of words) {
    if (NAME_PARTS[word]) out.push(NAME_PARTS[word]);
    else if (/^\d+$/.test(word) && /^\d+$/.test(out.at(-1)?.split(" ").pop() ?? "")) out[out.length - 1] += `.${word}`;
    else if (/^k\d/.test(word) || /^m\d/.test(word) || /^v\d/.test(word)) out.push(word.toUpperCase());
    else out.push(word.charAt(0).toUpperCase() + word.slice(1));
  }
  return out.join(" ").replace(/^GPT (\d)/, "GPT-$1");
}
