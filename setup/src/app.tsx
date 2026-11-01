import { Box, Text, useAnimation, useApp, useInput, usePaste, useWindowSize } from "ink";
import { createContext, useContext, useEffect, useReducer, useState } from "react";
import { saveAccounts } from "./answers.ts";
import { preferenceSummary } from "./preferences.ts";
import { detectLang, type Lang, LANG_NAMES, LANGS, type Localized, truncate } from "./i18n.ts";
import { type ApplyOutcome, type LoginOutcome, LoginRunner } from "./login.tsx";
import { ModelsScreen } from "./models.tsx";
import { chainFrom } from "./recommend.ts";
import { AccountsScreen, UsageScreen } from "./accounts.tsx";
import { fetchModels } from "./custom.ts";
import { type ModelSetup, readExcludes } from "./omoconfig.ts";
import { Clickable, HitProvider, useWheel } from "./hit.tsx";
import { AUTO_PLAN, findProvider, KINDS, priceText, PROVIDERS, type Plan, type Provider } from "./providers.ts";
import {
  Card,
  FLOW_MS,
  Frame,
  gradientAt,
  gradientRgb,
  type Hint,
  Hints,
  LangContext,
  mix,
  Spinner,
  toHex,
  useI18n,
  WHITE,
} from "./ui.tsx";
import {
  type Account,
  accountsOf,
  customModels,
  engineProviderOf,
  DEFAULT_CHOICE,
  type ModelsState,
  createInitialState,
  focusedProvider,
  NEXT_INDEX,
  reduce,

  REVIEW_EDIT,
  REVIEW_LOGIN,
  sortedAccounts,
  type Target,
  type WizardState,
} from "./wizard.ts";

const TargetContext = createContext<(target: Target) => void>(() => {});

function useTarget() {
  return useContext(TargetContext);
}

export type DoneResult = {
  readonly path: string;
  readonly lang: Lang;
  readonly outcomes: readonly LoginOutcome[];
  readonly apply: ApplyOutcome;
};

const MIN_COLUMNS = 72;
const MIN_ROWS = 22;
const WIDE_COLUMNS = 100;

function useTicker(limit: number, ms: number): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (tick >= limit) return;
    const timer = setTimeout(() => setTick((t) => t + 1), ms);
    return () => clearTimeout(timer);
  }, [tick, limit, ms]);
  return tick;
}

const LETTER_O = [" ▄█████▄ ", "██     ██", "██     ██", "██     ██", " ▀█████▀ "];
const LETTER_M = ["          ", "██▀▀██▀▀██", "██  ██  ██", "██  ██  ██", "██  ██  ██"];
const LOGO = LETTER_O.map((row, i) => `${row}  ${LETTER_M[i] ?? ""}  ${row}`);
const LOGO_WIDTH = LOGO[0]?.length ?? 1;
const GLINT_MS = 2600;
const STARS = "·✦·⋆·✧·";

function Logo({ time, reveal }: { readonly time: number; readonly reveal: number }) {
  const band = ((time % GLINT_MS) / GLINT_MS) * (LOGO_WIDTH + 30) - 15;
  return (
    <Box flexDirection="column">
      {LOGO.map((row, y) => {
        const rise = Math.max(0, Math.min(1, reveal / 6 - (LOGO.length - 1 - y) * 0.15));
        return (
          <Text key={y}>
            {[...row].map((char, x) => {
              if (char === " " || x >= reveal) return " ";
              const glint = Math.max(0, 1 - Math.abs(x + y * 1.2 - band) / 3.5);
              const base = mix(gradientRgb(x / LOGO_WIDTH - time / FLOW_MS), WHITE, glint * 0.75);
              return (
                <Text key={x} color={toHex(mix(WHITE, base, rise))}>
                  {char}
                </Text>
              );
            })}
          </Text>
        );
      })}
    </Box>
  );
}

function Sparkles({ width, time }: { readonly width: number; readonly time: number }) {
  return (
    <Text>
      {Array.from({ length: width }, (_, x) => {
        const phase = Math.sin(x * 12.9898 + Math.floor(time / 180) * 0.37) * 43758.5453;
        const lit = phase - Math.floor(phase) > 0.93;
        return lit ? (
          <Text key={x} color={gradientAt(x / width + time / 4000)}>
            {STARS[x % STARS.length]}
          </Text>
        ) : (
          " "
        );
      })}
    </Text>
  );
}

