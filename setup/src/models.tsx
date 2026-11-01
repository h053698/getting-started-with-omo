import { Box, Text, useWindowSize } from "ink";
import type { SlotKind } from "./catalog.ts";
import { Clickable } from "./hit.tsx";
import { padEnd, truncate } from "./i18n.ts";
import { findProvider } from "./providers.ts";
import { ProfilePanel } from "./profile-panel.tsx";
import { ModelChoiceDetail, providerName } from "./model-detail.tsx";
import { type Choice, prettyModel, reasoningWord, type SlotPick } from "./recommend.ts";
import { Card, Frame, type Hint, useI18n } from "./ui.tsx";
import { ACCEPT_ROW, type Account, DEFAULT_CHOICE, type ModelsState, profilesRow, slotRow, type Target, turboRow } from "./wizard.ts";

type OnTarget = (target: Target) => void;

function fit(text: string, width: number): string {
  const cut = truncate(text, width);
  return cut + " ".repeat(Math.max(0, width - Bun.stringWidth(cut)));
}

function chosen(models: ModelsState, pick: SlotPick): Choice | undefined {
  const sel = models.selected[pick.slot.id] ?? DEFAULT_CHOICE;
  return sel >= 0 ? pick.options[sel] : undefined;
}

type Line = { readonly kind: "header"; readonly group: SlotKind } | { readonly kind: "row"; readonly index: number };

function listLines(models: ModelsState): Line[] {
  const lines: Line[] = [];
  let last: SlotKind | null = null;
  models.picks.forEach((pick, index) => {
    if (pick.slot.kind !== last) lines.push({ kind: "header", group: pick.slot.kind });
    last = pick.slot.kind;
    lines.push({ kind: "row", index });
  });
  return lines;
}

function windowed(lines: readonly Line[], cursorIndex: number, room: number) {
  if (lines.length <= room) return { shown: lines, above: false, below: false };
  const size = Math.max(3, room - 2);
  const at = Math.max(0, lines.findIndex((l) => l.kind === "row" && l.index === cursorIndex));
  const first = Math.max(0, Math.min(at - Math.floor(size / 2), lines.length - size));
  return { shown: lines.slice(first, first + size), above: first > 0, below: first + size < lines.length };
}

