import { Box, Text, useAnimation, useWindowSize } from "ink";
import { Clickable } from "./hit.tsx";
import { truncate } from "./i18n.ts";
import { PriorityPopup } from "./priority.tsx";
import {
  CUSTOM_APIS,
  type Field,
  findProvider,
  KINDS,
  type Plan,
  PROVIDERS,
  type Provider,
  RELAYS,
  priceText,
  ROLES,
  type Tier,
} from "./providers.ts";
import { Card, FLOW_MS, Frame, gradientAt, gradientRgb, type Hint, mix, Spinner, toHex, useI18n, WHITE } from "./ui.tsx";
import {
  type Account,
  accountsOf,
  allowsExpensive,
  type Cell,
  cellsOf,
  customModels,
  focusedProvider,
  EXPENSIVE_INDEX,
  NEXT_INDEX,
  PRIORITY_INDEX,
  roleOf,
  BUDGET_CUSTOM,
  BUDGET_NONE,
  BUDGETS,
  type Target,
  type WizardState,
} from "./wizard.ts";
import { preferenceSummary, QUESTIONS } from "./preferences.ts";

type OnTarget = (target: Target) => void;

const TIER_COLOR: Readonly<Record<Tier, string>> = { 0: "gray", 1: "cyan", 2: "blue", 3: "magenta", 4: "yellow" };

export function TierName({ plan, bold, plain, still }: { readonly plan: Plan; readonly bold?: boolean; readonly plain?: boolean; readonly still?: boolean }) {
  const { t, lang } = useI18n();
  const price = priceText(plan, lang);
  return (
    <Text>
      <TierLabel plan={plan} {...(bold === undefined ? {} : { bold })} {...(plain === undefined ? {} : { plain })} {...(still === undefined ? {} : { still })} />
      {price ? <Text dimColor>{` (${price})`}</Text> : null}
    </Text>
  );
}

function TierLabel({ plan, bold, plain, still }: { readonly plan: Plan; readonly bold?: boolean; readonly plain?: boolean; readonly still?: boolean }) {
  const { t } = useI18n();
  const tier = plan.tier ?? 0;
  const animated = tier >= 3 && plain !== true && still !== true;
  const { time } = useAnimation({ interval: 90, isActive: animated });
  const label = t(plan.label);
  if (plain === true) return <Text bold>{tier === 4 ? `✦ ${label} ✦` : label}</Text>;
  if (tier < 3) {
    return (
      <Text bold={bold === true || tier >= 2} color={TIER_COLOR[tier]}>
        {label}
      </Text>
    );
  }
  const chars = [...label];
  const width = chars.length;
  const band = ((time % 1800) / 1800) * (width + 10) - 5;
  return (
    <Text bold>
      {tier === 4 ? <Text color={gradientAt(time / 900)}>{"✦ "}</Text> : null}
      {chars.map((char, i) => {
        const base = tier === 4 ? gradientRgb(i / Math.max(1, width) - time / FLOW_MS) : mix([217, 70, 239], [99, 102, 241], i / Math.max(1, width));
        const glint = tier === 4 ? Math.max(0, 1 - Math.abs(i - band) / 2.5) : 0;
        return (
          <Text key={i} color={toHex(mix(base, WHITE, glint * 0.85))}>
            {char}
          </Text>
        );
      })}
      {tier === 4 ? <Text color={gradientAt(time / 900 + 0.5)}>{" ✦"}</Text> : null}
    </Text>
  );
}