function Rule({ width, visible, time }: { readonly width: number; readonly visible: number; readonly time: number }) {
  const center = (width - 1) / 2;
  return (
    <Text>
      {Array.from({ length: width }, (_, x) =>
        Math.abs(x - center) < visible ? (
          <Text key={x} color={gradientAt(x / width - time / FLOW_MS)}>
            ━
          </Text>
        ) : (
          " "
        ),
      )}
    </Text>
  );
}

function Splash() {
  const { m } = useI18n();
  const onTarget = useTarget();
  const { columns, rows } = useWindowSize();
  const { frame, time } = useAnimation({ interval: 50 });
  const title = m.appTitle;
  const done = LOGO_WIDTH + title.length + 8;
  const reveal = useTicker(done, 16);
  const typed = Math.max(0, Math.min(title.length, reveal - LOGO_WIDTH));
  const ready = reveal >= done;
  const pulse = (Math.sin(time / 350) + 1) / 2;
  const lit = Math.floor(frame / 3) % 3;
  return (
    <Box flexDirection="column" width={columns} height={rows - 1}>
      <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center">
        <Sparkles width={Math.min(columns - 4, LOGO_WIDTH + 24)} time={time} />
        <Box marginY={1}>
          <Logo time={time} reveal={reveal} />
        </Box>
        <Rule width={LOGO_WIDTH + 8} visible={Math.min(reveal, LOGO_WIDTH) / 2 + 4} time={time} />
        <Box marginTop={1} width={title.length + 1}>
          <Text bold>
            {[...title.slice(0, typed)].map((char, i) => (
              <Text key={i} {...(ready ? { color: gradientAt(i / title.length - time / FLOW_MS) } : {})}>
                {char}
              </Text>
            ))}
            {typed < title.length && typed > 0 ? <Text color="cyan">▍</Text> : null}
          </Text>
        </Box>
        <Box height={1}>{ready ? <Text dimColor>{m.splashTagline}</Text> : null}</Box>
        <Box height={1} marginTop={2}>
          {ready ? (
            <Clickable onPress={() => onTarget({ kind: "start" })} gap={1}>
              <Text>
                {[0, 1, 2].map((i) => (
                  <Text key={i} color="cyan" dimColor={i !== lit}>
                    ›
                  </Text>
                ))}
              </Text>
              {m.pressBefore ? <Text>{m.pressBefore}</Text> : null}
              <Text backgroundColor={toHex(mix(gradientRgb(time / 3000), WHITE, pulse * 0.25))} color="#ffffff" bold>
                {" Enter "}
              </Text>
              <Text>{m.pressAfter}</Text>
            </Clickable>
          ) : null}
        </Box>
        <Box marginTop={1}>
          <Sparkles width={Math.min(columns - 4, LOGO_WIDTH + 24)} time={time + 900} />
        </Box>
      </Box>
      <Box justifyContent="center">
        <Hints hints={[["q", m.keys.quit]]} />
      </Box>
    </Box>
  );
}

function TooSmall() {
  const { m } = useI18n();
  const { columns, rows } = useWindowSize();
  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color="yellow" bold>
        {m.tooSmallTitle}
      </Text>
      <Text>{m.tooSmallBody(columns, rows, MIN_COLUMNS, MIN_ROWS)}</Text>
      <Text dimColor>{m.tooSmallHint}</Text>
    </Box>
  );
}

function LanguagePicker({ cursor }: { readonly cursor: number }) {
  const { m } = useI18n();
  const onTarget = useTarget();
  return (
    <Frame
      step={0}
      title={m.languageTitle}
      subtitle={m.languageSubtitle}
      width={60}
      hints={[
        ["←→", m.keys.move],
        ["Enter", m.keys.select],
        ["Esc", m.keys.back],
        [m.mouseKey, m.mouseHint],
      ]}
    >
      <Box gap={2}>
        {LANGS.map((code, i) => {
          const active = i === cursor;
          return (
            <Clickable key={code} onPress={() => onTarget({ kind: "lang", index: i })}>
              <Card active={active} width={27}>
                <Text>
                  <Text color={active ? "cyan" : "gray"}>{active ? "● " : "○ "}</Text>
                  <Text bold {...(active ? { color: "cyan" } : {})}>
                    {LANG_NAMES[code].native}
                  </Text>
                </Text>
                <Box marginLeft={2}>
                  <Text dimColor>{LANG_NAMES[code].gloss}</Text>
                </Box>
              </Card>
            </Clickable>
          );
        })}
      </Box>
    </Frame>
  );
}

