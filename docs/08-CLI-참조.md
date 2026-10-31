## CLI 참조

배포된 CLI 패키지의 전체 참조 문서입니다. 이름 변경 전환 기간에는 두 패키지 이름을 모두 사용할 수 있습니다.

- `oh-my-openagent`(기본 패키지 이름)
- `oh-my-opencode`(호환성 패키지 이름)

`opencode.json`에서 플러그인을 등록할 때는 `oh-my-openagent`를 사용하는 것이 좋습니다.

## 실행 파일 명령

배포된 모든 패키지는 다음 bin 항목을 통해 동일한 컴파일된 CLI를 제공합니다.

- `omo-agent-toolkit`(짧은 이름으로, 문서 및 프롬프트에서 사용 권장)
- `oh-my-openagent`(기본 패키지 이름과 일치하는 이름)
- `oh-my-opencode`(레거시 호환성 이름)
- `lazycodex`(라이트 버전 바로 가기, 설치 기본값은 `--platform=codex`)
- `lazycodex-ai`(라이트 버전 바로 가기, 설치 기본값은 `--platform=codex`)

기존 `omo` 실행 파일은 이번 메이저 릴리스의 패키지에서 제거되었습니다. 이제 이 이름은 OmO Native 버전에서 사용합니다.

| 실행 파일 | 패키지 | 배포 채널 | 설명 |
| --- | --- | --- | --- |
| `omo` | `omo-ai` | bun(권장): `bun add -g omo-ai`; npm 대안: `npm i -g omo-ai` | 전체 OMO 확장을 로드한, 버전이 고정된 Senpi 릴리스를 시작합니다. 사전 릴리스 빌드는 `omo-ai@beta`로 배포됩니다. [omo-ai 배포 런북](/ko/omo-ai-publishing.md)을 참조하세요. |

`omo-agent-toolkit` npm bin은 위의 래퍼 패키지와 함께 계속 제공됩니다. `omo-ai`는 이 bin 항목을 선언하지 않습니다.

### omo 계정(OmO Native)

`omo account show [--account <id>]`, `adopt
[--replace]`, `token`, `export` 및 `forget`은 `omo login`에서
사용하는 OS 키체인의 로그인 정보를 공유합니다. 이 머신용 인터페이스는 `adopt`의 자격 증명을 stdin으로 받고, JSON
응답을 stdout으로 출력합니다. 진단 메시지는 stderr로 출력합니다.

| 종료 | 결과 |
| --- | --- |
| 0 | 성공 |
| 1 | 기타 작업 실패 |
| 2 | 잘못된 인수 또는 자격 증명 입력 |
| 3 | 다른 장치의 자격 증명을 가져오려면 `--replace`가 필요합니다. |
| 4 | 로그아웃 상태입니다. |
| 5 | 세션이 종료되었습니다. JSON 응답에 거부 코드가 포함됩니다. |
| 6 | 갱신 결과가 불확실합니다. 보관된 자격 증명을 다시 사용해서는 안 됩니다. |
| 7 | 키체인이 잠겨 있습니다: `{"keychain":"locked"}` |
| 8 | 키체인을 사용할 수 없습니다: `{"keychain":"unavailable"}` |
| 9 | 네이티브 저장소 오류 또는 시간 초과: `{"error":"store-unavailable"}` |

저장소 오류가 발생하면 명령은 다른 저장소를 읽지 않고 오류를 보고합니다. 다만 네이티브 작업이 완료될 때까지는 계속 기다립니다. 명령에 별도의
제한 시간을 적용하거나
프로세스를 강제로 종료하지는 않습니다. 따라서 기본 시간 초과까지 여전히 약 25초가 걸릴 수 있지만, 오류 처리기에서 같은 시간만큼 다시
기다리지는 않습니다.

## 기본 사용법

```bash
# 도움말 표시(선호 패키지)
bunx oh-my-openagent

# 호환성 패키지
bunx oh-my-opencode
```

## 명령

- **`install`/`setup`**: 대화형 설정 마법사
- **`uninstall`/`cleanup`**: 관리 대상 Codex Light 상태 제거
- **`doctor`**: 설치 상태 진단
- **`run <message>`**: 완료를 강제하는 기능이 포함된 비대화형 OpenCode 세션 실행기
- **`get-local-version`**: 현재 설치된 버전 표시 및 업데이트 확인
- **`refresh-model-capabilities`**: models.dev의 캐시된 모델 기능 스냅샷 새로 고침
- **`config migrate`**: 레거시 OMO 설정을 `~/.omo/omo.jsonc`의 통합 설정으로
  마이그레이션합니다(`--dry-run`은 파일을 쓰지 않고 변환 및 백업 계획을 출력하며, `--json`은 기계 판독 가능한 보고서를 생성합니다).
