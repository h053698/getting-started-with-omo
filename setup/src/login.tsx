import { Box, Text, useAnimation, useInput, usePaste, useWindowSize } from "ink";
import { useEffect, useRef, useState } from "react";
import { dirname, join } from "node:path";
import { agentDir, autoAnswerFor, deviceLogin, Engine, type LoginResult, type LoginView, openInBrowser, reconcileLoginSlots, stagedLoginSlots } from "./engine.ts";
import { type ApplyResult, applyStaged, type Change, discardStaging, previewApply, resetStaging, StoreBusyError } from "./stage.ts";
import { type ApplyConfigResult, applySetup, type ModelSetup, omoConfigPath, preflightSetup, previewChanges, turbomodeExtensionPath } from "./omoconfig.ts";
import { truncate } from "./i18n.ts";
import { findProvider } from "./providers.ts";
import { copyText } from "./clipboard.ts";
import { Clickable } from "./hit.tsx";
import { type Identity, identify } from "./identity.ts";
import { MarqueeText } from "./marquee.tsx";
import { Card, Frame, gradientAt, type Hint, Spinner, useI18n } from "./ui.tsx";
import { type Account, engineProviderOf, sortedAccounts } from "./wizard.ts";

export type LoginStatus = "pending" | "active" | "done" | "skipped" | "failed";

export type LoginOutcome = { readonly account: Account; readonly status: LoginStatus; readonly detectedPlan?: string };

export type ApplyOutcome =
  | { readonly kind: "applied"; readonly result: ApplyResult | null; readonly target: string; readonly config: ApplyConfigResult | null }
  | { readonly kind: "kept"; readonly staged: string }
  | { readonly kind: "none" };

type Step =
  | { readonly kind: "engine" }
  | { readonly kind: "engine-failed"; readonly error: string }
  | { readonly kind: "key"; readonly error: string | null; readonly checking: boolean }
  | { readonly kind: "domain" }
  | { readonly kind: "chatgpt-method" }
  | { readonly kind: "oauth"; readonly view: LoginView }
  | { readonly kind: "result"; readonly ok: boolean; readonly error: string | null }
  | { readonly kind: "finished" }
  | { readonly kind: "applying" }
  | { readonly kind: "apply-failed"; readonly error: string };

type Run = { readonly cancel: () => void };

type ButtonId = "previous" | "next" | "retry" | "reviewLogins" | "skip" | "submit" | "finish" | "apply" | "keep" | "copyCode" | "copyUrl" | "browserLogin" | "deviceLogin";

function Button({
  label,
  active,
  tone,
  onPress,
}: {
  readonly label: string;
  readonly active: boolean;
  readonly tone: "green" | "cyan" | "gray";
  readonly onPress: () => void;
}) {
  return (
    <Clickable onPress={onPress}>
      <Text bold {...(active ? { backgroundColor: tone, color: "black" } : { color: tone })}>
        {` ${label} `}
      </Text>
    </Clickable>
  );
}

const needsDomain = (account: Account) => account.provider === "github-copilot" && account.plan === "enterprise";

function mask(value: string): string {
  if (value.length <= 8) return "•".repeat(value.length);
  return `${value.slice(0, 4)}${"•".repeat(Math.min(20, value.length - 8))}${value.slice(-4)}`;
}

function StatusMark({ status }: { readonly status: LoginStatus }) {
  switch (status) {
    case "active":
      return <Spinner />;
    case "done":
      return <Text color="green">✔</Text>;
    case "failed":
      return <Text color="red">✖</Text>;
    case "skipped":
      return <Text dimColor>–</Text>;
    case "pending":
      return <Text dimColor>○</Text>;
  }
}

function Field({ value, masked, placeholder }: { readonly value: string; readonly masked: boolean; readonly placeholder?: string }) {
  const { frame } = useAnimation({ interval: 500 });
  return (
    <Box borderStyle="round" borderColor="cyan" paddingX={1}>
      <Box flexGrow={1}>
        {value === "" && placeholder ? (
          <Text dimColor>{placeholder}</Text>
        ) : (
          <Text wrap="truncate-start">{masked ? mask(value) : value}</Text>
        )}
      </Box>
      <Text color="cyan">{frame % 2 === 0 ? "▍" : " "}</Text>
    </Box>
  );
}

