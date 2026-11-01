import { Box, Text } from "ink";
import { Clickable } from "./hit.tsx";
import { prettyModel } from "./recommend.ts";
import { useI18n } from "./ui.tsx";
import type { ModelsState, Target } from "./wizard.ts";

export function ProfilePanel({ models, onTarget, compact = false }: {
  readonly models: ModelsState;
  readonly onTarget: (target: Target) => void;
  readonly compact?: boolean;
}) {
  const { lang } = useI18n();
  const ko = lang === "ko";
  return (
    <Box flexDirection="column">
      <Text bold color="cyan">{ko ? "제공업체별 주력 프로필" : "Provider-first profiles"}</Text>
      <Text dimColor wrap="wrap">
        {ko ? "일상 작업은 해당 계열 우선. 전문 작업은 적합도를 지킵니다." : "Prefer this family for everyday work; keep specialist task fit."}
      </Text>
      {compact ? (
        <Text wrap="wrap">{models.providerProfiles.map((profile) => profile.name).join(" · ")}</Text>
      ) : models.providerProfiles.map((profile) => (
        <Text key={profile.name} wrap="truncate-end">{`${profile.name} → ${prettyModel(profile.main.model)}`}</Text>
      ))}
      {models.profileIssues.length > 0 ? (
        <Text color="yellow" wrap="truncate-end">
          {`${ko ? "생성 불가" : "Unavailable"}: ${models.profileIssues.map((issue) => `${issue.name} (${issue.slots.join(", ")})`).join(" · ")}`}
        </Text>
      ) : null}
      {!compact ? <Text dimColor wrap="wrap">
        {ko ? "로그인·예비 계정은 공유합니다. 기존 기본 구성은 그대로 두고, 마지막 확인 후 별도 명령을 만듭니다." : "Shares logins and fallback accounts. Keeps your base setup; creates commands only on final apply."}
      </Text> : null}
      <Box gap={2} marginTop={compact ? 0 : 1}>
        {[true, false].map((on) => (
          <Clickable key={String(on)} onPress={() => onTarget({ kind: "providerProfiles", on })}>
            <Text bold {...(models.profilesOn === on ? { backgroundColor: "cyan", color: "black" } : { dimColor: true })}>
              {` ${on ? (ko ? "만들기" : "Create") : (ko ? "만들지 않기" : "Do not create")} `}
            </Text>
          </Clickable>
        ))}
      </Box>
    </Box>
  );
}