function fieldValue(account: Account, provider: Provider, field: Field, m: ReturnType<typeof useI18n>["m"], t: ReturnType<typeof useI18n>["t"]) {
  switch (field) {
    case "plan": {
      const plan = provider.plans.find((p) => p.id === account.plan);
      return plan ? <TierName plan={plan} /> : <Text dimColor>{m.notSet}</Text>;
    }
    case "role": {
      const role = ROLES.find((r) => r.id === roleOf(account));
      return <Text bold>{role ? t(role.label) : "-"}</Text>;
    }
    case "budget":
      return account.budget == null ? <Text dimColor>{m.notSet}</Text> : <Text bold>{m.perMonth(String(account.budget))}</Text>;
    case "baseUrl":
      return account.custom?.baseUrl ? <Text>{truncate(account.custom.baseUrl, 40)}</Text> : <Text dimColor>{m.notSet}</Text>;
    case "apiKey":
      return account.custom?.key ? <Text>{"•".repeat(Math.min(12, account.custom.key.length))}</Text> : <Text dimColor>{m.notSet}</Text>;
    case "api": {
      const api = CUSTOM_APIS.find((a) => a.id === account.custom?.api);
      return <Text>{api ? t(api.label) : "-"}</Text>;
    }
    case "models": {
      const spec = account.custom;
      if (!spec || spec.fetch === "idle") return <Text dimColor>{m.fetchIdle}</Text>;
      if (spec.fetch === "loading")
        return (
          <Text>
            <Spinner /> <Text dimColor>{m.fetchLoading}</Text>
          </Text>
        );
      if (spec.fetch === "error") return <Text color="red">{m.fetchError(spec.fetchError ?? "")}</Text>;
      return (
        <Text color="green">
          {spec.picked.length > 0 ? m.pickedModels(spec.picked.length, spec.available.length) : m.allModels(spec.available.length)}
        </Text>
      );
    }
    case "relays": {
      const relays = account.custom?.relays ?? [];
      if (relays.length === 0) return <Text dimColor>{account.custom?.fetch === "ok" ? "-" : m.autoRelays}</Text>;
      return <Text color="magenta">{relays.map((r) => RELAYS.find((x) => x.id === r)?.label ?? r).join(", ")}</Text>;
    }
  }
}

function cellLabel(cell: Cell, m: ReturnType<typeof useI18n>["m"]): string {
  switch (cell.kind) {
    case "name":
      return m.accountName;
    case "save":
      return m.saveClose;
    case "remove":
      return m.keys.remove;
    case "field":
      return m.fieldLabels[cell.field];
  }
}

function cellHelp(cell: Cell, m: ReturnType<typeof useI18n>["m"]): string {
  switch (cell.kind) {
    case "name":
      return m.fieldHelp.name;
    case "save":
      return m.saveHelp;
    case "remove":
      return m.fieldHelp.remove;
    case "field":
      return m.fieldHelp[cell.field];
  }
}

