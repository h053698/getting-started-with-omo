import { Box, Text, useWindowSize } from "ink";
import { Clickable } from "./hit.tsx";
import { truncate } from "./i18n.ts";
import { findProvider } from "./providers.ts";
import { Frame, useI18n } from "./ui.tsx";
import { engineProviderOf, type Target, type WizardState } from "./wizard.ts";

export function PriorityPopup({ state, onTarget }: {
  readonly state: WizardState;
  readonly onTarget: (target: Target) => void;
}) {
  const { m, lang } = useI18n();
  const { columns, rows } = useWindowSize();
  const cursor = state.priority?.cursor ?? 0;
  const order = state.providerOrder;
  const room = Math.max(1, rows - 17);
  const from = Math.max(0, Math.min(cursor - Math.floor(room / 2), order.length - room));
  const labelWidth = Math.max(12, Math.min(columns - 8, 80) - 10);
  const recommend = cursor === order.length;
  const grabbed = state.priority?.grabbed ?? false;
  return (
    <Frame step={2} title={m.providerPriorities} width={84} hints={[
      ["↑↓", m.keys.move], ["Enter", m.keys.select], ["Esc", m.keys.back], [m.mouseKey, m.mouseHint],
    ]}>
      <Text wrap="wrap">{m.priorityHint}</Text>
      <Text dimColor wrap="wrap">{m.priorityReserve}</Text>
      <Text color={grabbed ? "yellow" : "cyan"} bold={grabbed}>{grabbed ? m.priorityMoving : m.priorityKeys}</Text>
      <Box flexDirection="column" borderStyle="round" borderColor={grabbed ? "yellow" : "gray"} paddingX={1} marginTop={1}>
        <Text dimColor>{from > 0 ? `↑ ${from}` : " "}</Text>
        {order.length === 0 ? <Text dimColor>{m.priorityEmpty}</Text> : null}
        {order.slice(from, from + room).map((id, offset) => {
          const index = from + offset;
          const accounts = state.accounts.filter((account) => engineProviderOf(account) === id);
          const account = accounts[0];
          const provider = account ? findProvider(account.provider) : undefined;
          const name = provider?.kind === "custom" ? id : provider?.name ?? id;
          const on = cursor === index;
          return (
            <Box key={id} flexShrink={0}>
              <Clickable onPress={() => onTarget({ kind: "priorityRow", index })} width={labelWidth} flexShrink={0}>
                <Text wrap="truncate-end" {...(on ? { backgroundColor: grabbed ? "yellow" : "cyan", color: "black", bold: true } : {})}>
                  {(() => {
                    const label = truncate(`${on ? "▶" : " "} ${index + 1}. ${name} · ${lang === "ko" ? `계정 ${accounts.length}개` : `${accounts.length} account${accounts.length === 1 ? "" : "s"}`}`, labelWidth);
                    return label + " ".repeat(Math.max(0, labelWidth - Bun.stringWidth(label)));
                  })()}
                </Text>
              </Clickable>
              {([-1, 1] as const).map(step => {
                const disabled = index + step < 0 || index + step >= order.length;
                return (
                  <Clickable key={step} onPress={() => { if (!disabled) onTarget({ kind: "priorityMove", index, step }); }}>
                    <Text dimColor={disabled} {...(on ? { backgroundColor: grabbed ? "yellow" : "cyan", color: "black" } : { color: "cyan" })}>
                      {step === -1 ? " [↑] " : " [↓] "}
                    </Text>
                  </Clickable>
                );
              })}
            </Box>
          );
        })}
        <Text dimColor>{from + room < order.length ? `↓ ${order.length - from - room}` : " "}</Text>
      </Box>
      <Clickable onPress={() => onTarget({ kind: "priorityRecommend" })} marginTop={1}>
        <Text bold {...(recommend ? { backgroundColor: "cyan", color: "black" } : { color: "green" })}>
          {` ${recommend ? "▶ " : ""}${m.priorityRecommend} → `}
        </Text>
      </Clickable>
    </Frame>
  );
}
