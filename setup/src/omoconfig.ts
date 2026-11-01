import { existsSync } from "node:fs";
import { chmod, copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { applyEdits, type FormattingOptions, modify, parse, type ParseError } from "jsonc-parser";
import { ALL_SLOTS, type SlotKind } from "./catalog.ts";
import { type Choice, choiceKey } from "./recommend.ts";
import type { ProviderProfile } from "./provider-profiles.ts";
import { prepareProfileArtifacts, writeProfileArtifacts } from "./profile-launchers.ts";

export type SlotSetting = { readonly slotId: string; readonly kind: SlotKind; readonly chain: readonly Choice[] };

export type CustomProviderSetup = {
  readonly id: string;
  readonly baseUrl: string;
  readonly api: string;
  readonly models: readonly string[];
};

export type ModelSetup = {
  readonly slots: readonly SlotSetting[];
  readonly defaultLane: string | null;
  readonly turbo: Choice | null;
  readonly customs?: readonly CustomProviderSetup[];
  readonly profiles?: readonly ProviderProfile[];
};

export type ConfigChange = { readonly path: string; readonly summary: string };

const FORMAT: FormattingOptions = { insertSpaces: true, tabSize: 2, eol: "\n" };

export function omoConfigPath(): string {
  const home = process.env.OMO_START_CONFIG_HOME ?? join(homedir(), ".omo");
  const jsonc = join(home, "omo.jsonc");
  return existsSync(jsonc) || !existsSync(join(home, "omo.json")) ? jsonc : join(home, "omo.json");
}

export function turbomodeExtensionPath(agentDir: string): string {
  return join(agentDir, "extensions", "omo-turbomode.js");
}

function entry(choice: Choice): { model: string; reasoning?: string } {
  return { model: choiceKey(choice), ...(choice.reasoning ? { reasoning: choice.reasoning } : {}) };
}

function label(chain: readonly Choice[]): string {
  return chain.map((choice) => `${choiceKey(choice)}${choice.reasoning ? ` (${choice.reasoning})` : ""}`).join(" → ");
}

function section(kind: SlotKind): string {
  return kind === "lane" ? "model_profiles" : kind === "agent" ? "agents" : "categories";
}

export function plannedEdits(setup: ModelSetup): { path: (string | number)[]; value: unknown; summary: string }[] {
  const edits: { path: (string | number)[]; value: unknown; summary: string }[] = [];
  for (const { slotId, kind, chain } of setup.slots) {
    if (chain.length === 0) continue;
    const slot = ALL_SLOTS.find((s) => s.id === slotId);
    const base = ["[native]", section(kind), slotId];
    const models = chain.map(entry);
    if (kind === "lane") {
      edits.push({ path: base, value: { display_name: slot?.omoName ?? slotId, models }, summary: label(chain) });
    } else {
      edits.push({ path: [...base, "models"], value: models, summary: label(chain) });
    }
  }
  if (setup.defaultLane) {
    edits.push({ path: ["[native]", "model_profile"], value: setup.defaultLane, summary: setup.defaultLane });
  }
  if (setup.turbo) {
    edits.push({
      path: ["[native]", "model_profiles", "turbo"],
      value: { display_name: "Turbo", caution: "Spends subscription quota fast.", models: [entry(setup.turbo)] },
      summary: label([setup.turbo]),
    });
    edits.push({
      path: ["profiles", "turbo", "[native]", "model_profile"],
      value: "turbo",
      summary: "OMO_PROFILE=turbo",
    });
  }
  for (const profile of setup.profiles ?? []) {
    edits.push({ path: ["profiles", profile.name], value: providerProfileValue(profile), summary: `${profile.label} main · ${choiceKey(profile.main)}` });
  }
  return edits;
}

export function providerProfileValue(profile: ProviderProfile): { readonly "[native]": Record<string, unknown> } {
  const native: Record<string, unknown> = { model_profile: profile.defaultLane, exclude_models: profile.excludes };
  for (const kind of ["lane", "agent", "category"] as const) {
    const entries: Record<string, unknown> = {};
    for (const slot of profile.slots.filter((slot) => slot.kind === kind)) {
      const first = slot.chain[0];
      if (!first) throw new Error(`Profile ${profile.name} has no model for ${slot.slotId}`);
      entries[slot.slotId] = kind === "lane"
        ? { display_name: ALL_SLOTS.find((item) => item.id === slot.slotId)?.omoName ?? slot.slotId, models: slot.chain.map(entry) }
        : { model: choiceKey(first), reasoning: first.reasoning ?? "off", models: slot.chain.map(entry) };
    }
    native[section(kind)] = entries;
  }
  return { "[native]": native };
}

export function applySetupToText(text: string, setup: ModelSetup): string {
  let out = text.trim() === "" ? "{}\n" : text;
  const errors: ParseError[] = [];
  parse(out, errors, { allowTrailingComma: true });
  if (errors.length > 0) throw new Error("omo.jsonc is not valid JSONC; fix it before applying");
  for (const edit of plannedEdits(setup)) {
    out = applyEdits(out, modify(out, edit.path, edit.value, { formattingOptions: FORMAT }));
  }
  return out;
}

export function previewChanges(setup: ModelSetup): ConfigChange[] {
  return [
    ...plannedEdits(setup).map((edit) => ({ path: edit.path.join("."), summary: edit.summary })),
    ...(setup.profiles ?? []).map((profile) => ({ path: join(dirname(omoConfigPath()), "bin", profile.name), summary: `OMO_PROFILE=${profile.name}` })),
  ];
}

export function modelsJsonPath(agentDir: string): string {
  return join(agentDir, "models.json");
}

export function mergeCustomModels(text: string, customs: readonly CustomProviderSetup[]): string {
  let out = text.trim() === "" ? "{}\n" : text;
  const errors: ParseError[] = [];
  parse(out, errors, { allowTrailingComma: true });
  if (errors.length > 0) throw new Error("models.json is not valid JSON; fix it before applying");
  for (const custom of customs) {
    const value = { baseUrl: custom.baseUrl, api: custom.api, models: custom.models.map((id) => ({ id })) };
    out = applyEdits(out, modify(out, ["providers", custom.id], value, { formattingOptions: FORMAT }));
  }
  return out;
}

export async function readExcludes(path: string = omoConfigPath()): Promise<string[]> {
  if (!existsSync(path)) return [];
  const doc = parse(await readFile(path, "utf8"), [], { allowTrailingComma: true }) as Record<string, unknown> | undefined;
  const lists = [doc?.exclude_models, (doc?.["[native]"] as Record<string, unknown> | undefined)?.exclude_models];
  return lists.flatMap((list) => (Array.isArray(list) ? list.filter((v): v is string => typeof v === "string") : []));
}

export function turbomodeSource(turbo: Choice): string {
  return `// Generated by omo-start. Delete this file to remove /turbomode.
const TURBO = ${JSON.stringify({ provider: turbo.provider, model: turbo.model, reasoning: turbo.reasoning ?? "high" })};

export default function turbomode(pi) {
  let previous = null;
  pi.registerCommand("turbomode", {
    description: "Switch this session to the turbo model, or back",
    handler: async (_args, ctx) => {
      if (previous) {
        const back = ctx.modelRegistry.find(previous.provider, previous.id);
        if (back && (await pi.setModel(back))) {
          if (previous.thinking) pi.setThinkingLevel(previous.thinking);
          ctx.ui.notify("Turbo mode off: back to " + previous.provider + "/" + previous.id, "info");
          previous = null;
          return;
        }
        previous = null;
      }
      const model = ctx.modelRegistry.find(TURBO.provider, TURBO.model);
      if (!model) {
        ctx.ui.notify("Turbo model " + TURBO.provider + "/" + TURBO.model + " is not available", "error");
        return;
      }
      const current = ctx.model;
      const thinking = pi.getThinkingLevel();
      if (!(await pi.setModel(model))) {
        ctx.ui.notify("Log in to " + TURBO.provider + " first: /login " + TURBO.provider, "error");
        return;
      }
      pi.setThinkingLevel(TURBO.reasoning);
      previous = current ? { provider: current.provider, id: current.id, thinking } : null;
      ctx.ui.notify("Turbo mode on: " + TURBO.provider + "/" + TURBO.model + " " + TURBO.reasoning + ". Run /turbomode again to switch back.", "info");
    },
  });
}
`;
}

export type ApplyConfigResult = {
  readonly configPath: string;
  readonly backupPath: string | null;
  readonly extensionPath: string | null;
  readonly modelsPath: string | null;
  readonly launcherPaths: readonly string[];
};

async function writeWithBackup(path: string, text: string, now: Date): Promise<string | null> {
  const exists = existsSync(path);
  await mkdir(dirname(path), { recursive: true });
  let backupPath: string | null = null;
  if (exists) {
    backupPath = `${path}.bak-omo-start-${now.toISOString().replace(/[:.]/g, "-")}`;
    await copyFile(path, backupPath);
  }
  const tmp = `${path}.${process.pid}.tmp`;
  await writeFile(tmp, text, { mode: 0o600 });
  await rename(tmp, path);
  return backupPath;
}

export async function applySetup(setup: ModelSetup, agentDir: string, now: Date = new Date()): Promise<ApplyConfigResult> {
  const configPath = omoConfigPath();
  const before = existsSync(configPath) ? await readFile(configPath, "utf8") : "";
  const artifacts = setup.profiles?.length
    ? await prepareProfileArtifacts(configPath, before, setup.profiles.map((profile) => ({ name: profile.name, main: profile.main, value: providerProfileValue(profile) })))
    : null;
  const backupPath = await writeWithBackup(configPath, applySetupToText(before, setup), now);
  let modelsPath: string | null = null;
  if (setup.customs && setup.customs.length > 0) {
    modelsPath = modelsJsonPath(agentDir);
    const current = existsSync(modelsPath) ? await readFile(modelsPath, "utf8") : "";
    await writeWithBackup(modelsPath, mergeCustomModels(current, setup.customs), now);
  }
  let extensionPath: string | null = null;
  if (setup.turbo) {
    extensionPath = turbomodeExtensionPath(agentDir);
    await mkdir(dirname(extensionPath), { recursive: true });
    await writeFile(extensionPath, turbomodeSource(setup.turbo));
    await chmod(extensionPath, 0o644);
  }
  const launcherPaths = artifacts ? await writeProfileArtifacts(artifacts) : [];
  return { configPath, backupPath, extensionPath, modelsPath, launcherPaths };
}

export async function preflightSetup(setup: ModelSetup): Promise<void> {
  if (!setup.profiles?.length) return;
  const configPath = omoConfigPath();
  const before = existsSync(configPath) ? await readFile(configPath, "utf8") : "";
  await prepareProfileArtifacts(configPath, before, setup.profiles.map((profile) => ({ name: profile.name, main: profile.main, value: providerProfileValue(profile) })));
}
