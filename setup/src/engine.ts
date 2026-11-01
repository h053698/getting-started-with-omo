import { existsSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Account } from "./wizard.ts";
import { findProvider, loginProviderOf } from "./providers.ts";

export type LoginView =
  | { readonly kind: "starting" }
  | { readonly kind: "browser"; readonly url: string }
  | { readonly kind: "device"; readonly url: string; readonly code: string }
  | { readonly kind: "input"; readonly id: string; readonly title: string; readonly placeholder?: string }
  | { readonly kind: "select"; readonly id: string; readonly title: string; readonly options: readonly string[] };

export type LoginResult = { readonly ok: true } | { readonly ok: false; readonly error: string };

export type LoginHandlers = {
  readonly onView: (view: LoginView) => void;
};

type EngineEvent = Record<string, unknown> & { readonly type?: string; readonly id?: string };

export type AutoAnswer = (title: string, options?: readonly string[]) => string | undefined;

const ENTERPRISE_PROMPT = /enterprise/i;
const KIMI_PROMPT = /kimi service/i;
const CHATGPT_METHOD = /login method/i;
const ACCOUNT_NAME = /name for this account/i;
const MOVE_EXISTING = /already exists\. move it here/i;

export function autoAnswerFor(account: Account, enterpriseDomain: string | null): AutoAnswer {
  return (title, options) => {
    if (ACCOUNT_NAME.test(title)) return account.name;
    if (MOVE_EXISTING.test(title)) return "n";
    if (ENTERPRISE_PROMPT.test(title)) return account.plan === "enterprise" ? (enterpriseDomain ?? undefined) : "";
    if (KIMI_PROMPT.test(title) && options) {
      const wanted = findProvider(account.provider).region === "cn" ? /mainland china \(/i : /outside mainland/i;
      return options.find((o) => wanted.test(o));
    }
    if (CHATGPT_METHOD.test(title) && options) return options.find((o) => /browser/i.test(o));
    return undefined;
  };
}

function omoCommand(): string[] {
  const fromEnv = process.env.OMO_START_OMO;
  if (fromEnv) return [fromEnv];
  return ["omo"];
}

export function agentDir(): string {
  return process.env.OMO_CODING_AGENT_DIR ?? join(homedir(), ".omo", "agent");
}

export class Engine {
  private readonly proc: Bun.Subprocess<"pipe", "pipe", "ignore">;
  private readonly listeners = new Set<(event: EngineEvent) => void>();
  private nextId = 1;
  private closed = false;

  private constructor(agentDir: string | undefined) {
    this.proc = Bun.spawn([...omoCommand(), "--mode", "rpc", "--no-session"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "ignore",
      env: agentDir ? { ...process.env, OMO_CODING_AGENT_DIR: agentDir } : process.env,
    });
    void this.readLoop();
  }

  static async start(agentDir?: string): Promise<Engine> {
    const engine = new Engine(agentDir);
    await engine.request({ type: "get_protocol_info" }, 60_000);
    return engine;
  }

  private async readLoop(): Promise<void> {
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of this.proc.stdout) {
      buffer += decoder.decode(chunk, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (!line) continue;
        let event: EngineEvent;
        try {
          event = JSON.parse(line) as EngineEvent;
        } catch {
          continue;
        }
        for (const listener of [...this.listeners]) listener(event);
      }
    }
    this.closed = true;
    for (const listener of [...this.listeners]) listener({ type: "engine_exit" });
  }

  private send(message: Record<string, unknown>): void {
    if (this.closed) return;
    this.proc.stdin.write(`${JSON.stringify(message)}\n`);
    this.proc.stdin.flush();
  }

  private subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  request(command: Record<string, unknown>, timeoutMs = 30_000): Promise<EngineEvent> {
    const id = `start-${this.nextId++}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        stop();
        reject(new Error(`OmO did not answer ${String(command.type)} in time`));
      }, timeoutMs);
      const stop = this.subscribe((event) => {
        if (event.type === "engine_exit") {
          clearTimeout(timer);
          stop();
          reject(new Error("OmO stopped unexpectedly"));
          return;
        }
        if (event.id !== id || event.type !== "response") return;
        clearTimeout(timer);
        stop();
        if (event.success === false) reject(new Error(String(event.error ?? "OmO refused the request")));
        else resolve(event);
      });
      this.send({ ...command, id });
    });
  }

  answer(id: string, value: string | undefined): void {
    this.send(
      value === undefined
        ? { type: "extension_ui_response", id, cancelled: true }
        : { type: "extension_ui_response", id, value },
    );
  }

  async saveApiKey(account: Account, key: string): Promise<LoginResult> {
    const provider = loginProviderOf(findProvider(account.provider));
    try {
      const verify = await this.request({ type: "verify_api_key", provider, key }, 20_000);
      const data = verify.data as { ok?: boolean; reason?: string } | undefined;
      if (data && data.ok === false && data.reason === "rejected") return { ok: false, error: "rejected" };
      await this.request({ type: "login_api_key", provider, key });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  async loginSlots(account: Account): Promise<readonly string[]> {
    const provider = loginProviderOf(findProvider(account.provider));
    const response = await this.request({ type: "get_provider_accounts", provider });
    const data = response.data as { accounts?: readonly { name?: unknown }[] } | undefined;
    return (data?.accounts ?? []).flatMap((entry) => typeof entry.name === "string" ? [entry.name] : []);
  }

  async removeLoginSlot(account: Account, name: string): Promise<void> {
    const provider = loginProviderOf(findProvider(account.provider));
    await this.request({ type: "account_remove", provider, name });
  }

  oauthLogin(account: Account, auto: AutoAnswer, handlers: LoginHandlers): { result: Promise<LoginResult>; cancel: () => void } {
    const provider = loginProviderOf(findProvider(account.provider));
    let settle: (result: LoginResult) => void = () => {};
    const result = new Promise<LoginResult>((resolve) => {
      settle = resolve;
    });
    const stop = this.subscribe((event) => {
      if (event.type === "engine_exit") {
        stop();
        settle({ ok: false, error: "OmO stopped unexpectedly" });
        return;
      }
      if (event.type === "auth_login_url" && event.provider === provider && typeof event.url === "string") {
        handlers.onView({ kind: "browser", url: event.url });
        return;
      }
      if (event.type === "auth_login_end" && event.provider === provider) {
        stop();
        settle(event.success === true ? { ok: true } : { ok: false, error: String(event.error ?? "Login failed") });
        return;
      }
      if (event.type !== "extension_ui_request" || typeof event.id !== "string") return;
      const requestId = event.id;
      const title = typeof event.title === "string" ? event.title : "";
      if (event.method === "input") {
        const answer = auto(title);
        if (answer !== undefined) {
          this.answer(requestId, answer);
          return;
        }
        handlers.onView({
          kind: "input",
          id: requestId,
          title,
          ...(typeof event.placeholder === "string" ? { placeholder: event.placeholder } : {}),
        });
        return;
      }
      if (event.method === "select" && Array.isArray(event.options)) {
        const options = event.options.filter((o): o is string => typeof o === "string");
        const answer = auto(title, options);
        if (answer !== undefined) {
          this.answer(requestId, answer);
          return;
        }
        handlers.onView({ kind: "select", id: requestId, title, options });
      }
    });
    handlers.onView({ kind: "starting" });
    this.request({ type: "login_start", provider }).catch((error: unknown) => {
      stop();
      settle({ ok: false, error: error instanceof Error ? error.message : String(error) });
    });
    return {
      result,
      cancel: () => {
        this.send({ type: "login_cancel", provider, id: `start-cancel-${this.nextId++}` });
      },
    };
  }

  close(): Promise<unknown> {
    if (this.closed) return this.proc.exited;
    this.closed = true;
    this.proc.kill();
    return this.proc.exited;
  }
}

type DeviceCodeInfo = { readonly userCode: string; readonly verificationUri: string };

type InProcessCallbacks = {
  onAuth(info: { url: string }): void;
  onDeviceCode(info: DeviceCodeInfo): void;
  onPrompt(prompt: { message: string; placeholder?: string }): Promise<string>;
  onProgress?(message: string): void;
  onSelect(prompt: { message: string; options: readonly { id: string; label: string }[] }): Promise<string | undefined>;
  signal?: AbortSignal;
};

type InProcessStore = {
  login(providerId: string, callbacks: InProcessCallbacks): Promise<void>;
  listSlots(providerId: string): readonly { readonly name: string }[];
};

function engineModulePath(): string | null {
  const omo = Bun.which(omoCommand()[0] ?? "omo");
  if (!omo) return null;
  const real = realpathSync(omo);
  const candidates = [
    join(real, "..", "..", "..", "@code-yeongyu", "senpi", "dist", "core", "auth-storage.js"),
    join(real, "..", "..", "node_modules", "@code-yeongyu", "senpi", "dist", "core", "auth-storage.js"),
  ];
  return candidates.find((path) => existsSync(path)) ?? null;
}

async function stagedStore(agentDir: string): Promise<InProcessStore> {
  const modulePath = engineModulePath();
  if (!modulePath) throw new Error("OmO engine files were not found");
  const { AuthStorage } = (await import(modulePath)) as { AuthStorage: { create(path: string): InProcessStore } };
  return AuthStorage.create(join(agentDir, "auth.json"));
}

export async function stagedLoginSlots(account: Account, agentDir: string): Promise<readonly string[]> {
  const store = await stagedStore(agentDir);
  return store.listSlots(loginProviderOf(findProvider(account.provider))).map((slot) => slot.name);
}

export function reconcileLoginSlots(
  before: readonly string[],
  after: readonly string[],
  previous: string | undefined,
): { readonly current?: string; readonly remove?: string } {
  const added = after.filter((name) => !before.includes(name));
  const current = added.length === 1 ? added[0] : previous ?? (after.length === 1 ? after[0] : undefined);
  return {
    ...(current ? { current } : {}),
    ...(previous && current && previous !== current && after.includes(previous) ? { remove: previous } : {}),
  };
}

export function deviceLoginSupported(): boolean {
  return engineModulePath() !== null;
}

export function deviceLogin(
  account: Account,
  enterpriseDomain: string | null,
  agentDir: string,
  handlers: LoginHandlers,
): { result: Promise<LoginResult>; cancel: () => void } {
  const controller = new AbortController();
  const result = (async (): Promise<LoginResult> => {
    const modulePath = engineModulePath();
    if (!modulePath) return { ok: false, error: "OmO engine files were not found" };
    try {
      controller.signal.throwIfAborted();
      const store = await stagedStore(agentDir);
      handlers.onView({ kind: "starting" });
      await store.login(loginProviderOf(findProvider(account.provider)), {
        onAuth: (info) => handlers.onView({ kind: "browser", url: info.url }),
        onDeviceCode: (info) => handlers.onView({ kind: "device", url: info.verificationUri, code: info.userCode }),
        onPrompt: async (prompt) => account.provider === "chatgpt-subscription"
          ? autoAnswerFor(account, enterpriseDomain)(prompt.message) ?? ""
          : account.plan === "enterprise" ? (enterpriseDomain ?? "") : "",
        onSelect: async (prompt) => account.provider === "chatgpt-subscription"
          ? prompt.options.find((option) => option.id === "device_code")?.id
          : undefined,
        signal: controller.signal,
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  })();
  return { result, cancel: () => controller.abort() };
}

export function openInBrowser(url: string): void {
  if (process.env.OMO_START_NO_BROWSER === "1") return;
  const opener = process.platform === "darwin" ? "open" : process.platform === "win32" ? "explorer" : "xdg-open";
  if (!Bun.which(opener)) return;
  Bun.spawn([opener, url], { stdout: "ignore", stderr: "ignore" });
}
