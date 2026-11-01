import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

type Json = Record<string, unknown>;

export type Change = { readonly provider: string; readonly action: "add" | "merge" | "replace"; readonly accounts: readonly string[] };

export type ApplyResult = { readonly backupPath: string | null; readonly changes: readonly Change[] };

export function startHome(): string {
  return process.env.OMO_START_HOME ?? join(homedir(), ".omo", "start");
}

export function stagingDir(): string {
  return join(startHome(), "pending");
}

export async function resetStaging(): Promise<string> {
  const dir = stagingDir();
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await chmod(dir, 0o700);
  return dir;
}

export async function discardStaging(): Promise<void> {
  await rm(stagingDir(), { recursive: true, force: true });
}

const isObject = (value: unknown): value is Json => typeof value === "object" && value !== null && !Array.isArray(value);

function accountsOf(credential: Json): Json[] {
  if (Array.isArray(credential.accounts)) return credential.accounts.filter(isObject);
  const { type: _type, accounts: _accounts, ...fields } = credential;
  return [{ name: "default", source: "login", ...fields }];
}

function uniqueName(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  let n = 2;
  while (taken.has(`${name}-${n}`)) n += 1;
  return `${name}-${n}`;
}

export function mergeAuth(real: Json, staged: Json): { merged: Json; changes: Change[] } {
  const merged: Json = { ...real };
  const changes: Change[] = [];
  for (const [provider, incoming] of Object.entries(staged)) {
    if (!isObject(incoming)) continue;
    const names = accountsOf(incoming).map((a) => String(a.name ?? "default"));
    const current = merged[provider];
    if (!isObject(current)) {
      merged[provider] = incoming;
      changes.push({ provider, action: "add", accounts: names });
      continue;
    }
    if (current.type !== incoming.type) {
      merged[provider] = incoming;
      changes.push({ provider, action: "replace", accounts: names });
      continue;
    }
    const existing = accountsOf(current);
    const taken = new Set(existing.map((a) => String(a.name ?? "")));
    const added = accountsOf(incoming).map((account) => {
      const name = uniqueName(String(account.name ?? "default"), taken);
      taken.add(name);
      return { ...account, name };
    });
    merged[provider] = { ...current, accounts: [...existing, ...added] };
    changes.push({ provider, action: "merge", accounts: added.map((a) => String(a.name)) });
  }
  return { merged, changes };
}

export async function readJson(path: string): Promise<Json> {
  if (!existsSync(path)) return {};
  const parsed: unknown = JSON.parse(await readFile(path, "utf8"));
  if (!isObject(parsed)) throw new Error(`${path} is not a JSON object`);
  return parsed;
}

export type ExtraAuth = Readonly<Record<string, Json>>;

export async function previewApply(targetDir: string, extra: ExtraAuth = {}): Promise<Change[]> {
  const staged = { ...(await readJson(join(stagingDir(), "auth.json"))), ...extra };
  const real = await readJson(join(targetDir, "auth.json"));
  return mergeAuth(real, staged).changes;
}

export class StoreBusyError extends Error {}

export async function applyStaged(targetDir: string, now: Date = new Date(), extra: ExtraAuth = {}): Promise<ApplyResult> {
  const target = join(targetDir, "auth.json");
  if (existsSync(`${target}.lock`)) throw new StoreBusyError(`${target} is locked by a running OmO`);
  const staged = { ...(await readJson(join(stagingDir(), "auth.json"))), ...extra };
  const real = await readJson(target);
  const { merged, changes } = mergeAuth(real, staged);
  await mkdir(targetDir, { recursive: true, mode: 0o700 });
  let backupPath: string | null = null;
  if (existsSync(target)) {
    backupPath = `${target}.bak-omo-start-${now.toISOString().replace(/[:.]/g, "-")}`;
    await copyFile(target, backupPath);
    await chmod(backupPath, 0o600);
  }
  const tmp = `${target}.${process.pid}.tmp`;
  await writeFile(tmp, `${JSON.stringify(merged, null, 2)}\n`, { mode: 0o600 });
  await rename(tmp, target);
  await discardStaging();
  return { backupPath, changes };
}
