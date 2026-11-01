import { expect, test } from "bun:test";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { deviceLogin, Engine, reconcileLoginSlots, type LoginView } from "./engine.ts";

test("retry slot reconciliation replaces only the selected account after success", () => {
  expect(reconcileLoginSlots([], ["default"], undefined)).toEqual({ current: "default" });
  expect(reconcileLoginSlots(["default", "login-2"], ["default", "login-2", "login-3"], "default")).toEqual({
    current: "login-3",
    remove: "default",
  });
  expect(reconcileLoginSlots(["work", "personal"], ["work", "personal"], "work")).toEqual({ current: "work" });
  expect(reconcileLoginSlots(["default"], ["default", "login-2", "login-3"], "default")).toEqual({ current: "default" });
});

test.each(["success", "cancel"] as const)("Native device callback reaches the TUI and %s settles the login", async (outcome) => {
  const root = await mkdtemp(join(process.env.TMPDIR ?? "/tmp", "omo-device-adapter-"));
  const original = process.env.OMO_START_OMO;
  const executable = join(root, "omo-ai", "bin", "omo");
  const moduleDir = join(root, "@code-yeongyu", "senpi", "dist", "core");
  const stage = join(root, "stage");
  await mkdir(join(root, "omo-ai", "bin"), { recursive: true });
  await mkdir(moduleDir, { recursive: true });
  await writeFile(executable, "#!/bin/sh\nexit 1\n");
  await chmod(executable, 0o755);
  await writeFile(join(moduleDir, "auth-storage.js"), `
export class AuthStorage {
  static create(path) {
    if (path !== ${JSON.stringify(join(stage, "auth.json"))}) throw new Error("Wrong credential store");
    return {
      async login(provider, callbacks) {
        if (provider !== "chatgpt-subscription") throw new Error("Wrong provider");
        const method = await callbacks.onSelect({
          message: "Select ChatGPT Subscription login method:",
          options: [{ id: "browser", label: "Browser login (default)" }, { id: "device_code", label: "Device code login (headless)" }]
        });
        if (method !== "device_code") throw new Error("Device method was not selected");
        callbacks.onDeviceCode({ userCode: "TEST-1234", verificationUri: "https://example.invalid/device" });
        ${outcome === "cancel" ? `await new Promise((resolve, reject) => {
          if (callbacks.signal.aborted) reject(new Error("Login cancelled"));
          else callbacks.signal.addEventListener("abort", () => reject(new Error("Login cancelled")), { once: true });
        });` : ""}
      }
    };
  }
}`);
  process.env.OMO_START_OMO = executable;
  try {
    const shown = Promise.withResolvers<LoginView>();
    const run = deviceLogin(
      { key: 1, provider: "chatgpt-subscription", name: "work", plan: "pro-100" },
      null, stage,
      { onView: (view) => { if (view.kind === "device") shown.resolve(view); } },
    );
    expect(await shown.promise).toEqual({ kind: "device", url: "https://example.invalid/device", code: "TEST-1234" });
    if (outcome === "cancel") run.cancel();
    expect(await run.result).toEqual(outcome === "success" ? { ok: true } : { ok: false, error: "Login cancelled" });
  } finally {
    if (original === undefined) delete process.env.OMO_START_OMO;
    else process.env.OMO_START_OMO = original;
    await rm(root, { recursive: true, force: true });
  }
});

test("running RPC owns staged account listing and removal", async () => {
  const root = await mkdtemp(join(process.env.TMPDIR ?? "/tmp", "omo-relogin-rpc-"));
  const original = process.env.OMO_START_OMO;
  const executable = join(root, "fake-omo.mjs");
  const log = join(root, "commands.jsonl");
  await writeFile(executable, `#!/usr/bin/env bun
const log = ${JSON.stringify(log)};
for await (const line of console) {
  const command = JSON.parse(line);
  await Bun.write(log, (await Bun.file(log).exists() ? await Bun.file(log).text() : "") + JSON.stringify(command) + "\\n");
  const data = command.type === "get_provider_accounts" ? { accounts: [{ name: "default" }, { name: "login-2" }], ordered: false } : undefined;
  console.log(JSON.stringify({ type: "response", id: command.id, command: command.type, success: true, ...(data ? { data } : {}) }));
}`);
  await chmod(executable, 0o755);
  process.env.OMO_START_OMO = executable;
  const account = { key: 1, provider: "chatgpt-subscription", name: "work", plan: "pro-100" } as const;
  try {
    const engine = await Engine.start(join(root, "stage"));
    expect(await engine.loginSlots(account)).toEqual(["default", "login-2"]);
    await engine.removeLoginSlot(account, "default");
    await engine.close();
    const commands = (await Bun.file(log).text()).trim().split("\n").map((line) => JSON.parse(line));
    expect(commands.map((command) => command.type)).toEqual(["get_protocol_info", "get_provider_accounts", "account_remove"]);
    expect(commands[2]).toMatchObject({ provider: "chatgpt-subscription", name: "default" });
  } finally {
    if (original === undefined) delete process.env.OMO_START_OMO;
    else process.env.OMO_START_OMO = original;
    await rm(root, { recursive: true, force: true });
  }
});

