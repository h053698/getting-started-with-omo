import { Box, Text, useWindowSize } from "ink";
import { Clickable } from "./hit.tsx";
import { PROVIDERS } from "./providers.ts";
import { chainFrom, prettyModel, reasoningWord, type SlotPick } from "./recommend.ts";
import { Card, useI18n } from "./ui.tsx";
import { DEFAULT_CHOICE, type ModelsState, type Target } from "./wizard.ts";

export function providerName(id: string): string {
  return PROVIDERS.find((provider) => provider.id === id)?.name ?? id;
}

export function ModelChoiceDetail({ models, current, onTarget }: {
  readonly models: ModelsState;
  readonly current: SlotPick;
  readonly onTarget: (target: Target) => void;
}) {
  const { m, t, lang } = useI18n();
  const { columns } = useWindowSize();
  const sel = models.selected[current.slot.id] ?? DEFAULT_CHOICE;
  const choice = sel >= 0 ? current.options[sel] : undefined;
  const chain = choice ? chainFrom(current.options, sel) : [];
  const others = current.options.slice(0, columns >= 100 ? 6 : 3);
  return (
    <Card grow active>
      <Text><Text bold color="cyan">{t(current.slot.title)}</Text><Text dimColor>{`   ${m.tunedFor}: ${current.slot.omoName}`}</Text></Text>
      <Text wrap="wrap">{t(current.slot.about)}</Text>
      <Text dimColor wrap="wrap">{t(current.slot.detail)}</Text>
      {choice ? (
        <Box marginTop={1} flexDirection="column">
          <Text><Text bold color="magenta">{prettyModel(choice.model)}</Text><Text>{`  ${reasoningWord(choice.reasoning, lang)}`}</Text><Text dimColor>{`  · ${providerName(choice.provider)}`}</Text></Text>
          {choice.why ? <Text color={choice.why === "rescue" ? "yellow" : "green"}>{`  ↳ ${m.whyTag[choice.why]}`}</Text> : null}
          {choice.why === "rescue" && (models.blocked[current.slot.id] ?? 0) > 0 ? (
            <Text color="yellow" wrap="wrap">{`! ${m.excludedNote(models.blocked[current.slot.id] ?? 0)} · ~/.omo/omo.jsonc exclude_models`}</Text>
          ) : null}
          {chain.length > 1 ? (
            <Box flexDirection="column">
              <Text dimColor wrap="wrap">{lang === "ko"
                ? `자동 대체 ${chain.length - 1}개 · 예비 ${chain.filter(c => c.reserve).length}개 포함`
                : `${chain.length - 1} fallbacks · ${chain.filter(c => c.reserve).length} reserves included`}</Text>
              <Text dimColor wrap="truncate-end">{`${m.chainLabel}: ${chain.slice(1).map((c) => `${providerName(c.provider)}/${prettyModel(c.model)}`).join(" → ")}`}</Text>
            </Box>
          ) : null}
        </Box>
      ) : (
        <Box marginTop={1}><Text color="yellow" wrap="wrap">{current.options.length === 0 ? m.noChoice : m.omoDefaultHint}</Text></Box>
      )}
      {current.options.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {others.map((option, i) => (
            <Clickable key={`${option.provider}-${option.model}-${i}`} onPress={() => onTarget({ kind: "modelChoice", row: models.row, choice: i })}>
              <Text wrap="truncate-end">
                <Text color={sel === i ? "magenta" : "gray"}>{sel === i ? "● " : "○ "}</Text>
                <Text bold={sel === i}>{prettyModel(option.model)}</Text>
                <Text dimColor>{`  ${reasoningWord(option.reasoning, lang)} · ${providerName(option.provider)}`}</Text>
              </Text>
            </Clickable>
          ))}
          <Clickable onPress={() => onTarget({ kind: "modelChoice", row: models.row, choice: DEFAULT_CHOICE })}>
            <Text wrap="truncate-end">
              <Text color={sel === DEFAULT_CHOICE ? "magenta" : "gray"}>{sel === DEFAULT_CHOICE ? "● " : "○ "}</Text>
              <Text bold={sel === DEFAULT_CHOICE}>{m.omoDefault}</Text><Text dimColor>{`  ${m.omoDefaultHint}`}</Text>
            </Text>
          </Clickable>
          <Text dimColor>{m.changeHint}</Text>
        </Box>
      ) : null}
    </Card>
  );
}