- **`worktree-sweep`**: 오래된 연결 git 작업 트리를 보고하고 선택적으로 제거합니다. 기본 분기에 병합되었고 작업
  디렉터리가 깨끗하면
  SWEEP으로, 잠겨 있거나 외부에 있거나 병합되지 않았거나 변경 사항이 있거나 이 명령을 실행한 작업 트리이면 KEEP으로 표시합니다.
  경로가 사라진 작업 트리 정보는 정리합니다. 기본적으로
  모의 실행하며, `--apply`를 지정하면 `git worktree remove`로 작업 트리를 제거하고
  정리합니다. 강제 제거는 하지 않습니다. `--older-than <days>`는 경과 기간에 따른 대체 기준을 추가하고,
  `--repo <path>`는 반복해서 지정할 수 있으며, `--json`은
  기계 판독 가능한 출력을 생성합니다.
- **`ulw-loop [args...]`**: Codex LazyCodex ulw-loop CLI에 인수 전달
- **`update`**: `lazycodex`/`lazycodex-ai` 저장소 전용: 설치된 Codex Light 버전을 현재 위치에서
  업데이트합니다(`--dry-run`, `--repo-root <path>`).
- **`boulder`**: 주요 작업 상태(활성 계획, 현재 작업의 시간 정보, 세션 수)를
  확인합니다. `-d/--directory`, `-w/--work-id`, `--json`을 지원합니다.
- **`version`**: CLI 버전 표시
- **`mcp oauth`**: MCP 서버의 OAuth 토큰 관리

---

## install

초기 설정을 위한 대화형 설치 도구입니다.

### 사용법

```bash
bunx oh-my-openagent install
```

### 옵션

- **`--no-tui`**: 비대화형 모드로 실행합니다. 필요한 옵션을 모두 지정해야 합니다.
- **`--platform <value>`**: 설치 대상 버전: `opencode`(Ultimate, 기본값), `codex`(Light)
  또는 `both`
- **`--claude <value>`**: Claude 구독: `no`, `yes`, `max20`(Ultimate에만 해당)
- **`--openai <value>`**: OpenAI/ChatGPT 구독: `no`, `yes`(Ultimate에만 해당)
- **`--gemini <value>`**: Gemini 통합: `no`, `yes`(Ultimate에만 해당)
- **`--copilot <value>`**: GitHub Copilot 구독: `no`, `yes`(Ultimate에만 해당)
- **`--opencode-zen <value>`**: OpenCode Zen 이용 여부: `no`, `yes`(Ultimate에만 해당)
- **`--zai-coding-plan <value>`**: Z.ai 코딩 플랜 구독: `no`, `yes`(Ultimate에만 해당)
- **`--kimi-for-coding <value>`**: Kimi for Coding 구독: `no`, `yes`(Ultimate에만 해당)
- **`--opencode-go <value>`**: OpenCode Go 구독: `no`, `yes`(Ultimate에만 해당)
- **`--bailian-coding-plan <value>`**: Bailian 코딩 플랜 구독: `no`, `yes`(Ultimate에만 해당)
- **`--minimax-cn-coding-plan <value>`**: minimaxi.com을 통한 MiniMax 코딩
  플랜: `no`, `yes`(Ultimate에만 해당)
- **`--minimax-coding-plan <value>`**: minimax.io를 통한 MiniMax 코딩
  플랜: `no`, `yes`(Ultimate에만 해당)
- **`--vercel-ai-gateway <value>`**: Vercel AI Gateway: `no`, `yes`(Ultimate에만 해당)
- **`--codex-autonomous`**: Light/Both 설치의 기본 동작입니다.
  `approval_policy = "never"`가 전달되지
  않으면 `sandbox_mode = "danger-full-access"`와 `network_access`를 기록하고 기존
  최상위 `--no-codex-autonomous` 키를 제거합니다. 이 플래그를 명시적으로 전달할 필요는 없습니다.
- **`--no-codex-autonomous`**: Light 또는 Both를 설치할 때 기존 Codex 권한 설정을 변경하지 않고 유지합니다.
- **`--skip-auth`**: 인증 설정 안내를 건너뜁니다.

