<a href="../../README.md">목차</a> › <a href="../README.md">설치 가이드</a> › <a href="README.md">사용자를 위한 안내</a>

### 첫 번째 실행: omo 설정

`omo setup`는 OmO Native 온보딩 명령입니다. 기존의 수동 설정 절차를 대체하므로 더 이상 직접 파일을 편집할 필요가
없습니다. 다음 세 단계로 진행됩니다.

1. **감지 및 계획(읽기 전용).** 다른 코딩 에이전트 설치의 데이터와 엔진의 에이전트 디렉터리
   (`~/.omo/agent` 또는 `OMO_CODING_AGENT_DIR` / `SENPI_CODING_AGENT_DIR`)에 이미 있는 항목을
   확인합니다. 확인하는 설치에는 OpenCode(`~/.local/share/opencode/auth.json`, XDG를 고려한 인증 및 아래에
   설명된 OpenCode 설정), oh-my-pi(`~/.omp/agent/agent.db`), gajae-code(`~/.gjc/agent/agent.db`)가
   포함됩니다. 계획 단계에서는 아무것도 기록하지 않으며 자격 증명 값도 출력하지 않습니다. oh-my-pi와 gajae-code
   데이터베이스는 읽기 전용으로 엽니다.
2. **요약 한 번, 동의 한 번.** 설정 명령은 발견한 설치의 항목만 대상으로 단일 마이그레이션 요약을 출력합니다. 요약에는
   항목 종류별로 한 행씩 `logins`(가져올 API 키와, omo 내에서 `/login <provider>`로 다시 로그인해야 하는
   OAuth 로그인), `MCP servers`, `skills`(가져오기·거부·건너뛰기 여부와 각각의 이유), `providers`(이전할
   사용자 지정 모델 제공업체)가 표시됩니다. OpenCode가 자체 카탈로그 캐시에 기록한 모든 models.dev 카탈로그
   모델 제공업체의 API 키와 `model choices`(기본 모델, 카테고리, 에이전트)도 대상에 포함됩니다. 이어서 참고 사항,
   설치 프로그램이 출력하는 익명 원격 측정 관련 문구, 전체 계획에 대한 질문 한 번이 표시됩니다.

 ```text
 Found your OpenCode setup
   logins 5 API keys (opencode, opencode-go, zai, kimi-coding, openrouter) -
     will be imported
                 3 OAuth logins (anthropic, github-copilot, openai) - sign in
                   again inside omo: /login anthropic, /login github-copilot,
                   /login chatgpt-subscription (for openai)
   MCP servers 3 will be imported (context7, filesystem, disabled-one); 1
     refused (shelly: uses $(...) or a leading !)
   skills 2 will be imported (db-migrate, release-notes); 1 skipped
     (broken-no-skillmd: no SKILL.md)
   providers acme -> https://api.acme.example/v1, 2 models (acme-large,
     acme-small), key from opencode config apiKey - will be imported
   model choices default kimi-coding/k3; categories deep-low, quick; agents
     librarian - will be written
 ...
 Anonymous telemetry is enabled by default. Disable it with
   OMO_SEND_ANONYMOUS_TELEMETRY=0 or OMO_DISABLE_POSTHOG=1.
 Import all of the above into ~/.omo? [Y/n]
 ```

 `--yes`는 같은 요약을 출력하고 질문 없이 진행합니다. `--dry-run`은 스크립트에서 읽을 수 있는 `planned-*`
 줄까지 포함해 요약을 출력한 뒤, 파일을 쓰거나 질문하지 않고 종료합니다. `--ask-each`는 전체 계획에 대해 한 번
 묻는 대신 항목 종류별로 `[y/N]` 질문을 한 번씩 합니다. 새로 처리할 항목이 없으면 그 사실을 알리고 질문하지 않습니다.