function planLabel(plan: Plan, lang: "ko" | "en", t: (localized: Localized) => string): string {
  const price = priceText(plan, lang);
  return price ? `${t(plan.label)} (${price})` : t(plan.label);
}

function Review({ accounts, cursor }: { readonly accounts: readonly Account[]; readonly cursor: number }) {
  const { m, t, lang } = useI18n();
  const onTarget = useTarget();
  const { columns } = useWindowSize();
  const wide = columns >= WIDE_COLUMNS;
  const nameWidth = wide ? 22 : 18;
  const accountWidth = wide ? 18 : 14;
  const planWidth = wide ? 32 : 20;
  return (
    <Frame
      step={3}
      title={m.reviewTitle}
      subtitle={m.reviewSubtitle}
      hints={[
        ["←→", m.keys.move],
        ["Enter", m.keys.select],
        ["Esc", m.keys.back],
        [m.mouseKey, m.mouseHint],
      ]}
    >
      <Card>
        <Box gap={2}>
          <Text> </Text>
          <Box width={nameWidth}>
            <Text dimColor>{m.colProvider}</Text>
          </Box>
          <Box width={accountWidth}>
            <Text dimColor>{m.colAccount}</Text>
          </Box>
          <Box width={planWidth}>
            <Text dimColor>{m.colPlan}</Text>
          </Box>
          {wide ? <Text dimColor>{m.colMethod}</Text> : null}
        </Box>
        {sortedAccounts(accounts).map((account) => {
          const provider = findProvider(account.provider);
          const plan = provider.plans.find((p) => p.id === account.plan);
          return (
            <Box key={account.key} gap={2}>
              <Text color={provider.kind === "oauth" ? "magenta" : "cyan"}>{provider.kind === "oauth" ? "◆" : "◇"}</Text>
              <Box width={nameWidth}>
                <Text bold>{truncate(provider.name, nameWidth)}</Text>
              </Box>
              <Box width={accountWidth}>
                <Text>{truncate(account.name, accountWidth)}</Text>
              </Box>
              <Box width={planWidth}>
                <Text color="green" wrap="truncate-end">{plan ? planLabel(plan, lang, t) : "-"}</Text>
              </Box>
              {wide ? <Text dimColor>{m.tabs[provider.kind]}</Text> : null}
            </Box>
          );
        })}
      </Card>
      <Box marginTop={1} gap={2}>
        {[
          [REVIEW_EDIT, `← ${m.keys.edit}`, "gray"],
          [REVIEW_LOGIN, `${m.keys.login} →`, "green"],
        ].map(([index, label, tone]) => (
          <Clickable key={String(index)} onPress={() => onTarget({ kind: "review", index: Number(index) })}>
            <Text
              bold
              {...(cursor === index ? { backgroundColor: tone === "green" ? "green" : "cyan", color: "black" } : { dimColor: true })}
            >
              {` ${label} `}
            </Text>
          </Clickable>
        ))}
      </Box>
    </Frame>
  );
}

export function toSetup(models: ModelsState, accounts: readonly Account[]): ModelSetup {
  const customs = accounts.flatMap((account) =>
    account.custom
      ? [{ id: engineProviderOf(account), baseUrl: account.custom.baseUrl, api: account.custom.api, models: customModels(account.custom) }]
      : [],
  );
  return {
    slots: models.picks.map((pick) => {
      const sel = models.selected[pick.slot.id] ?? DEFAULT_CHOICE;
      return { slotId: pick.slot.id, kind: pick.slot.kind, chain: sel >= 0 ? chainFrom(pick.options, sel) : [] };
    }),
    defaultLane: models.defaultLane,
    turbo: models.turbo && models.turboOn ? models.turbo.main : null,
    customs,
    profiles: models.profilesOn ? models.providerProfiles.map((profile) => {
      const defaultLane = models.defaultLane ?? profile.defaultLane;
      const main = profile.slots.find((slot) => slot.slotId === defaultLane)?.chain[0] ?? profile.main;
      return { ...profile, defaultLane, main };
    }) : [],
  };
}

