#!/usr/bin/env bun
import { openSync } from "node:fs";
import { ReadStream } from "node:tty";
import { render } from "ink";
import { App, type DoneResult } from "./app.tsx";
import { MESSAGES, padEnd } from "./i18n.ts";
import { disableMouse, enableMouse, withMouse } from "./mouse.ts";
import { findProvider } from "./providers.ts";

function keyboard(): NodeJS.ReadStream | null {
  if (process.stdin.isTTY) return process.stdin;
  // Under `curl ... | bash` stdin is the script pipe. Bun on macOS fails with
  // EINVAL (kqueue) when stdin is redirected from /dev/tty, so open the terminal
  // as its own TTY stream instead.
  try {
    return new ReadStream(openSync("/dev/tty", "r")) as unknown as NodeJS.ReadStream;
  } catch {
    return null;
  }
}

const tty = keyboard();
if (!tty) {
  console.error("omo-start needs an interactive terminal. Run it from a terminal window.");
  process.exit(1);
}
const stdin = withMouse(tty);

let done: DoneResult | null = null;
const instance = render(<App onDone={(result) => (done = result)} />, {
  stdin,
  alternateScreen: true,
  incrementalRendering: true,
});
enableMouse();
let failed = false;
try {
  await instance.waitUntilExit();
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : String(error));
}
disableMouse();
if (tty !== process.stdin) tty.destroy();

const result = done as DoneResult | null;
if (result) {
  const m = MESSAGES[result.lang];
  console.log(`\n${m.summaryTitle(result.path)}\n`);
  for (const { account, status, detectedPlan } of result.outcomes) {
    const provider = findProvider(account.provider);
    const plan = provider.plans.find((p) => p.id === account.plan);
    const planText = detectedPlan ?? (plan ? plan.label[result.lang] : "-");
    console.log(
      `  ${padEnd(provider.name, 20)} ${padEnd(account.name, 14)} ${padEnd(planText, 22)} ${m.summaryLogin[status]}`,
    );
  }
  console.log("");
  if (result.apply.kind === "applied") {
    if (result.apply.result) {
      console.log(m.appliedTitle(`${result.apply.target}/auth.json`));
      if (result.apply.result.backupPath) console.log(m.backupLine(result.apply.result.backupPath));
    }
    if (result.apply.config) {
      console.log(m.configApplied(result.apply.config.configPath));
      if (result.apply.config.backupPath) console.log(m.backupLine(result.apply.config.backupPath));
      if (result.apply.config.extensionPath) console.log(m.turboHint);
      for (const path of result.apply.config.launcherPaths) console.log(`  ${path}`);
      if (result.apply.config.launcherPaths.length > 0) {
        console.log(result.lang === "ko"
          ? "위 절대경로로 실행하세요. bin 폴더가 PATH에 있으면 omo-claude 등의 이름으로도 실행됩니다."
          : "Run the absolute paths above, or use the command names when their bin directory is on PATH.");
      }
    }
    console.log("");
  } else if (result.apply.kind === "kept") {
    console.log(m.keptTitle(result.apply.staged));
    console.log(m.keptHint);
    console.log("");
  }
}
process.exit(failed ? 1 : 0);