function DeviceCode({ code }: { readonly code: string }) {
  const { time } = useAnimation({ interval: 120 });
  return (
    <Box borderStyle="double" borderColor="magenta" paddingX={3} alignSelf="flex-start">
      <Text bold>
        {[...code].map((char, i) => (
          <Text key={i} color={gradientAt(i / code.length - time / 2400)}>
            {char}
          </Text>
        ))}
      </Text>
    </Box>
  );
}

function Waiting({ label }: { readonly label: string }) {
  return (
    <Box gap={1}>
      <Spinner />
      <Text dimColor>{label}</Text>
    </Box>
  );
}

export function LoginRunner({
  accounts,
  savedPath,
  setup,
  onFinish,
}: {
  readonly accounts: readonly Account[];
  readonly savedPath: string;
  readonly setup: ModelSetup | null;
  readonly onFinish: (outcomes: readonly LoginOutcome[], apply: ApplyOutcome) => void;
}) {
  const { m, t, lang } = useI18n();
  const { columns, rows } = useWindowSize();
  const compact = rows < 32;
  const queue = useRef(sortedAccounts(accounts)).current;
  const [statuses, setStatuses] = useState<readonly LoginStatus[]>(() => queue.map(() => "pending"));
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [step, setStep] = useState<Step>({ kind: "engine" });
  const [buffer, setBuffer] = useState("");
  const [buttonCursor, setButtonCursor] = useState(0);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [staging, setStaging] = useState<string | null>(null);
  const [changes, setChanges] = useState<readonly Change[]>([]);
  const [identities, setIdentities] = useState<Readonly<Record<number, Identity>>>({});
  const [copied, setCopied] = useState<ButtonId | null>(null);
  const stableStatuses = useRef<LoginStatus[]>(queue.map(() => "pending"));
  const slotByAccount = useRef(new Map<number, string>());
  const slotsBeforeLogin = useRef(new Map<number, Promise<readonly string[]>>());
  const directLogin = useRef(new Set<number>());
  const run = useRef<Run | null>(null);
  const pendingRun = useRef<Promise<unknown> | null>(null);
  const token = useRef(0);
  const lastUrl = useRef<string | null>(null);
  const domain = useRef<string | null>(null);
  const opened = useRef(new Set<string>());

  const current = queue[index];
  const provider = current ? findProvider(current.provider) : undefined;

  const setStatus = (at: number, status: LoginStatus) => {
    if (status !== "active") stableStatuses.current[at] = status;
    setStatuses((list) => list.map((s, i) => (i === at ? status : s)));
  };

  useEffect(() => {
    let alive = true;
    let started: Engine | null = null;
    resetStaging()
      .then((dir) => {
        if (alive) setStaging(dir);
        return Engine.start(dir);
      })
      .then(
      (ready) => {
        started = ready;
        if (alive) setEngine(ready);
        else void ready.close();
      },
      (error: unknown) => {
        if (alive) setStep({ kind: "engine-failed", error: error instanceof Error ? error.message : String(error) });
      },
    );
    return () => {
      alive = false;
      run.current?.cancel();
      void started?.close();
    };
  }, []);

  const showView = (mine: number, view: LoginView) => {
    if (mine !== token.current) return;
    if (view.kind === "browser" || view.kind === "device") {
      lastUrl.current = view.url;
      if (!opened.current.has(view.url)) {
        opened.current.add(view.url);
        openInBrowser(view.url);
      }
    }
    setBuffer("");
    setStep({ kind: "oauth", view });
  };

  const settle = async (mine: number, at: number, result: LoginResult) => {
    if (mine !== token.current) return;
    run.current = null;
    const previous = stableStatuses.current[at] ?? "pending";
    const account = queue[at];
    let finalResult = result;
    if (result.ok && account && staging && !account.custom) {
      try {
        const before = await (slotsBeforeLogin.current.get(account.key) ?? Promise.resolve([]));
        const after = directLogin.current.delete(account.key)
          ? await stagedLoginSlots(account, staging)
          : await engine?.loginSlots(account) ?? [];
        const old = slotByAccount.current.get(account.key);
        const reconciled = reconcileLoginSlots(before, after, old);
        if (reconciled.remove) await engine?.removeLoginSlot(account, reconciled.remove);
        if (reconciled.current) slotByAccount.current.set(account.key, reconciled.current);
      } catch (error) {
        finalResult = { ok: false, error: error instanceof Error ? error.message : String(error) };
      }
    }
    if (mine !== token.current) return;
    setStatus(at, finalResult.ok ? "done" : previous === "done" ? "done" : "failed");
    setStep({ kind: "result", ok: finalResult.ok, error: finalResult.ok ? null : finalResult.error });
    if (finalResult.ok && account && staging) {
      identify(account, staging).then(
        (found) => {
          if (found && (found.email || found.plan)) setIdentities((all) => ({ ...all, [account.key]: found }));
        },
        () => {},
      );
    }
  };

  const beginOAuth = async (account: Account, at: number, method: "browser" | "device" = "browser") => {
    if (!engine || !staging) return;
    const mine = ++token.current;
    setStep({ kind: "oauth", view: { kind: "starting" } });
    lastUrl.current = null;
    const direct = account.provider === "github-copilot" || (account.provider === "chatgpt-subscription" && method === "device");
    if (direct) slotsBeforeLogin.current.set(account.key, stagedLoginSlots(account, staging));
    try {
      await slotsBeforeLogin.current.get(account.key);
    } catch {}
    if (mine !== token.current) return;
    const onView = (view: LoginView) => showView(mine, view);
    const handle =
      direct
        ? deviceLogin(account, domain.current, staging, { onView })
        : engine.oauthLogin(account, autoAnswerFor(account, domain.current), { onView });
    if (direct) directLogin.current.add(account.key);
    run.current = handle;
    pendingRun.current = handle.result;
    handle.result.then((result) => void settle(mine, at, result));
  };

  useEffect(() => {
    if (!engine) return;
    if (!current || !provider) {
      if (!staging) return;
      previewApply(agentDir(), customAuth).then(
        (list) => {
          setChanges(list);
          setStep({ kind: "finished" });
        },
        (error: unknown) => setStep({ kind: "apply-failed", error: error instanceof Error ? error.message : String(error) }),
      );
      return;
    }
    let alive = true;
    const previous = pendingRun.current;
    pendingRun.current = null;
    setStatus(index, "active");
    setBuffer("");
    domain.current = null;
    if (!current.custom) slotsBeforeLogin.current.set(current.key, engine.loginSlots(current));
    setStep({ kind: "oauth", view: { kind: "starting" } });
    Promise.resolve(previous).then(() => {
      if (!alive) return;
      if (provider.kind === "custom") {
        const ok = Boolean(current.custom?.key && current.custom.fetch === "ok");
        setStatus(index, ok ? "done" : "failed");
        setStep({ kind: "result", ok, error: ok ? null : m.fetchError(current.custom?.fetchError ?? m.fetchIdle) });
        return;
      }
      if (provider.kind === "api_key") setStep({ kind: "key", error: null, checking: false });
      else if (current.provider === "chatgpt-subscription") setStep({ kind: "chatgpt-method" });
      else if (needsDomain(current)) setStep({ kind: "domain" });
      else beginOAuth(current, index);
    });
    return () => {
      alive = false;
    };
  }, [engine, index, attempt]);

  const visit = (at: number) => {
    if (at < 0 || at >= queue.length || step.kind === "applying") return;
    token.current += 1;
    run.current?.cancel();
    run.current = null;
    setStatuses((list) => list.map((status, i) => (i === index && status === "active" ? stableStatuses.current[i] ?? "pending" : status)));
    if (at === index) setAttempt((n) => n + 1);
    else setIndex(at);
  };

  const next = () => setIndex((i) => i + 1);

  const skip = () => {
    token.current += 1;
    run.current?.cancel();
    run.current = null;
    setStatus(index, stableStatuses.current[index] === "done" ? "done" : "skipped");
    next();
  };

  const submit = () => {
    if (!current || !engine) return;
    const value = buffer.trim();
    if (step.kind === "key") {
      if (value === "" || step.checking) return;
      setStep({ kind: "key", error: null, checking: true });
      const at = index;
      const mine = ++token.current;
      Promise.resolve(slotsBeforeLogin.current.get(current.key)).then(() => engine.saveApiKey(current, value)).then((result) => {
        if (mine !== token.current) return;
        if (result.ok) {
          setBuffer("");
          void settle(mine, at, result);
        } else {
          setStep({ kind: "key", error: result.error === "rejected" ? m.keyRejected : result.error, checking: false });
        }
      });
      return;
    }
    if (step.kind === "domain") {
      domain.current = value;
      setBuffer("");
      setStep({ kind: "oauth", view: { kind: "starting" } });
      beginOAuth(current, index);
      return;
    }
    if (step.kind === "oauth" && step.view.kind === "input") {
      engine.answer(step.view.id, value);
      setBuffer("");
      setStep({ kind: "oauth", view: { kind: "starting" } });
    }
  };

  const typing =
    (step.kind === "key" && !step.checking) ||
    step.kind === "domain" ||
    (step.kind === "oauth" && step.view.kind === "input");

  usePaste((text) => setBuffer((value) => value + text.replace(/[\r\n]+/g, "").trim()), { isActive: typing });

  const outcomes = (): LoginOutcome[] =>
    queue.map((account, i) => {
      const detectedPlan = identities[account.key]?.plan;
      return { account, status: statuses[i] ?? "pending", ...(detectedPlan ? { detectedPlan } : {}) };
    });
  const okCount = statuses.filter((s) => s === "done").length;

  const stopEngine = async () => {
    run.current?.cancel();
    await engine?.close();
  };

  const configChanges = setup ? previewChanges(setup) : [];
  const customAuth = Object.fromEntries(
    queue.flatMap((account, i) =>
      account.custom && statuses[i] === "done" ? [[engineProviderOf(account), { type: "api_key", key: account.custom.key }]] : [],
    ),
  );
  const anythingToApply = okCount > 0 || configChanges.length > 0;

  const keep = () => {
    if (!anythingToApply || !staging) {
      void stopEngine()
        .then(discardStaging)
        .then(() => onFinish(outcomes(), { kind: "none" }));
      return;
    }
    void stopEngine().then(() => onFinish(outcomes(), { kind: "kept", staged: staging }));
  };

  const finish = keep;

  const apply = () => {
    setStep({ kind: "applying" });
    const target = agentDir();
    stopEngine()
      .then(async () => {
        if (setup) await preflightSetup(setup);
        const result = okCount > 0 ? await applyStaged(target, new Date(), customAuth) : null;
        const config = setup && configChanges.length > 0 ? await applySetup(setup, target) : null;
        if (!result) await discardStaging();
        return { result, config };
      })
      .then(
      ({ result, config }) => onFinish(outcomes(), { kind: "applied", result, target, config }),
      (error: unknown) =>
        setStep({
          kind: "apply-failed",
          error: error instanceof StoreBusyError ? m.storeBusy : error instanceof Error ? error.message : String(error),
        }),
    );
  };

  const buttons: readonly ButtonId[] = (() => {
    switch (step.kind) {
      case "engine":
        return ["finish"];
      case "engine-failed":
        return ["finish"];
      case "finished":
        return anythingToApply ? ["reviewLogins", "apply", "keep"] : ["reviewLogins", "finish"];
      case "applying":
        return [];
      case "apply-failed":
        return ["apply", "keep"];
      case "result":
        return [...(index > 0 ? ["previous" as const] : []), "retry", "next"];
      case "chatgpt-method":
        return [...(index > 0 ? ["previous" as const] : []), "browserLogin", "deviceLogin", "skip"];
      default: {
        if (typing) return ["submit", "skip"];
        const view = step.kind === "oauth" ? step.view : null;
        const back = index > 0 ? ["previous" as const] : [];
        if (view?.kind === "device") return [...back, "copyCode", "copyUrl", "skip"];
        if (view?.kind === "browser" || lastUrl.current) return [...back, "copyUrl", "skip"];
        return [...back, "skip"];
      }
    }
  })();

  const copy = (id: ButtonId) => {
    const view = step.kind === "oauth" ? step.view : null;
    const value = id === "copyCode" && view?.kind === "device" ? view.code : view && "url" in view ? view.url : lastUrl.current;
    if (!value) return;
    void copyText(value).then(() => {
      setCopied(id);
      setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500);
    });
  };

  useEffect(() => {
    const oauthView = step.kind === "oauth" ? step.view : null;
    const preferred = step.kind === "result"
      ? step.ok ? "next" : "retry"
      : step.kind === "finished" || step.kind === "apply-failed"
        ? anythingToApply ? "apply" : "finish"
        : step.kind === "chatgpt-method"
          ? "browserLogin"
          : oauthView?.kind === "device"
            ? "copyCode"
            : oauthView?.kind === "browser" || lastUrl.current
              ? "copyUrl"
        : buttons[0] ?? "finish";
    setButtonCursor(Math.max(0, buttons.indexOf(preferred)));
  }, [step.kind, index]);

  const press = (id: ButtonId) => {
    switch (id) {
      case "previous":
        visit(index - 1);
        return;
      case "reviewLogins":
        visit(0);
        return;
      case "finish":
        finish();
        return;
      case "next":
        next();
        return;
      case "retry":
        visit(index);
        return;
      case "skip":
        skip();
        return;
      case "submit":
        submit();
        return;
      case "apply":
        apply();
        return;
      case "keep":
        keep();
        return;
      case "copyCode":
      case "copyUrl":
        copy(id);
        return;
      case "browserLogin":
      case "deviceLogin":
        if (current) beginOAuth(current, index, id === "deviceLogin" ? "device" : "browser");
        return;
    }
  };

  useInput((input, key) => {
    if (key.escape) {
      if (step.kind === "applying") return;
      if (step.kind === "engine" || step.kind === "engine-failed" || step.kind === "finished" || step.kind === "apply-failed") keep();
      else if (step.kind === "result") next();
      else skip();
      return;
    }
    if (key.leftArrow || key.upArrow) {
      setButtonCursor((c) => (c - 1 + buttons.length) % buttons.length);
      return;
    }
    if (key.rightArrow || key.downArrow) {
      setButtonCursor((c) => (c + 1) % buttons.length);
      return;
    }
    if (key.return) {
      if (typing) submit();
      else {
        const id = buttons[buttonCursor] ?? buttons[0];
        if (id) press(id);
      }
      return;
    }
    if (!typing) return;
    if (key.backspace || key.delete) setBuffer((value) => value.slice(0, -1));
    else if (input && !key.ctrl && !key.meta && !key.tab) setBuffer((value) => value + input.replace(/[\r\n]/g, ""));
  });

  const buttonLabel: Record<ButtonId, string> = {
    previous: m.keys.previousAccount,
    next: m.keys.next,
    retry: m.keys.retry,
    reviewLogins: m.keys.reviewLogins,
    skip: m.keys.skip,
    submit: m.keys.submit,
    finish: m.keys.finish,
    apply: m.keys.apply,
    keep: m.keys.keep,
    copyCode: copied === "copyCode" ? `✔ ${m.keys.copied}` : `⧉ ${m.keys.copyCode}`,
    copyUrl: copied === "copyUrl" ? `✔ ${m.keys.copied}` : `⧉ ${m.keys.copyUrl}`,
    browserLogin: lang === "ko" ? "브라우저 URL로 로그인" : "Log in with browser URL",
    deviceLogin: lang === "ko" ? "기기 코드로 로그인" : "Log in with device code",
  };
  const buttonTone: Record<ButtonId, "green" | "cyan" | "gray"> = {
    apply: "green",
    keep: "gray",
    copyCode: "cyan",
    copyUrl: "cyan",
    next: "green",
    retry: "cyan",
    skip: "gray",
    submit: "green",
    finish: "green",
    browserLogin: "cyan",
    deviceLogin: "cyan",
    previous: "gray",
    reviewLogins: "cyan",
  };

  const wide = columns >= 100;
  const listWidth = wide ? 48 : Math.max(30, columns - 10);
  const contentWidth = Math.min(108, columns - 4);
  const detailTextWidth = Math.max(10, wide ? contentWidth - listWidth - 13 : contentWidth - 12);
  const finishedView = step.kind === "finished" || step.kind === "applying" || step.kind === "apply-failed";

  const hints: Hint[] = typing
    ? [
        ["Enter", m.keys.submit],
        ["Esc", m.keys.skip],
        [m.mouseKey, m.mouseHint],
      ]
    : [
        ["←→", m.keys.move],
        ["Enter", m.keys.select],
        ["Esc", m.keys.skip],
        [m.mouseKey, m.mouseHint],
      ];

  const list = wide && !finishedView ? (
    <Card width={listWidth}>
      <Text dimColor wrap="wrap">{m.loginRevisitHint}</Text>
      <Box marginBottom={1} />
      {queue.map((account, i) => {
        const p = findProvider(account.provider);
        const plan = p.plans.find((x) => x.id === account.plan);
        const status = statuses[i] ?? "pending";
        const found = identities[account.key];
        const tail = found?.plan ?? (plan ? t(plan.label) : m.tabs[p.kind]);
        const label = `${p.name} · ${account.name}`;
        const labelWidth = Math.max(4, listWidth - Bun.stringWidth(tail) - 9);
        const here = i === index;
        return (
          <Clickable key={account.key} onPress={() => visit(i)} flexDirection="column">
            <Box gap={1}>
              <StatusMark status={status} />
              <MarqueeText text={label} width={labelWidth} active={here} bold={here} {...(here ? { color: "cyan" } : {})} />
              <Text {...(found?.plan ? { color: "green", bold: true } : { dimColor: true })}>{tail}</Text>
            </Box>
            {found?.email ? (
              <Box marginLeft={2}>
                <MarqueeText text={found.email} width={Math.max(8, listWidth - 9)} active={here} dimColor />
              </Box>
            ) : null}
          </Clickable>
        );
      })}
    </Card>
  ) : (
    <Box gap={1} marginBottom={1}>
      {queue.map((account, i) => (
        <Clickable key={account.key} onPress={() => visit(i)}>
          <StatusMark status={statuses[i] ?? "pending"} />
        </Clickable>
      ))}
      <Text dimColor>{`${Math.min(index + 1, queue.length)}/${queue.length}`}</Text>
    </Box>
  );

  const body = (() => {
    if (step.kind === "engine") return <Waiting label={m.startingEngine} />;
    if (step.kind === "engine-failed")
      return (
        <>
          <Text color="red" bold>{`✖ ${m.engineMissing}`}</Text>
          <Text dimColor wrap="truncate-end">
            {step.error}
          </Text>
        </>
      );
    if (step.kind === "finished" || step.kind === "applying" || step.kind === "apply-failed") {
      const authShown = compact ? changes.slice(0, 2) : changes;
      const reserved = 18 + (okCount > 0 ? 7 + authShown.length : 2) + (setup?.turbo ? 1 : 0) + (setup?.profiles?.length ? 2 : 0);
      const configShown = configChanges.slice(0, Math.max(1, rows - reserved));
      const rowWidth = Math.max(40, columns - 28);
      return (
        <>
          <Text color={okCount > 0 ? "green" : "yellow"} bold>
            {`${okCount > 0 ? "✔" : "!"} ${m.loginDone(okCount, queue.length)}`}
          </Text>
          {configChanges.length > 0 ? (
            <Box marginTop={1} flexDirection="column">
              <Text dimColor>{m.configPreview(omoConfigPath())}</Text>
              {setup?.profiles?.length ? <>
                <Text color="cyan" wrap="truncate-end">{setup.profiles.map((profile) => profile.name).join(" · ")}</Text>
                <Text dimColor wrap="truncate-middle">{`${lang === "ko" ? "절대경로 실행 (PATH 미등록 시)" : "Run by absolute path if not on PATH"}: ${join(dirname(omoConfigPath()), "bin")}/omo-*`}</Text>
              </> : null}
              {configShown.map((change) => {
                const path = truncate(change.path.replace(/^\[native\]\./, ""), 36);
                return (
                  <Box key={change.path}>
                    <Text color="green">{"+ "}</Text>
                    <Box width={38} flexShrink={0}>
                      <Text bold wrap="truncate-end">{path}</Text>
                    </Box>
                    <Text wrap="truncate-end">{truncate(change.summary, Math.max(12, rowWidth - 40))}</Text>
                  </Box>
                );
              })}
              {configChanges.length > configShown.length ? (
                <Text color="yellow">{m.moreChanges(configChanges.length - configShown.length)}</Text>
              ) : null}
              {setup?.turbo ? <Text dimColor wrap="truncate-middle">{m.extensionLine(turbomodeExtensionPath(agentDir()))}</Text> : null}
            </Box>
          ) : null}
          {okCount > 0 ? (
            <>
              <Box marginTop={1}>
                <Text wrap="wrap">{m.stagedNotice}</Text>
              </Box>
              <Box marginTop={1} flexDirection="column">
                <Text dimColor>{m.applyPreview(agentDir())}</Text>
                {authShown.map((change) => (
                  <Text key={change.provider} wrap="truncate-middle">
                    <Text color={change.action === "replace" ? "yellow" : "green"}>
                      {change.action === "replace" ? "↻ " : "+ "}
                    </Text>
                    <Text bold>{change.provider}</Text>
                    <Text dimColor>{` · ${m.changeAction[change.action]} · ${change.accounts.join(", ")}`}</Text>
                  </Text>
                ))}
                {authShown.length < changes.length ? <Text dimColor>{m.moreChanges(changes.length - authShown.length)}</Text> : null}
                <Text dimColor>{m.backupNotice}</Text>
              </Box>
            </>
          ) : (
            <Box marginTop={1}>
              <Text dimColor wrap="wrap">
                {m.nothingStaged}
              </Text>
            </Box>
          )}
          {step.kind === "applying" ? (
            <Box marginTop={1}>
              <Waiting label={m.applying} />
            </Box>
          ) : null}
          {step.kind === "apply-failed" ? (
            <Box marginTop={1}>
              <Text color="red" wrap="wrap">{`✖ ${step.error}`}</Text>
            </Box>
          ) : null}
          <Box marginTop={1}>
            <Text dimColor>{`${m.savedTo} `}</Text>
            <Text wrap="truncate-middle">{savedPath}</Text>
          </Box>
        </>
      );
    }
    if (!current || !provider) return null;
    const heading = (
      <Box marginBottom={1} flexDirection="column">
        <MarqueeText text={`${provider.name} · ${current.name}`} width={detailTextWidth} bold color="cyan" />
        <Text dimColor wrap="truncate-end">
          {t(provider.detail)}
        </Text>
      </Box>
    );
    switch (step.kind) {
      case "chatgpt-method":
        return (
          <>
            {heading}
            <Text bold>{lang === "ko" ? "로그인 방식을 선택하세요" : "Choose how to log in"}</Text>
            <Text dimColor wrap="wrap">{lang === "ko"
              ? "브라우저 URL: 이 컴퓨터에서 브라우저를 열고 로그인합니다."
              : "Browser URL: open a browser on this computer and sign in."}</Text>
            <Text dimColor wrap="wrap">{lang === "ko"
              ? "기기 코드: 표시된 코드를 브라우저에 입력합니다. 다른 기기에서도 가능합니다."
              : "Device code: enter the displayed code in a browser, including on another device."}</Text>
          </>
        );
      case "result":
        return (
          <>
            {heading}
            {step.ok ? (
              <>
                <Text color="green" bold>{`✔ ${m.status.done}`}</Text>
                <Text dimColor>{m.loginResultHint}</Text>
                {identities[current.key] ? (
                  <Box flexDirection="column" marginTop={1}>
                    {identities[current.key]?.email ? (
                      <Box>
                        <Text dimColor>{`${m.detectedEmail}  `}</Text>
                        <MarqueeText text={identities[current.key]?.email ?? ""} width={Math.max(8, detailTextWidth - Bun.stringWidth(m.detectedEmail) - 2)} bold />
                      </Box>
                    ) : null}
                    {identities[current.key]?.plan ? (
                      <Text>
                        <Text dimColor>{`${m.detectedPlan}  `}</Text>
                        <Text bold color="green">
                          {identities[current.key]?.plan}
                        </Text>
                      </Text>
                    ) : null}
                  </Box>
                ) : provider.kind === "oauth" ? (
                  <Box marginTop={1}>
                    <Waiting label={m.detecting} />
                  </Box>
                ) : null}
              </>
            ) : (
              <>
                <Text color="red" bold>{`✖ ${m.status.failed}`}</Text>
                <Text dimColor wrap="wrap">
                  {step.error}
                </Text>
              </>
            )}
          </>
        );
      case "key":
        return (
          <>
            {heading}
            <Text bold>{m.apiKeyPrompt(provider.name)}</Text>
            <Field value={buffer} masked placeholder="sk-..." />
            {step.checking ? (
              <Waiting label={m.checkingKey} />
            ) : step.error ? (
              <Text color="red" wrap="wrap">
                {step.error}
              </Text>
            ) : (
              <Text dimColor>{m.apiKeyHint}</Text>
            )}
          </>
        );
      case "domain":
        return (
          <>
            {heading}
            <Text bold>{m.enterpriseDomain}</Text>
            <Field value={buffer} masked={false} placeholder={m.enterpriseHint} />
          </>
        );
      case "oauth": {
        const view = step.view;
        return (
          <>
            {heading}
            {view.kind === "starting" ? <Waiting label={m.starting} /> : null}
            {view.kind === "device" ? (
              <>
                <Text>{m.deviceCode}</Text>
                <Box marginY={1}>
                  <DeviceCode code={view.code} />
                </Box>
                <MarqueeText text={view.url} width={detailTextWidth} color="magenta" />
                <Box marginTop={1}>
                  <Waiting label={m.waiting} />
                </Box>
              </>
            ) : null}
            {view.kind === "browser" ? (
              <>
                <Text wrap="wrap">{m.openBrowser}</Text>
                <Box marginY={1}>
                  <MarqueeText text={view.url} width={detailTextWidth} color="magenta" />
                </Box>
                <Waiting label={m.waiting} />
              </>
            ) : null}
            {view.kind === "input" || view.kind === "select" ? (
              <>
                {lastUrl.current ? (
                  <>
                    <Text wrap="wrap">{m.openBrowser}</Text>
                    <Box marginY={1}>
                      <MarqueeText text={lastUrl.current} width={detailTextWidth} color="magenta" />
                    </Box>
                  </>
                ) : null}
                <Text dimColor>{m.enginePrompt}</Text>
                <Text bold wrap="wrap">
                  {view.title}
                </Text>
                {view.kind === "input" ? (
                  <Field value={buffer} masked={false} {...(view.placeholder ? { placeholder: view.placeholder } : {})} />
                ) : (
                  view.options.map((option) => (
                    <Text key={option} dimColor>{`· ${option}`}</Text>
                  ))
                )}
              </>
            ) : null}
          </>
        );
      }
    }
  })();

  return (
    <Frame step={3} title={finishedView ? (lang === "ko" ? "마지막으로 확인하고 적용하세요" : "Review and apply") : m.loginTitle} subtitle={finishedView ? undefined : m.loginSubtitle} hints={hints} key={finishedView ? "done" : "run"}>
      <Box gap={wide ? 3 : 0} flexDirection={wide ? "row" : "column"}>
        {finishedView ? null : list}
        <Card grow={wide} active>
          {body}
          <Box marginTop={1} gap={step.kind === "chatgpt-method" ? 1 : 2} flexDirection={step.kind === "chatgpt-method" ? "column" : "row"}>
            {buttons.map((id, i) => (
              <Button
                key={id}
                label={buttonLabel[id]}
                tone={buttonTone[id]}
                active={!typing && i === buttonCursor}
                onPress={() => press(id)}
              />
            ))}
          </Box>
        </Card>
      </Box>
    </Frame>
  );
}