`lazycodex` 또는 `lazycodex-ai` 저장소 별칭을 사용하면 `install`의 기본 설정은 `--platform=codex`가
됩니다. 이 별칭은 npm bin 별칭입니다. 별도의 LazyCodex 저장소 ID는 마켓플레이스 `sisyphuslabs`와 `omo`에서 활성화된
플러그인 `omo@sisyphuslabs`를 사용하고 마켓플레이스 소스가 `~/.codex/plugins/cache/sisyphuslabs` 아래의
로컬 빌드 캐시로 설정된 Codex 설정을 변경하지 않습니다.

구독 플래그(`--claude`, `--openai` 등)는 `--platform`이 `opencode` 또는 `both`인 경우에만 적용됩니다.
Light 버전은 OpenCode 모델 설정을 작성하지 않으므로 `--platform=codex`에서는
이 플래그가 거부됩니다. `--codex-autonomous`와 `--no-codex-autonomous`는 선택한 플랫폼에 Codex가 포함된
설치에만
영향을 미칩니다.

### 원격 측정 및 수집 거부

익명 원격 측정에는 PostHog를 사용하며, 컴퓨터 ID 접두사와 호스트 이름을 SHA-256으로 해시한 값을 함께 전송합니다. 이 값은
설치별 식별자가 아닙니다. 다음 두 가지
이벤트 스트림이 있습니다.

- `omo_daily_active`: 기본 플러그인을 로드할 때(`reason: "plugin_loaded"`)
  또는 `oh-my-openagent run`을 실행할 때(`reason: "run_started"`) 발생합니다.
-
  `omo_codex_daily_active`: `omo-agent-toolkit install
  --platform=codex` 또는 `--platform=both`로 설치할 때(`reason: "install_completed"`)
  발생하며, 모든 Codex 세션에서는 Codex 플러그인의 `SessionStart` 훅가 `reason: "session_start"`로
  발생시킵니다. 두 소스는 UTC 날짜를 기준으로 동일한 중복 제거 처리를 공유하므로 일간/주간/월간 활성 수는 설치 이벤트뿐 아니라 실제 Codex
  사용량도 반영합니다.

수집 거부 환경 변수:

- oh-my-openagent 및 omo-codex 전체의 수집 거부: `OMO_SEND_ANONYMOUS_TELEMETRY=0` 또는 `OMO_DISABLE_POSTHOG=1`
- `omo_codex_daily_active`의 Codex 전용 수집 거부:
  `OMO_CODEX_SEND_ANONYMOUS_TELEMETRY=0` 또는 `OMO_CODEX_DISABLE_POSTHOG=1`

OpenCode 플러그인은 oh-my-openagent 설정에 `"telemetry": false`를 지정해서 수집을 거부할 수도 있습니다.

전체 Codex Light 이벤트 목록, 수집 속성, 로컬 상태 경로 및 lazycodex 마켓플레이스 복사본 경로는 [Codex Light
원격 측정](/ko/codex-telemetry.md)을 참조하세요.

---

## uninstall / cleanup: 제거와 정리

관리 대상 Codex Light 상태를 제거합니다. `cleanup`은 기본 명령 이름이며, `uninstall`은 사용자용 별칭입니다. 두
명령 모두
동일한 Codex Light 정리 작업을 실행합니다.

### 제거 / 정리 사용법

```bash
npx lazycodex-ai uninstall
omo-agent-toolkit uninstall --platform=codex
```

### 제거 / 정리 옵션

- **`--platform codex`**:
  공유 `lazycodex-ai` CLI를 사용할 때 `OMO_INVOCATION_NAME`이
  `omo-agent-toolkit` 또는 `lazycodex`가 아니면 필요합니다.
- **`--codex-home <path>`**: 정리할 Codex 홈 디렉터리(기본값: `CODEX_HOME` 또는 `~/.codex`)
- **`--project <path>`**: 프로젝트 로컬의 레거시 Codex 파일을 검사할 프로젝트 디렉터리
- **`--json`**: 구조화된 JSON 결과 출력

이 명령은 관리형 플러그인 캐시와 마켓플레이스 스냅샷을 제거합니다. 또한 백업을 생성한 후 `~/.codex/config.toml`에서
`sisyphuslabs`, `lazycodex` 및 레거시 `code-yeongyu-codex-plugins` 마켓플레이스와 관련된 관리형 마켓플레이스,
플러그인, 훅 상태, 에이전트 블록을 제거합니다. `~/.codex/agents/`의 관리형 에이전트 TOML 파일도 제거하며, 여기에는 설치
매니페스트가 이미 삭제되어 연결이 끊긴 파일도 포함됩니다. 관리형 저장소와 관리형 런타임 디렉터리 트리도 제거합니다. 프로젝트 소유의
`.codex` 파일은 삭제하지 않고
보고만 합니다.