function Dropdown({
  state,
  account,
  provider,
  width,
  onTarget,
}: {
  readonly state: WizardState;
  readonly account: Account;
  readonly provider: Provider;
  readonly width: number;
  readonly onTarget: OnTarget;
}) {
  const { m, t, lang } = useI18n();
  const dropdown = state.dropdown;
  if (!dropdown || dropdown.key !== account.key) return null;
  const inner = Math.max(20, width - 4);
  const multi = dropdown.field === "relays" || dropdown.field === "models";
  const row = (index: number, label: string, on: boolean, render?: (focused: boolean) => React.ReactNode) => {
    const here = dropdown.cursor === index;
    const mark = multi ? (on ? "☑ " : "☐ ") : on ? "● " : "○ ";
    return (
      <Clickable key={`o-${index}`} onPress={() => onTarget({ kind: "option", key: account.key, field: dropdown.field, index })} flexShrink={0}>
        {here ? (
          <Text backgroundColor="cyan" color="black" bold wrap="truncate-end">
            {padTo(` ▶ ${mark}${label}`, inner)}
          </Text>
        ) : (
          <Text wrap="truncate-end">
            <Text dimColor>{`   ${mark}`}</Text>
            {render ? render(false) : <Text>{truncate(label, inner - 5)}</Text>}
          </Text>
        )}
      </Clickable>
    );
  };
  const header = (text: string) => (
    <Text key={`g-${text}`} dimColor bold wrap="truncate-end">
      {`   ${text}`}
    </Text>
  );
  const lines: React.ReactNode[] = [];
  let hint: string | null = null;
  switch (dropdown.field) {
    case "plan": {
      let group: string | null = null;
      provider.plans.forEach((plan, index) => {
        const label = plan.group ? m.planGroups[plan.group] : null;
        if (label && label !== group) lines.push(header(label));
        if (label) group = label;
        const price = priceText(plan, lang);
        const text = `${(plan.tier ?? 0) === 4 ? `✦ ${t(plan.label)} ✦` : t(plan.label)}${price ? ` (${price})` : ""}`;
        lines.push(row(index, text, plan.id === account.plan, () => <TierName plan={plan} still />));
        if (dropdown.cursor === index && plan.hint) hint = t(plan.hint);
      });
      break;
    }
    case "role":
      ROLES.forEach((role, index) => {
        lines.push(row(index, t(role.label), role.id === roleOf(account)));
        if (dropdown.cursor === index) hint = t(role.hint);
      });
      break;
    case "api":
      CUSTOM_APIS.forEach((api, index) => lines.push(row(index, t(api.label), api.id === account.custom?.api)));
      break;
    case "relays":
      RELAYS.forEach((relay, index) => lines.push(row(index, `${relay.label} relay`, account.custom?.relays.includes(relay.id) ?? false)));
      break;
    case "budget": {
      const custom = account.budget != null && !BUDGETS.includes(account.budget);
      BUDGETS.forEach((amount, index) => lines.push(row(index, m.perMonth(String(amount)), account.budget === amount)));
      lines.push(row(BUDGET_CUSTOM, custom ? `${m.budgetCustom} · ${m.perMonth(String(account.budget))}` : m.budgetCustom, custom));
      lines.push(row(BUDGET_NONE, m.budgetNone, account.budget == null));
      hint = m.fieldHelp.budget;
      break;
    }
    case "models": {
      const spec = account.custom;
      if (!spec) break;
      lines.push(row(0, m.allModels(spec.available.length), spec.picked.length === 0));
      const from = Math.max(0, Math.min(dropdown.cursor - 4, spec.available.length - 8));
      spec.available.slice(from, from + 8).forEach((id, i) => lines.push(row(from + i + 1, id, spec.picked.includes(id))));
      break;
    }
  }
  return (
    <Box flexDirection="column" flexShrink={0} marginTop={0}>
      <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1} width={width} flexShrink={0}>
        {lines}
      </Box>
      <Text dimColor wrap="truncate-end">
        {` ${hint ?? (multi ? m.multiHint : m.dropdownHint)}`}
      </Text>
    </Box>
  );
}

function padTo(text: string, width: number): string {
  const cut = truncate(text, width);
  return cut + " ".repeat(Math.max(0, width - Bun.stringWidth(cut)));
}

function EditLine({ state, account }: { readonly state: WizardState; readonly account: Account }) {
  const { m } = useI18n();
  const { frame } = useAnimation({ interval: 500 });
  const editing = state.editing;
  if (!editing || editing.key !== account.key) return null;
  const shown = editing.field === "apiKey" ? "•".repeat(editing.buffer.length) : editing.buffer;
  const money = editing.field === "budget";
  return (
    <Box flexDirection="column" marginLeft={2} flexShrink={0}>
      <Box borderStyle="round" borderColor="cyan" paddingX={1} flexShrink={0}>
        <Text>
          {money ? <Text bold color="green">{"$ "}</Text> : null}
          <Text bold>{shown}</Text>
          <Text color="cyan">{frame % 2 === 0 ? "▍" : " "}</Text>
          {money ? <Text dimColor>{`  ${m.usdPerMonth}`}</Text> : null}
        </Text>
      </Box>
      <Text dimColor>{editing.field === "budget" ? m.typeDigits : editing.field === "name" ? m.editingName : m.typeText}</Text>
    </Box>
  );
}