function Screen({
  state,
  onLogin,
}: {
  readonly state: WizardState;
  readonly onLogin: (outcomes: readonly LoginOutcome[], apply: ApplyOutcome) => void;
}) {
  const { m } = useI18n();
  const onTarget = useTarget();
  switch (state.stage) {
    case "intro":
      return <Splash />;
    case "language":
      return <LanguagePicker cursor={state.langCursor} />;
    case "usage":
      return <UsageScreen state={state} onTarget={onTarget} />;
    case "accounts":
      return <AccountsScreen state={state} onTarget={onTarget} />;
    case "models":
      return state.models ? <ModelsScreen models={state.models} accounts={state.accounts} usage={preferenceSummary(state, state.lang)} onTarget={onTarget} /> : null;
    case "review":
      return <Review accounts={state.accounts} cursor={state.reviewCursor} />;
    case "saving":
      return (
        <Frame step={3} hints={[]} width={60}>
          <Box gap={1} justifyContent="center">
            <Spinner />
            <Text>{m.savingTitle}</Text>
          </Box>
        </Frame>
      );
    case "login":
      return (
        <LoginRunner
          accounts={state.accounts}
          savedPath={state.savedPath ?? ""}
          setup={state.models ? toSetup(state.models, state.accounts) : null}
          onFinish={onLogin}
        />
      );
    case "failed":
      return (
        <Frame step={3} hints={[["Enter", m.keys.quit]]} width={72}>
          <Box flexDirection="column" alignItems="center">
            <Text color="red" bold>
              {`✖  ${m.failedTitle}`}
            </Text>
            <Text>{state.error}</Text>
          </Box>
        </Frame>
      );
    case "exit":
      return null;
  }
}

export function App({ onDone }: { readonly onDone?: (result: DoneResult) => void }) {
  const { exit } = useApp();
  const { columns, rows } = useWindowSize();
  const [state, dispatch] = useReducer(reduce, detectLang(), createInitialState);
  useInput(
    (input, key) => {
      dispatch({ type: "key", input, flags: key });
    },
    { isActive: state.stage !== "login" },
  );
  useWheel((delta) => dispatch({ type: "wheel", delta }), state.stage !== "login");
  const onTarget = (target: Target) => dispatch({ type: "click", target });

  usePaste((text) => dispatch({ type: "paste", text }), { isActive: state.stage === "accounts" && state.editing !== null });

  const loading = state.accounts.filter((a) => a.custom?.fetch === "loading");
  const loadingKey = loading.map((a) => `${a.key}:${a.custom?.baseUrl}:${a.custom?.api}:${a.custom?.key.length}`).join("|");
  useEffect(() => {
    const controller = new AbortController();
    for (const account of loading) {
      const spec = account.custom;
      if (!spec) continue;
      fetchModels(spec.baseUrl, spec.api, spec.key, controller.signal).then((result) => {
        if (controller.signal.aborted) return;
        dispatch(
          result.ok
            ? { type: "customFetched", key: account.key, ids: result.ids, error: null }
            : { type: "customFetched", key: account.key, ids: null, error: result.error },
        );
      });
    }
    return () => controller.abort();
  }, [loadingKey]);

  useEffect(() => {
    readExcludes().then(
      (excludes) => dispatch({ type: "excludes", excludes }),
      () => {},
    );
  }, []);

  useEffect(() => {
    if (state.stage !== "saving") return;
    saveAccounts(state.accounts, undefined, { freeFirst: state.freeFirst, reasoningPolicy: state.reasoningPolicy, allowExpensive: state.allowExpensive === true }).then(
      (path) => dispatch({ type: "saved", path }),
      (error: unknown) => dispatch({ type: "failed", message: error instanceof Error ? error.message : String(error) }),
    );
  }, [state.stage]);

  useEffect(() => {
    if (state.stage !== "exit") return;
    if (state.error) exit(new Error(state.error));
    else exit();
  }, [state.stage]);

  const onLogin = (outcomes: readonly LoginOutcome[], apply: ApplyOutcome) => {
    if (state.savedPath) onDone?.({ path: state.savedPath, lang: state.lang, outcomes, apply });
    dispatch({ type: "exit" });
  };

  const uiLang = state.stage === "language" ? (LANGS[state.langCursor] ?? state.lang) : state.lang;
  const tooSmall = columns < MIN_COLUMNS || rows < MIN_ROWS;
  return (
    <LangContext.Provider value={uiLang}>
      <TargetContext.Provider value={onTarget}>
        <HitProvider>{tooSmall ? <TooSmall /> : <Box key={state.stage} flexGrow={1}><Screen state={state} onLogin={onLogin} /></Box>}</HitProvider>
      </TargetContext.Provider>
    </LangContext.Provider>
  );
}