---

## doctor 진단

환경과 설정을 진단합니다. OpenCode 검사는 **시스템**, **설정**, **TUI 플러그인**, **더 이상 사용되지 않는 추론 키**,
**도구**, **모델**, **원격 측정**, **팀 모드**로 구분됩니다. Codex를 대상으로 할 때는 별도의 Codex 검사 세트를 실행합니다.

### doctor 사용법

```bash
bunx oh-my-openagent doctor
```

### doctor 옵션

| 옵션 | 설명 |
| --- | --- |
| `--status` | 간략한 시스템 대시보드 표시 |
| `--verbose` | 자세한 진단 정보 표시 |
| `--json` | 결과를 JSON 형식으로 출력 |
| \`--platform <opencode | codex>\` |

### 참고 사항

- 현재 OpenCode 최소 버전 요구 사항은 `>= 1.4.0`입니다.
- doctor 명령은 `opencode.json`에 레거시 플러그인 등록(`oh-my-opencode`)이 남아 있으면 경고합니다.
- OmO Native의 `doctor` 하위 명령은 데스크톱 세션을 열거나 OS 권한을 요청하지 않고 컴퓨터 사용 기능(실험적)의 상태를
  보고합니다. 출력 내용은
  다음과 같습니다.
  - 실제 적용되는 기본 설정에서 컴퓨터 사용 기능을 사용할 수 있는지 여부와 호스트 지원 여부
    - 선택된 엔진 경로와 버전, 프로토콜, ABI 또는 엔진 위치 진단 결과와 시도한 모든 경로
    - 백엔드와 캡처, 입력, 접근성 권한 상태
    - 디스플레이 수와 화면 잠금 상태
    - 컴퓨터 사용 기능이 입력을 시작하기 전까지 중지 경로는 비활성 상태로 보고됩니다. 엔진이 중지 코드를 활성화한 후에만 해당 경로가 활성화되기
      때문입니다. 진단 프로브는 읽기 전용 `engine.hello` 및 `capabilities` 요청만 보내며, doctor의 시간
      제한을 따릅니다.
- `omo doctor --models [--json]`(OmO Native)는 모든 작업 카테고리와 에이전트의 모델 결정 결과를 즉시
  출력합니다. 여기에는
  먼저 실행되는 모델, 순서대로 나열한 런타임 재시도 모델, 출처(`built-in`, `omo.json`, `category:<name>`),
  상태(`runs first`, `fallback N`, `excluded by exclude_models`, `no login`, `not reached`),
  메인 세션의 `model_profile` 경로가 포함됩니다. 생성된 모델 결정 모듈과 엔진의 오프라인 모델 목록을 사용하며 자격 증명은
  조회하지 않습니다.
  모델 결정 런타임을 로드할 수 없으면 종료 코드 1을 반환하고, `--json` 이외의 옵션을 사용하면 종료 코드 2를 반환합니다. 모든
  대체 모델 순서에서 특정 모델을 제외하려면
  [`exclude_models`](/ko/omo-json.md#exclude_models-native-harness)를 참조하세요.

---

## run 실행

비대화형 세션을 실행하며, 다음 조건을 모두 충족해야 종료됩니다.

- 메인 세션이 유휴 상태입니다.
- 모든 할 일이 완료되거나 취소되었습니다.
- 모든 하위 세션이 유휴 상태입니다.
- 연속 실행 훅(boulder, ralph-loop 또는 todo-hook 마커)가 활성화되어 있지 않습니다.

### run 사용법

```bash
bunx oh-my-openagent run <message>
```

### run 옵션

| 옵션 | 설명 |
| --- | --- |
| `-a, --agent <name>` | 사용할 에이전트(기본 에이전트 선택 순서 적용) |
| `-m, --model <provider/model>` | 모델 재정의(예: `anthropic/claude-sonnet-4`) |
| `-d, --directory <path>` | 작업 디렉터리 |
| `-p, --port <port>` | 서버 포트(이미 사용 중이면 해당 포트에 연결) |
| `--attach <url>` | 기존 OpenCode 서버 URL에 연결 |
| `--on-complete <command>` | 완료 후 셸 명령 실행 |
| `--json` | 구조화된 JSON 결과 출력 |
| `--no-timestamp` | 출력의 타임스탬프 접두사 비활성화 |
| `--verbose` | 전체 이벤트 스트림 표시(기본값: 메시지/도구만 표시) |
| `--session-id <id>` | 기존 세션 재개 |

### 에이전트 선택 순서

1. `--agent`
2. `OPENCODE_DEFAULT_AGENT`
3. 플러그인 설정의 `default_run_agent`

`--agent`에는 설정 키(`sisyphus`, `prometheus`)와 다시 매핑된 표시
이름(`Sisyphus - ultraworker`)을 사용할 수 있습니다. 내장
카테고리(`quick`, `deep`, `ultrabrain`, `unspecified-high` 및 `task(category=...)`에서
사용하는 기타
카테고리)는 CLI 에이전트가 아닙니다. `oh-my-openagent run --agent quick`을 실행하면 실행 가능한 에이전트 이름을
안내하는 오류가 발생합니다.

`opencode run --agent`는 호스트에서 키가 정확히 일치하는 에이전트를 조회합니다. `oh-my-openagent run --agent`를
사용하거나 다시 매핑된 표시 이름을 전달하세요. 호스트에서 알 수 없는 `--agent` 값을 받으면 다른 에이전트로 실행하지 않고 실패
처리해야 합니다(OpenCode CLI 참조).

---

## get-local-version: 로컬 버전 조회

로컬 플러그인의 버전과 업데이트 상태를 표시합니다.

### 로컬 버전 조회 사용법

```bash
bunx oh-my-openagent get-local-version
```

### 로컬 버전 조회 옵션

| 옵션 | 설명 |
| --- | --- |
| `-d, --directory <path>` | 플러그인/설정 감지에 사용할 작업 디렉터리 |
| `--json` | 스크립트에서 사용할 수 있도록 JSON으로 출력 |

---

## refresh-model-capabilities: 모델 기능 갱신

models.dev에서 가져와 캐시한 모델 기능 스냅샷을 새로 고칩니다.

### 모델 기능 새로 고침 사용법

```bash
bunx oh-my-openagent refresh-model-capabilities
```

### 모델 기능 새로 고침 옵션

| 옵션 | 설명 |
| --- | --- |
| `-d, --directory <path>` | 플러그인 설정을 읽을 작업 디렉터리 |
| `--source-url <url>` | models.dev 소스 URL 재정의 |
| `--json` | 새로 고침 요약을 JSON으로 출력 |

### 모델 기능 갱신 설정

```jsonc
{
  "model_capabilities": {
    "enabled": true,
    "auto_refresh_on_start": true,
    "refresh_timeout_ms": 5000,
    "source_url": "https://models.dev/api.json"
  }
}
```

---

## version

CLI 패키지 버전을 표시합니다.

### version 사용법

```bash
bunx oh-my-openagent version
```

---

## mcp oauth: 인증 관리

MCP 서버의 OAuth 토큰을 관리합니다. 서버가 지원하는 경우 PKCE와 동적 클라이언트 등록을 포함한 Tier-3 MCP OAuth 흐름을
사용합니다.

### mcp 인증 사용법

```bash
# 인증하다
bunx oh-my-openagent mcp oauth login <server-name> --server-url https://api.example.com

