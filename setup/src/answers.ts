import { mkdir, rename } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { findProvider, type Kind, loginProviderOf } from "./providers.ts";
import { type Account, sortedAccounts } from "./wizard.ts";
import type { SetupPreferences } from "./preferences.ts";

export type SavedAccount = {
  readonly provider: string;
  readonly loginProvider: string;
  readonly name: string;
  readonly kind: Kind;
  readonly plan: string | null;
};

export type SavedFile = {
  readonly version: 2;
  readonly createdAt: string;
  readonly accounts: readonly SavedAccount[];
  readonly preferences?: SetupPreferences;
};

export function outputPath(): string {
  return process.env.OMO_START_OUT ?? join(homedir(), ".omo", "start", "subscriptions.json");
}

export function toSavedFile(accounts: readonly Account[], now: Date, preferences?: SetupPreferences): SavedFile {
  return {
    version: 2,
    createdAt: now.toISOString(),
    ...(preferences ? { preferences } : {}),
    accounts: sortedAccounts(accounts).map((account) => {
      const provider = findProvider(account.provider);
      return {
        provider: provider.id,
        loginProvider: loginProviderOf(provider),
        name: account.name,
        kind: provider.kind,
        plan: account.plan,
      };
    }),
  };
}

export async function saveAccounts(accounts: readonly Account[], path: string = outputPath(), preferences?: SetupPreferences): Promise<string> {
  await mkdir(dirname(path), { recursive: true });
  const tmp = `${path}.${process.pid}.tmp`;
  await Bun.write(tmp, `${JSON.stringify(toSavedFile(accounts, new Date(), preferences), null, 2)}\n`);
  await rename(tmp, path);
  return path;
}