export function ModelsScreen({
  models,
  accounts,
  usage,
  onTarget,
}: {
  readonly models: ModelsState;
  readonly accounts: readonly Account[];
  readonly usage: string;
  readonly onTarget: OnTarget;
}) {
  const { m, t, lang } = useI18n();
  const { columns, rows } = useWindowSize();
  const wide = columns >= 100;
  const inner = Math.min(columns - 4, 112);
  const listWidth = wide ? Math.max(52, Math.floor(inner * 0.5)) : inner;
  const rowWidth = listWidth - 6;
  const modelWidth = Math.min(20, Math.floor((rowWidth - 6) / 2));
  const titleWidth = rowWidth - 6 - modelWidth;
  const turbo = turboRow(models);
  const profiles = profilesRow(models);
  const onProfiles = profiles !== null && models.row === profiles;
  const rowIndex = models.row - 1;
  const current = models.picks[rowIndex];
  const onAccept = models.row === ACCEPT_ROW;
  const compact = rows < 32;
  const narrowTurbo = !wide && turbo !== null && models.row === turbo;
  const room = Math.max(3, rows - 1 - 4 - 4 - (compact ? 3 : 6) - (turbo === null ? 0 : 1) - (profiles === null ? 0 : 1) - (wide ? 2 : 4) - (narrowTurbo || (!wide && onProfiles) ? 6 : 0));
  const { shown, above, below } = windowed(listLines(models), Math.max(0, rowIndex), room);

  const hints: Hint[] = [
    ["↑↓", m.keys.move],
    ["←→", m.keys.change],
    ["Enter", onAccept ? m.keys.next : m.keys.select],
    ["Esc", m.keys.back],
    [m.mouseKey, m.mouseHint],
  ];

  const based = accounts
    .map((account) => {
      const provider = findProvider(account.provider);
      const plan = provider.plans.find((p) => p.id === account.plan);
      return `${provider.name}${plan ? ` ${t(plan.label)}` : ""}`;
    })
    .filter((v, i, all) => all.indexOf(v) === i);

  const accept = (
    <Clickable onPress={() => onTarget({ kind: "modelsNext" })} flexShrink={0}>
      <Box
        borderStyle={onAccept ? "double" : "round"}
        borderColor={onAccept ? "green" : "gray"}
        paddingX={1}
        flexDirection="column"
        flexGrow={1}
      >
        <Text bold {...(onAccept ? { backgroundColor: "green", color: "black" } : { color: "green" })}>
          {` ✔ ${m.acceptTitle} → `}
        </Text>
        <Text wrap={compact ? "truncate-end" : "wrap"}>
          <Text dimColor>{`${m.basedOn}: `}</Text>
          <Text>{[usage, ...based].filter(Boolean).join(" · ")}</Text>
        </Text>
        {compact ? null : (
          <Text dimColor wrap="wrap">
            {m.acceptHint}
          </Text>
        )}
      </Box>
    </Clickable>
  );

  const groupTitle = (kind: SlotKind) => (kind === "lane" ? m.mainAiTitle : kind === "agent" ? m.helpersTitle : m.tasksTitle);

  const list = (
    <Card width={listWidth} active={!onAccept}>
      {above ? <Text dimColor>{"  ⋯"}</Text> : null}
      {shown.map((line) => {
        if (line.kind === "header") {
          return (
            <Text key={`h-${line.group}`} bold color="cyan">
              {groupTitle(line.group)}
            </Text>
          );
        }
        const pick = models.picks[line.index];
        if (!pick) return null;
        const choice = chosen(models, pick);
        const here = models.row === slotRow(line.index);
        const star = pick.slot.kind === "lane" && models.defaultLane === pick.slot.id;
        const name = padEnd(truncate(t(pick.slot.title), titleWidth), titleWidth);
        const value = choice ? prettyModel(choice.model) : pick.options.length === 0 ? "-" : m.omoDefault;
        return (
          <Clickable key={pick.slot.id} onPress={() => onTarget({ kind: "modelRow", row: slotRow(line.index) })} flexShrink={0}>
            <Text wrap="truncate-end" {...(here ? { backgroundColor: "cyan", color: "black", bold: true } : {})}>
              {fit(`${here ? " ▶ " : "   "}${star ? "★ " : "  "}${name} ${truncate(value, modelWidth)}`, rowWidth)}
            </Text>
          </Clickable>
        );
      })}
      {below ? <Text dimColor>{"  ⋯"}</Text> : null}
      {turbo !== null && models.turbo ? (
        <Clickable onPress={() => onTarget({ kind: "modelRow", row: turbo })} flexShrink={0}>
          <Text wrap="truncate-end" {...(models.row === turbo ? { backgroundColor: "yellow", color: "black", bold: true } : { color: "yellow" })}>
            {fit(
              `${models.row === turbo ? " ▶ " : "   "}⚡${padEnd(truncate(m.turboTitle, titleWidth), titleWidth)} ${models.turboOn ? m.turboYes : m.turboNo}`,
              rowWidth,
            )}
          </Text>
        </Clickable>
      ) : null}
      {profiles !== null ? (
        <Clickable onPress={() => onTarget({ kind: "modelRow", row: profiles })} flexShrink={0}>
          <Text wrap="truncate-end" {...(onProfiles ? { backgroundColor: "cyan", color: "black", bold: true } : { color: "cyan" })}>
            {fit(`${onProfiles ? " ▶ " : "   "}${lang === "ko" ? "제공업체별 주력 프로필" : "Provider-first profiles"}   ${models.profilesOn ? (lang === "ko" ? `${models.providerProfiles.length}개 만들기` : `Create ${models.providerProfiles.length}`) : (lang === "ko" ? "만들지 않기" : "Do not create")}`, rowWidth)}
          </Text>
        </Clickable>
      ) : null}
    </Card>
  );

  const detail = (() => {
    if (onProfiles) return <Card grow active><ProfilePanel models={models} onTarget={onTarget} /></Card>;
    if (onAccept) {
      return (
        <Card grow>
          <Text bold>{m.modelsTitle}</Text>
          <Text dimColor wrap="wrap">
            {m.modelsSubtitle}
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text dimColor wrap="wrap">{`★ ${m.mainAiHint}`}</Text>
            <Text dimColor wrap="wrap">{`· ${m.helpersHint}`}</Text>
            <Text dimColor wrap="wrap">{`· ${m.tasksHint}`}</Text>
          </Box>
        </Card>
      );
    }
    if (models.row === turbo && models.turbo) {
      const plan = models.turbo;
      return (
        <Card grow active>
          <Text bold color="yellow">{`⚡ ${m.turboTitle}`}</Text>
          <Text dimColor>{m.turboReason[plan.reason]}</Text>
          <Box marginTop={1}>
            <Text wrap="wrap">{m.turboAbout(`${prettyModel(plan.main.model)} (${reasoningWord(plan.main.reasoning, lang)})`)}</Text>
          </Box>
          <Box marginTop={1} gap={2}>
            {[true, false].map((on) => (
              <Clickable key={String(on)} onPress={() => onTarget({ kind: "turbo", on })}>
                <Text bold {...(models.turboOn === on ? { backgroundColor: on ? "green" : "gray", color: "black" } : { dimColor: true })}>
                  {` ${on ? m.turboYes : m.turboNo} `}
                </Text>
              </Clickable>
            ))}
          </Box>
        </Card>
      );
    }
    if (!current) return null;
    return <ModelChoiceDetail models={models} current={current} onTarget={onTarget} />;
  })();

  return (
    <Frame step={3} title={m.modelsTitle} subtitle={compact ? undefined : m.modelsSubtitle} hints={hints} width={inner}>
      {accept}
      <Box gap={2} flexShrink={0} flexDirection={wide ? "row" : "column"}>
        {list}
        {wide ? detail : onProfiles ? <ProfilePanel models={models} onTarget={onTarget} compact /> : models.row === turbo && models.turbo ? (
          <Box flexDirection="column" flexShrink={0}>
            <Text wrap="wrap">{m.turboAbout(`${prettyModel(models.turbo.main.model)} (${reasoningWord(models.turbo.main.reasoning, lang)})`)}</Text>
            <Box gap={2}>
              {[true, false].map((on) => (
                <Clickable key={String(on)} onPress={() => onTarget({ kind: "turbo", on })}>
                  <Text bold {...(models.turboOn === on ? { backgroundColor: on ? "green" : "gray", color: "black" } : { dimColor: true })}>
                    {` ${on ? m.turboYes : m.turboNo} `}
                  </Text>
                </Clickable>
              ))}
            </Box>
          </Box>
        ) : current && !onAccept ? (
          <Box flexDirection="column">
            <Text dimColor wrap="truncate-end">
              {t(current.slot.about)}
            </Text>
            {(() => {
              const choice = chosen(models, current);
              return choice ? (
                <Text wrap="truncate-end">
                  <Text bold color="magenta">
                    {prettyModel(choice.model)}
                  </Text>
                  <Text dimColor>{`  ${reasoningWord(choice.reasoning, lang)} · ${providerName(choice.provider)}`}</Text>
                  {choice.why ? <Text color="green">{`  ↳ ${m.whyTag[choice.why]}`}</Text> : null}
                </Text>
              ) : null;
            })()}
          </Box>
        ) : null}
      </Box>
    </Frame>
  );
}