3. **가져오기.** 동의하면 호환되는 API 키 자격 증명을 엔진의 인증 저장소로 가져옵니다. 기존 항목은 덮어쓰지 않고,
   엔진이 실제로 인식하는 모델 제공업체의 자격 증명만 가져옵니다. 하네스 간 ID는 다르지만 엔드포인트가 같은 경우도
   포함됩니다. 예를 들어 OpenCode의 `zai-coding-plan` 키는 `zai` 모델 제공업체로 가져옵니다. OAuth 항목은
   보고만 하고 가져오지 않습니다. 모델 제공업체에 연결된 토큰은 복사할 수 없으므로, 대신 다시 로그인할 때 사용할 이름을
   안내합니다(`omo`를 시작한 뒤 `/login <provider>`를 실행하세요. `omo auth`는 이미 있는 자격 증명을
   출력하거나 확인할 뿐입니다). 모델 제공업체 ID가 omo 서비스와 일치하지 않는 API 키도 다음 단계를 안내합니다.
   엔진의 `models.json`에 모델 제공업체와 해당 baseUrl을 정의한 다음 `/login`을 실행해야 합니다. 원본 저장소에는
   쓰지 않습니다. 가져올 때는 타임스탬프가 붙은 백업을 만들고 엔진의 `auth.json`만 원자적으로 갱신합니다.
 동일한 동의는 OpenCode 설정의 나머지 항목에도 적용됩니다. OpenCode 사용자 설정(`~/.config/opencode/config.json`,
 `opencode.json`, `opencode.jsonc`)에 선언된 **MCP 서버**는 OpenCode의 설정 병합 방식에 따라 합쳐집니다.
 이때 XDG를 고려하며 `OPENCODE_CONFIG`, `~/.opencode/`, `OPENCODE_CONFIG_DIR` 설정을 상위 계층으로
 적용합니다. 서버는 엔진의 스키마로 변환해 전역 `~/.omo/agent/mcp.json`에 기록하고, 해당 설정 디렉터리의
 `skills/` 또는 `skill/` 폴더에 있는 **전역 스킬**은 `~/.omo/agent/skills/`에 복사합니다. 둘 다 전역에
 배치되므로 우연히 설정 명령을 실행한 프로젝트뿐 아니라 모든 프로젝트에서 사용할 수 있습니다. 이미 있는 서버나 스킬 이름은
 유지하고 건너뛴 것으로 보고합니다. one omo와 이름이 같은 스킬도 이미 번들에 포함되어 있습니다. `mcp.json`을
 다시 쓰기 전에는 타임스탬프가 붙은 백업을 만듭니다. 설정에서 셸 명령 치환이나 `{file:...}` 자리 표시자를 사용하는
 서버, `SKILL.md` 설명이 없는 스킬은 복사하지 않습니다. 엔진이 거부하거나 자동으로 무시할 항목을 복사하는 대신,
 필요한 조치를 알림으로 안내합니다.
 다음은 **사용자 지정 모델 제공업체**(같은 설정 파일의 `provider.<id>` 블록)를 처리합니다. 각 모델 제공업체의
 기본 URL, 모델, 컨텍스트/출력 제한을 `~/.omo/agent/models.json`에 기록하고 API 키는
 `~/.omo/agent/auth.json`에 저장하므로 첫 세션부터 `acme/acme-large`를 선택할 수 있습니다. `npm`
 패키지가 프로토콜을 결정합니다. `@ai-sdk/openai-compatible`(`npm`이 없을 때 opencode가 가정하는 패키지)는
 OpenAI 호환 완성, `@ai-sdk/anthropic`는 Anthropic 메시지, `@ai-sdk/openai`는 OpenAI 응답을
 사용합니다. 키는 OpenCode와 같은 우선순위로 가져옵니다. 먼저 `options.apiKey`, 다음으로 OpenCode
 `auth.json`의 해당 모델 제공업체 항목, 마지막으로 단일 변수로 된 `env` 이름을 사용합니다. `{env:NAME}`는
 엔진의 `${NAME}`로 변환합니다. 다른 패키지를 사용하거나, omo가 이미 제공하는 ID이거나, baseURL이 고정된
 URL이 아니거나, 사용 가능한 모델이 없는 모델 제공업체는 이름을 보고하고 건너뜁니다. `models.json`에 이미 있는
 모델 제공업체 ID와 `auth.json`에 이미 있는 키는 유지하며, 두 파일 모두 다시 쓰기 전에 타임스탬프가 붙은 백업을
 만듭니다.
 **모델 선택**은 마지막에 기록합니다. 대상은 OpenCode의 기본 `model`, `agent.<name>.model` 재정의,
 OpenCode 에디션의 `categories` 및 `agents` 라우팅입니다. 라우팅은 OpenCode 설정 디렉터리의
 `oh-my-openagent.json[c]` / `oh-my-opencode.json[c]`, `~/.omo/omo.jsonc`의
 `[opencode]` 블록
 또는 `~/.omo/migration-backup-*-opencode-config/`에 있는 설정에서 읽습니다. 마지막 경로에는 구성
 마이그레이션으로 이동된 설정 파일이 있습니다. 모델 제공업체 ID는 자격 증명을 가져올 때와 같은 방식으로 변환합니다
 (`kimi-for-coding/k3`는 `kimi-coding/k3`, `zai-coding-plan/glm-5.2`는 `zai/glm-5.2`가
 됩니다). OpenCode에서 OAuth로 로그인한 모델 제공업체의 모델은 해당 모델 제공업체 설정으로 옮기고 `/login`을
 안내합니다. 따라서 ChatGPT 로그인에 사용한 `openai/gpt-5.5`는 `chatgpt-subscription/gpt-5.5`가
 됩니다. 모든 모델 제공업체/모델 조합은 같은 실행에서 가져온 사용자 지정 모델 제공업체까지 포함해 엔진이 제공하는
 모델과 대조해 확인합니다. 기본 모델은 `~/.omo/agent/settings.json`의 `defaultProvider` /
 `defaultModel`(대화형 세션의 시작 모델)에 기록하며, `~/.omo/omo.jsonc`의 `[native].model_profile`에도
 모델을 지정합니다. 헤드리스 및 데스크톱 세션은 권장 프로필 대신 이 모델로 시작합니다. 카테고리와 에이전트 설정은
 같은 파일의 `[native].categories` / `[native].agents`에 기록하고, `fallback_models`는 `models`에
 통합합니다. 이전할 수 없는 항목은 참고 사항에 나열합니다. 여기에는 알 수 없는 모델 제공업체 또는 모델 ID,
 `small_model`(omo에는 소형 모델 설정이 없음), omo에 대응하는 에이전트가 없는 에이전트 이름이 포함됩니다
 (omo의 에이전트는 `explore`, `librarian`, `plan-consultant`, `plan-reviewer`와 세 명의
 `omo-native-*` 리뷰어입니다). OpenCode 버전의 `build`/`plan`, `oracle` 같은 에이전트는 보고만
 하며 새 에이전트로 변환하지 않습니다. `[native]` 또는 최상위 수준에 이미 있는 키는 유지합니다. `omo.jsonc`는
 주석을 보존하도록 제자리에서 편집하며, 먼저 타임스탬프가 붙은 백업을 만듭니다. 두 번째 실행에서는 모든 작업이 이미
 완료되었다고 보고하고 아무것도 쓰지 않습니다. 요약에는 항상 [에이전트-모델 매칭 가이드](../../04-에이전트-모델-매칭-가이드/01-출시-게이트가-적용된-Fable-55-준비.md#에이전트-모델-매칭-가이드)가
 포함됩니다. 설정에서 가져올 항목이 없을 때만 사용자 지정 엔드포인트에 바로 붙여 넣을 수 있는 설정 조각도 출력합니다.
 이전한 사용자 지정 모델 제공업체와 모델 선택을 제외하면 설치 프로그램은 모델 설정을 작성하지 않습니다. 가져온 뒤에는
 카운터 블록(`imported: N`, `mcp-imported: N`, `providers-imported: ...`,
 `model-choices-carried: ...`)으로 기록된 항목을 보고합니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="../04-LLM-에이전트용-설치-절차/01-개요.md"><b>개요</b> →</a></p>

<sub>← 이전: <a href="05-OmO-Native-omo-ai로-설치.md">OmO Native: omo-ai로 설치</a></sub>