function AccountSummary({
  provider,
  account,
  row,
  state,
  onTarget,
}: {
  readonly provider: Provider;
  readonly account: Account;
  readonly row: number;
  readonly state: WizardState;
  readonly onTarget: OnTarget;
}) {
  const { m, t } = useI18n();
  const here = state.focus === "accounts" && state.row === row && state.popup === null;
  const plan = provider.plans.find((p) => p.id === account.plan);
  const role = ROLES.find((r) => r.id === roleOf(account));
  const parts = [
    role ? t(role.label) : null,
    account.budget != null ? m.perMonth(String(account.budget)) : null,
    account.custom ? (account.custom.fetch === "ok" ? m.allModels(customModels(account.custom).length) : m.fetchIdle) : null,
  ].filter((v): v is string => v !== null);
  return (
    <Clickable onPress={() => onTarget({ kind: "open", key: account.key })} flexShrink={0}>
      <Box borderStyle="round" borderColor={here ? "magenta" : "gray"} paddingX={1} flexGrow={1} flexDirection="column">
        <Text wrap="wrap">
          <Text {...(here ? { color: "magenta", bold: true } : { dimColor: true })}>{here ? "▶ " : "◇ "}</Text>
          <Text bold>{account.name}</Text>
          {plan ? (
            <Text>
              <Text dimColor>{"  ·  "}</Text>
              <TierName plan={plan} />
            </Text>
          ) : null}
          {parts.length > 0 ? <Text dimColor>{`  ·  ${parts.join("  ·  ")}`}</Text> : null}
        </Text>
        {here ? <Text dimColor>{`  ${m.openAccountHint}`}</Text> : null}
      </Box>
    </Clickable>
  );
}

