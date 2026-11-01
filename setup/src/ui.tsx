import { Box, Text, useAnimation, useWindowSize } from "ink";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { type Lang, type Localized, MESSAGES } from "./i18n.ts";
import { type AllMessages, extraEn, extraKo } from "./messages-extra.ts";

const ALL: Readonly<Record<Lang, AllMessages>> = {
  ko: { ...MESSAGES.ko, ...extraKo },
  en: { ...MESSAGES.en, ...extraEn },
};

export type Hint = readonly [key: string, label: string];

export const LangContext = createContext<Lang>("ko");

export function useI18n() {
  const lang = useContext(LangContext);
  return { lang, m: ALL[lang], t: (text: Localized) => text[lang] };
}

type Rgb = readonly [number, number, number];

const GRADIENT: readonly Rgb[] = [
  [6, 182, 212],
  [99, 102, 241],
  [217, 70, 239],
];
export const WHITE: Rgb = [255, 255, 255];
export const FLOW_MS = 2400;

export const mix = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];

export const toHex = (c: Rgb) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

export function gradientRgb(phase: number): Rgb {
  const position = (((phase % 1) + 1) % 1) * GRADIENT.length;
  const index = Math.floor(position);
  const from = GRADIENT[index % GRADIENT.length] ?? WHITE;
  const to = GRADIENT[(index + 1) % GRADIENT.length] ?? WHITE;
  return mix(from, to, position - index);
}

export const gradientAt = (phase: number) => toHex(gradientRgb(phase));

const SPINNER = ["⣾", "⣽", "⣻", "⢿", "⡿", "⣟", "⣯", "⣷"];

export function Spinner() {
  const { frame } = useAnimation({ interval: 80 });
  return <Text color="cyan">{SPINNER[frame % SPINNER.length]}</Text>;
}

export function Wordmark() {
  const { time } = useAnimation({ interval: 120 });
  return (
    <Text bold>
      {[..."OmO"].map((char, i) => (
        <Text key={i} color={gradientAt(i / 6 - time / FLOW_MS)}>
          {char}
        </Text>
      ))}
    </Text>
  );
}

export function Keycap({ label }: { readonly label: string }) {
  return (
    <Text inverse bold>
      {` ${label} `}
    </Text>
  );
}

export function Hints({ hints }: { readonly hints: readonly Hint[] }) {
  const { columns } = useWindowSize();
  return (
    <Box gap={columns >= 100 ? 3 : 2} flexWrap="wrap" height={1} overflow="hidden">
      {hints.map(([key, label]) => (
        <Box key={key} gap={1} flexShrink={0}>
          <Keycap label={key} />
          <Text dimColor>{label}</Text>
        </Box>
      ))}
    </Box>
  );
}

function Progress({ active }: { readonly active: number }) {
  const { m } = useI18n();
  const { columns } = useWindowSize();
  const segment = columns >= 110 ? 6 : 3;
  return (
    <Box gap={2} flexShrink={0}>
      <Text>
        {m.steps.map((label, i) => (
          <Text key={label} color={i < active ? "green" : i === active ? "cyan" : "gray"}>
            {"━".repeat(segment) + (i < m.steps.length - 1 ? " " : "")}
          </Text>
        ))}
      </Text>
      <Text>
        <Text bold>{m.stepOf(active + 1, m.steps.length)}</Text>
        {columns >= 90 ? <Text dimColor>{` · ${m.steps[active] ?? ""}`}</Text> : null}
      </Text>
    </Box>
  );
}

export function Heading({ title, subtitle }: { readonly title: string; readonly subtitle?: string | undefined }) {
  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text wrap="truncate-end">
        <Text color="cyan" bold>
          {"◆ "}
        </Text>
        <Text bold>{title}</Text>
      </Text>
      {subtitle ? (
        <Box marginLeft={2} flexShrink={0}>
          <Text dimColor wrap="wrap">
            {subtitle}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

export function Frame({
  step,
  title,
  subtitle,
  hints,
  width = 108,
  children,
}: {
  readonly step: number;
  readonly title?: string | undefined;
  readonly subtitle?: string | undefined;
  readonly hints: readonly Hint[];
  readonly width?: number;
  readonly children: ReactNode;
}) {
  const { columns, rows } = useWindowSize();
  const inner = Math.max(20, columns - 4);
  return (
    <Box flexDirection="column" width={columns} height={rows - 1} paddingX={2}>
      <Box justifyContent="space-between">
        <Box gap={1} flexShrink={1}>
          <Wordmark />
          <Text dimColor wrap="truncate-end">
            Native Setup
          </Text>
        </Box>
        <Progress active={step} />
      </Box>
      <Text dimColor>{"─".repeat(inner)}</Text>
      <Box flexGrow={1} flexDirection="column" alignItems="center" justifyContent="center" overflow="hidden">
        <Box flexDirection="column" width={Math.min(inner, width)}>
          {title ? <Heading title={title} subtitle={subtitle} /> : null}
          {children}
        </Box>
      </Box>
      <Text dimColor>{"─".repeat(inner)}</Text>
      <Hints hints={hints} />
    </Box>
  );
}

export function Card({
  active = false,
  grow = false,
  width,
  children,
}: {
  readonly active?: boolean;
  readonly grow?: boolean;
  readonly width?: number;
  readonly children: ReactNode;
}) {
  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={active ? "cyan" : "gray"}
      paddingX={2}
      flexShrink={0}
      {...(grow ? { flexGrow: 1, flexBasis: 0 } : {})}
      {...(width === undefined ? {} : { width })}
    >
      {children}
    </Box>
  );
}