# 명시적인 클라이언트 ID 및 범위로 인증
bunx oh-my-openagent mcp oauth login <server-name> --server-url \
  https://api.example.com --client-id my-client --scopes read write

# 저장된 토큰 제거
bunx oh-my-openagent mcp oauth logout <server-name> --server-url https://api.example.com

# 토큰 상태 표시
bunx oh-my-openagent mcp oauth status [server-name]
```

### mcp 인증 옵션

| 옵션 | 설명 |
| --- | --- |
| `--server-url <url>` | OAuth 서버 URL(`login`과 `logout`에 모두 필요) |
| `--client-id <id>` | OAuth 클라이언트 ID(서버가 DCR을 지원하면 선택 사항) |
| `--scopes <scopes...>` | 여러 값을 지정할 수 있는 OAuth 범위 |

---

## 종료 코드

- 성공 시 `0`
- 실패 시 `1`
- boulder 상태 파일이 존재하지만 읽을 수 없으면 `2`
- `run`이 중단되면 `130`

`run`, `install`, `uninstall`/`cleanup`, `doctor`, `get-local-version`,
`refresh-model-capabilities`, config
migrate`,`boulder`,`ulw-loop` 및 `mcp oauth` 하위
명령은 명시적인 숫자 종료 코드를 반환합니다.