function AccountPopup({
  provider,
  account,
  state,
  width,
  onTarget,
}: {
  readonly provider: Provider;
  readonly account: Account;
  readonly state: WizardState;
  readonly width: number;
  readonly onTarget: OnTarget;
}) {
  const { m, t } = useI18n();
  const cells = cellsOf(provider);
  const labelWidth = width >= 70 ? 16 : 13;
  const current = cells[state.col];
  return (
    <Box flexDirection="column" borderStyle="double" borderColor="magenta" paddingX={2} paddingY={0} width={width} flexShrink={0}>
      <Box justifyContent="space-between" flexShrink={0}>
        <Text bold color="magenta" wrap="truncate-end">
          {`${provider.name} · ${m.accountSettings}`}
        </Text>
        <Clickable onPress={() => onTarget({ kind: "done" })}>
          <Text bold color="green">{` ✕ `}</Text>
        </Clickable>
      </Box>
      <Text dimColor wrap="wrap">
        {t(provider.detail)}
      </Text>
      <Box flexDirection="column" marginTop={1} flexShrink={0}>
        {cells.map((cell, index) => {
          if (cell.kind === "save" || cell.kind === "remove") return null;
          const on = state.col === index;
          const value =
            cell.kind === "name" ? (
              <Text bold>{account.name}</Text>
            ) : (
              fieldValue(account, provider, cell.field, m, t)
            );
          const listField = cell.kind === "field" && cell.field !== "baseUrl" && cell.field !== "apiKey";
          return (
            <Box key={`${cell.kind}-${cell.kind === "field" ? cell.field : ""}`} flexDirection="column" flexShrink={0}>
              <Clickable onPress={() => onTarget({ kind: "cell", key: account.key, cell: index })} flexShrink={0}>
                <Box width={2} flexShrink={0}>
                  <Text {...(on ? { color: "magenta", bold: true } : { dimColor: true })}>{on ? "▶" : " "}</Text>
                </Box>
                <Box width={labelWidth} flexShrink={0}>
                  <Text wrap="truncate-end" {...(on ? { color: "magenta", bold: true } : { dimColor: true })}>
                    {cellLabel(cell, m)}
                  </Text>
                </Box>
                <Box flexGrow={1} flexShrink={1}>
                  {value}
                </Box>
                {on && listField ? (
                  <Box flexShrink={0}>
                    <Text color="magenta">{state.dropdown?.key === account.key ? " ▴" : " ▾"}</Text>
                  </Box>
                ) : null}
              </Clickable>
              {on && state.editing?.key === account.key ? <EditLine state={state} account={account} /> : null}
              {on && state.dropdown?.key === account.key ? (
                <Box marginLeft={2} flexShrink={0}>
                  <Dropdown state={state} account={account} provider={provider} width={width - 8} onTarget={onTarget} />
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
      <Box marginTop={1} gap={2} flexShrink={0}>
        {cells.map((cell, index) => {
          if (cell.kind !== "save" && cell.kind !== "remove") return null;
          const on = state.col === index;
          const save = cell.kind === "save";
          return (
            <Clickable key={cell.kind} onPress={() => onTarget({ kind: "cell", key: account.key, cell: index })}>
              <Text
                bold
                {...(on
                  ? { backgroundColor: save ? "green" : "red", color: save ? "black" : "white" }
                  : save
                    ? { color: "green" }
                    : { color: "red" })}
              >
                {save ? ` ✔ ${m.saveClose} ` : ` ✕ ${m.keys.remove} `}
              </Text>
            </Clickable>
          );
        })}
      </Box>
      {current && !state.editing && !state.dropdown ? (
        <Box marginTop={1} flexShrink={0} flexDirection="column">
          <Text dimColor wrap="wrap">
            {cellHelp(current, m)}
          </Text>
          <Text dimColor wrap="wrap">{`${m.editHintCell} · ${m.doneHint}`}</Text>
        </Box>
      ) : null}
    </Box>
  );
}

function AccountPanel({ state, onTarget }: { readonly state: WizardState; readonly onTarget: OnTarget }) {
  const { m, t } = useI18n();
  const provider = focusedProvider(state);
  if (!provider) {
    return (
      <Card grow>
        <Text dimColor wrap="wrap">
          {m.nextHint}
        </Text>
      </Card>
    );
  }
  const accounts = accountsOf(state, provider.id);
  const focused = state.focus === "accounts";
  const addHere = focused && state.row === accounts.length && state.popup === null;
  return (
    <Card grow active={focused}>
      <Text bold color="cyan" wrap="wrap">
        {provider.name}
      </Text>
      <Text dimColor wrap="wrap">
        {`${t(provider.detail)} · ${m.accountCount(accounts.length)}`}
      </Text>
      <Box flexDirection="column" marginTop={1}>
        {accounts.map((account, row) => (
          <AccountSummary key={account.key} provider={provider} account={account} row={row} state={state} onTarget={onTarget} />
        ))}
        <Clickable onPress={() => onTarget({ kind: "add" })}>
          <Text {...(addHere ? { backgroundColor: "green", color: "black", bold: true } : { color: "green" })}>{` + ${m.keys.add} `}</Text>
        </Clickable>
      </Box>
      {!focused ? (
        <Box marginTop={1}>
          <Text dimColor wrap="wrap">
            {accounts.length === 0 ? m.openHint : m.editHint}
          </Text>
        </Box>
      ) : null}
    </Card>
  );
}

type ListItem =
  | { readonly kind: "header"; readonly group: (typeof KINDS)[number] }
  | { readonly kind: "provider"; readonly index: number }
  | { readonly kind: "gap"; readonly id: string }
  | { readonly kind: "next" };

const LIST_ITEMS: readonly ListItem[] = [
  ...KINDS.flatMap((group, k): ListItem[] => [
    ...(k > 0 ? [{ kind: "gap", id: group } as const] : []),
    { kind: "header", group },
    ...PROVIDERS.flatMap((provider, index): ListItem[] => (provider.kind === group ? [{ kind: "provider", index }] : [])),
  ]),
  { kind: "gap", id: "next" },
  { kind: "next" },
];

function visibleItems(cursor: number, room: number) {
  if (room >= LIST_ITEMS.length) return { items: LIST_ITEMS, above: false, below: false };
  const at = LIST_ITEMS.findIndex((item) => (cursor === NEXT_INDEX ? item.kind === "next" : item.kind === "provider" && item.index === cursor));
  const size = Math.max(3, room - 2);
  const first = Math.max(0, Math.min(at - Math.floor(size / 2), LIST_ITEMS.length - size));
  return { items: LIST_ITEMS.slice(first, first + size), above: first > 0, below: first + size < LIST_ITEMS.length };
}

function ProviderList({ state, width, room, onTarget }: { readonly state: WizardState; readonly width: number; readonly room: number; readonly onTarget: OnTarget }) {
  const { m } = useI18n();
  const focused = state.focus === "providers";
  const { items, above, below } = visibleItems(state.providerCursor, room);
  return (
    <Card width={width} active={focused}>
      {above ? <Text dimColor>{"  ⋯"}</Text> : null}
      {items.map((item) => {
        switch (item.kind) {
          case "gap":
            return <Text key={`gap-${item.id}`}> </Text>;
          case "header":
            return (
              <Text key={`h-${item.group}`} dimColor bold>
                {m.tabs[item.group]}
              </Text>
            );
          case "provider": {
            const provider = PROVIDERS[item.index];
            if (!provider) return null;
            const active = item.index === state.providerCursor;
            const count = accountsOf(state, provider.id).length;
            return (
              <Clickable key={provider.id} onPress={() => onTarget({ kind: "provider", index: item.index })} flexShrink={0}>
                <Text
                  wrap="truncate-end"
                  {...(active && focused ? { backgroundColor: "cyan", color: "black", bold: true } : active ? { color: "cyan", bold: true } : {})}
                >
                  {padTo(`${active ? (focused ? " ▶ " : " ▷ ") : "   "}${truncate(provider.name, width - 14)}`, width - 11)}
                </Text>
                <Box flexShrink={0} width={5} justifyContent="flex-end">
                  {count > 0 ? <Text color="green">{`◉ ${count}`}</Text> : <Text dimColor>{"  ○"}</Text>}
                </Box>
              </Clickable>
            );
          }
          case "next": {
            const on = focused && state.providerCursor === NEXT_INDEX;
            return (
              <Clickable key="next" onPress={() => onTarget({ kind: "next" })}>
                <Text bold {...(on ? { backgroundColor: "cyan", color: "black" } : { color: state.accounts.length > 0 ? "green" : "gray" })}>
                  {` ${m.keys.next} → `}
                </Text>
              </Clickable>
            );
          }
        }
      })}
      {below ? <Text dimColor>{"  ⋯"}</Text> : null}
    </Card>
  );
}

export function AccountsScreen({ state, onTarget }: { readonly state: WizardState; readonly onTarget: OnTarget }) {
  const { m, t, lang } = useI18n();
  const { columns, rows } = useWindowSize();
  const wide = columns >= 100;
  const oauth = state.accounts.filter((a) => findProvider(a.provider).kind === "oauth").length;
  const apiKey = state.accounts.length - oauth;
  const usage = preferenceSummary(state, lang);
  const hints: Hint[] = state.editing
    ? [
        ["Enter", m.keys.submit],
        ["Esc", m.keys.back],
      ]
    : state.dropdown
      ? [
          ["↑↓", m.keys.move],
          ["Enter", m.keys.select],
          ["Esc", m.keys.back],
        ]
      : state.focus === "accounts"
        ? [
            ["↑↓", m.keys.move],
            ["Enter", m.keys.select],
            ["Esc", m.keys.back],
            [m.mouseKey, m.mouseHint],
          ]
        : [
            ["↑↓", m.keys.move],
            ["Enter", m.keys.select],
            ["Esc", m.keys.back],
            [m.mouseKey, m.mouseHint],
          ];
  const warning =
    state.warning === "empty-selection"
      ? m.emptySelection
      : state.warning === "duplicate-name"
        ? m.duplicateName
        : state.warning === "bad-url"
          ? m.badUrl
          : state.warning === "reserved-name"
            ? m.reservedName
            : state.warning === "custom-incomplete"
              ? m.customIncomplete
              : null;
  const popupAccount = state.popup === null ? undefined : state.accounts.find((a) => a.key === state.popup);
  const popupProvider = popupAccount ? findProvider(popupAccount.provider) : undefined;
  const popupWidth = Math.min(columns - 8, 84);
  const expensiveFocused = state.focus === "providers" && state.providerCursor === EXPENSIVE_INDEX;
  const allowExpensive = allowsExpensive(state);
  if (state.priority) return <PriorityPopup state={state} onTarget={onTarget} />;
  return (
    <Frame step={2} title={m.accountsTitle} subtitle={popupAccount ? undefined : m.accountsSubtitle} hints={hints}>
      {popupAccount ? null : (
        <Box flexDirection="column" marginBottom={rows < 32 ? 0 : 1} flexShrink={0}>
          <Text bold color={expensiveFocused ? "cyan" : "white"} wrap="wrap">
            {`${expensiveFocused ? "▶ " : ""}${m.expensiveTitle}`}
          </Text>
          <Box gap={2}>
            {[false, true].map((on) => (
              <Clickable key={String(on)} onPress={() => onTarget({ kind: "expensive", on })}>
                <Text
                  bold
                  {...(allowExpensive === on
                    ? { backgroundColor: expensiveFocused ? "cyan" : on ? "yellow" : "gray", color: "black" }
                    : { dimColor: true })}
                >
                  {` ${on ? m.expensiveYes : m.expensiveNo} `}
                </Text>
              </Clickable>
            ))}
            <Clickable onPress={() => onTarget({ kind: "priorities" })}>
              <Text bold {...(state.focus === "providers" && state.providerCursor === PRIORITY_INDEX
                ? { backgroundColor: "cyan", color: "black" } : { color: "cyan" })}>
                {` ${state.providerCursor === PRIORITY_INDEX ? "▶ " : ""}${m.providerPriorities} `}
              </Text>
            </Clickable>
          </Box>
          {rows >= 32 || expensiveFocused ? (
            <Text dimColor wrap="wrap">
              {m.expensiveHint}
            </Text>
          ) : null}
        </Box>
      )}
      {popupAccount && popupProvider ? (
        <Box justifyContent="center" flexShrink={0}>
          <AccountPopup provider={popupProvider} account={popupAccount} state={state} width={popupWidth} onTarget={onTarget} />
        </Box>
      ) : (
        <Box gap={2}>
          <ProviderList state={state} width={wide ? 36 : 30} room={rows - 1 - 19} onTarget={onTarget} />
          <AccountPanel state={state} onTarget={onTarget} />
        </Box>
      )}
      <Box marginTop={1} gap={2} flexShrink={0}>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          <Text wrap="wrap">
            <Text bold color={state.accounts.length > 0 ? "green" : "gray"}>
              {m.totalAccounts(oauth, apiKey)}
            </Text>
            <Text dimColor>{`   ${m.usageBadge(usage)}`}</Text>
          </Text>
          {warning ? (
            <Text color="red" wrap="wrap">
              {warning}
            </Text>
          ) : null}
        </Box>
        {popupAccount ? null : (
          <Clickable onPress={() => onTarget({ kind: "next" })}>
            <Text
              bold
              {...(state.focus === "providers" && state.providerCursor === NEXT_INDEX
                ? { backgroundColor: "cyan", color: "black" }
                : state.accounts.length > 0
                  ? { backgroundColor: "green", color: "black" }
                  : { dimColor: true })}
            >
              {` ${m.nextToModels} → `}
            </Text>
          </Clickable>
        )}
      </Box>
    </Frame>
  );
}

export function UsageScreen({ state, onTarget }: { readonly state: WizardState; readonly onTarget: OnTarget }) {
  const { m, t } = useI18n();
  const question = QUESTIONS[state.usageStep];
  if (!question) return null;
  return (
    <Frame
      step={1}
      title={t(question.title)}
      subtitle={`${state.usageStep + 1} / 3 · ${m.usageSubtitle}`}
      width={84}
      hints={[
        ["↑↓", m.keys.move],
        ["Enter", m.keys.select],
        ["Esc", m.keys.back],
        [m.mouseKey, m.mouseHint],
      ]}
    >
      <Box flexDirection="column" gap={0}>
        {question.options.map((usage, index) => {
          const on = index === state.usageCursor;
          return (
            <Clickable key={index} onPress={() => onTarget({ kind: "usage", index })}>
              <Box borderStyle="round" borderColor={on ? "cyan" : "gray"} paddingX={1} flexDirection="column" flexGrow={1} flexShrink={0}>
                <Text>
                  <Text color={on ? "cyan" : "gray"}>{on ? "▶ ● " : "  ○ "}</Text>
                  <Text bold {...(on ? { color: "cyan" } : {})}>
                    {t(usage.label)}
                  </Text>
                </Text>
              </Box>
            </Clickable>
          );
        })}
        <Box marginTop={1} minHeight={3}>
          <Text dimColor wrap="wrap">{t(question.options[state.usageCursor]?.hint ?? question.options[0].hint)}</Text>
        </Box>
      </Box>
    </Frame>
  );
}
