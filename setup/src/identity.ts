import { join } from "node:path";
import { findProvider, loginProviderOf } from "./providers.ts";
import { readJson, stagingDir } from "./stage.ts";
import type { Account } from "./wizard.ts";

export type Identity = { readonly email?: string; readonly plan?: string };

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);
const text = (value: unknown): string | undefined => (typeof value === "string" && value !== "" ? value : undefined);

export function jwtClaims(token: unknown): Json | null {
  const payload = typeof token === "string" ? token.split(".")[1] : undefined;
  if (!payload) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return isObject(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

const KNOWN_PLANS: Readonly<Record<string, string>> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
  prolite: "Pro Lite",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
  edu: "Edu",
};

export function humanizePlan(raw: string): string {
  return KNOWN_PLANS[raw.toLowerCase()] ?? raw.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function chatgptIdentity(access: unknown): Identity {
  const claims = jwtClaims(access);
  const profile = isObject(claims?.["https://api.openai.com/profile"]) ? claims["https://api.openai.com/profile"] : undefined;
  const auth = isObject(claims?.["https://api.openai.com/auth"]) ? claims["https://api.openai.com/auth"] : undefined;
  const email = text((profile as Json | undefined)?.email);
  const plan = text((auth as Json | undefined)?.chatgpt_plan_type);
  return { ...(email ? { email } : {}), ...(plan ? { plan: humanizePlan(plan) } : {}) };
}

export function copilotSku(access: unknown): string | undefined {
  if (typeof access !== "string") return undefined;
  for (const field of access.split(";")) {
    const [key, value] = field.split("=");
    if (key === "sku" && value) return value.split(":")[0];
  }
  return undefined;
}

export function claudePlan(organization: Json | undefined): string | undefined {
  const tier = text(organization?.rate_limit_tier) ?? "";
  const type = text(organization?.organization_type);
  if (tier.includes("max_20x")) return "Max 20x";
  if (tier.includes("max_5x")) return "Max 5x";
  if (type === "claude_max") return "Max";
  if (type === "claude_pro") return "Pro";
  return type ? humanizePlan(type.replace(/^claude_/, "")) : undefined;
}

async function getJson(url: string, headers: Record<string, string>): Promise<Json | null> {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const body: unknown = await response.json();
  return isObject(body) ? body : null;
}

function newest(credential: Json): Json {
  const slots = Array.isArray(credential.accounts) ? credential.accounts.filter(isObject) : [];
  const last = slots.at(-1);
  return last ? { ...credential, ...last } : credential;
}

export async function identify(account: Account, agentDir: string = stagingDir()): Promise<Identity | null> {
  const provider = findProvider(account.provider);
  if (provider.kind !== "oauth") return null;
  const stored = (await readJson(join(agentDir, "auth.json")))[loginProviderOf(provider)];
  if (!isObject(stored)) return null;
  const credential = newest(stored);
  switch (provider.id) {
    case "chatgpt-subscription":
      return chatgptIdentity(credential.access);
    case "github-copilot": {
      const domain = text(credential.enterpriseUrl) ?? "github.com";
      const user = await getJson(`https://api.${domain}/user`, {
        Authorization: `Bearer ${String(credential.refresh ?? "")}`,
        Accept: "application/vnd.github+json",
      });
      const email = text(user?.email) ?? text(user?.login);
      const sku = copilotSku(credential.access);
      return { ...(email ? { email } : {}), ...(sku ? { plan: humanizePlan(sku) } : {}) };
    }
    case "anthropic-subscription": {
      const profile = await getJson("https://api.anthropic.com/api/oauth/profile", {
        Authorization: `Bearer ${String(credential.access ?? "")}`,
        "anthropic-beta": "oauth-2025-04-20",
      });
      const who = isObject(profile?.account) ? profile.account : undefined;
      const email = text(who?.email) ?? text(who?.email_address);
      const plan = claudePlan(isObject(profile?.organization) ? profile.organization : undefined);
      return { ...(email ? { email } : {}), ...(plan ? { plan } : {}) };
    }
    default: {
      const email = text(jwtClaims(credential.access)?.email);
      return email ? { email } : {};
    }
  }
}
