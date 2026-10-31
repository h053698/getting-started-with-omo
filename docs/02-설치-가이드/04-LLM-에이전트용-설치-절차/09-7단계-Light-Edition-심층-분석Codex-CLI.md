<sub><a href="../../README.md">목차</a> › <a href="../README.md">설치 가이드</a> › <a href="README.md">LLM 에이전트용 설치 절차</a></sub>

### 7단계: Light Edition 심층 분석(Codex CLI)

`--platform=opencode`인 경우 이 섹션을 건너뛰세요. 그 외에는 **Light
에디션**(`omo-codex`)이 설치된 상태입니다. 아래에서 디스크에 설치된 항목과 각 항목의 기능을 설명합니다.

#### 무엇이 설치되었나

- **플러그인 캐시:** `~/.codex/plugins/cache/sisyphuslabs/omo/<version>/`
- **Codex 마켓플레이스 스냅샷:** `~/.codex/.tmp/marketplaces/sisyphuslabs/`(로컬 마켓플레이스
  메타데이터 및 번들 소스 스냅샷)
- **사용자 계정에 연결된 구성 요소 바이너리:** `lazycodex-executor-verify`, `omo-comment-checker`,
  `omo-git-bash-hook`, `omo-lsp`, `omo-rules`, `omo-ulw-execute-continuation`,
  `omo-telemetry`, `omo-ulw-loop`, `omo-ultrawork`, `ulw` 및 `ulw-loop`가
  `~/.local/bin`(설정된 경우 `$CODEX_LOCAL_BIN_DIR`) 아래에 설치됩니다. `teammode`는 사용자 계정에 연결된
  실행 파일이 아니라 스킬, 훅, 스크립트를 통해 실행됩니다. 최상위 `omo-agent-toolkit` 명령은 Codex 구성 요소가 아닌
  공유 oh-my-openagent 실행기에 속합니다.
- **Codex 에이전트 역할:**
  `~/.codex/agents/{lazycodex-clone-fidelity-reviewer,lazycodex-code-reviewer,lazycodex-gate-reviewer,lazycodex-qa-executor,lazycodex-worker-low,lazycodex-worker-medium,lazycodex-worker-high,explorer,librarian,metis,momus,plan}.toml`(`lazycodex-executor`
  에이전트 TOML은 없습니다. 실행기 완료는 `lazycodex-executor-verify` 훅/바이너리가 처리합니다). 번들 플러그인
  스냅샷에서 복사되므로 Codex가 이전 플러그인 캐시 버전이나 임시 마켓플레이스 상태를 정리해도 계속 참조할 수 있습니다.
- **Codex 에이전트 역할:** 번들 플러그인 스냅샷에서 복사된
  `~/.codex/agents/*.toml`(`lazycodex-executor` 에이전트 TOML은 없으며 실행기 완료는
  `lazycodex-executor-verify` 훅/바이너리가 처리합니다). Codex가 이전 플러그인 캐시 버전이나 임시 마켓플레이스
  상태를 정리해도 계속 참조할 수 있습니다.
- **Codex 설정 변경:** `~/.codex/config.toml`에 `[features] plugins = true`,
  `[features] plugin_hooks = true`,
  `[features.multi_agent_v2] max_concurrent_threads_per_session = 16`(MultiAgentV2를
  사용하지 않는 경우 `[agents] max_threads = 1000`),
  `~/.codex/plugins/cache/sisyphuslabs`를 가리키는 `[marketplaces.sisyphuslabs]`,
  `[plugins."omo@sisyphuslabs"]`, 플러그인 MCP 정책 블록, SHA256으로 고정된
  `[hooks.state."omo@sisyphuslabs:..."]` 항목이 추가됩니다. 허용되는 경우 자율 권한 설정도 선택적으로 추가됩니다.

#### 구성 요소

- **구성요소: `rules`**
  - 언어: 타입스크립트
  - Codex 훅: `SessionStart`, `UserPromptSubmit`, `PostToolUse`, `PostCompact`
  - 역할: `AGENTS.md`, `CLAUDE.md`, `.omo/rules/**`를 Codex 컨텍스트에 삽입합니다.
- **구성요소: `comment-checker`**
  - 언어: 타입스크립트
  - Codex 훅: `PostToolUse`(`apply_patch`, `edit`, `write`)
  - 역할: 생성된 코드에서 AI-slop 주석 패턴을 차단합니다.
- **구성요소: `git-bash`**
  - 언어: 타입스크립트 + MCP
  - Codex 훅: `PreToolUse`(`Bash`), `PostCompact`, MCP 서버
  - 역할: Windows에서 `git_bash`를 제공합니다. 첫 번째 셸 관련 호출 전과 컨텍스트 압축 후에 Codex에 다시 알립니다.
- **구성요소: `lazycodex-executor-verify`**
  - 언어: 타입스크립트
  - Codex 훅: `SubagentStop`
  - 역할: 작업 완료를 인정하기 전에 LazyCodex 구현 담당자의 증빙 기록을 요구합니다.
- **구성요소: `lsp`**
  - 언어: 타입스크립트 + MCP
  - Codex 훅: MCP 서버 + 편집 후 훅
  - 역할: MCP를 통해 LSP 진단, 탐색, 기호 조회, 이름 바꾸기 기능을 제공합니다.
- **구성요소: `teammode`**
  - 언어: TypeScript + 스킬
  - Codex 훅: `PostToolUse` 및 스크립트 기반 스킬
  - 역할: 지속되는 팀 상태와 스레드 제목 지침을 활용해 Codex 기본 에이전트 또는 앱 스레드를 조정합니다.
- **구성요소: `ultrawork`**
  - 언어: 타입스크립트
  - Codex 훅: `UserPromptSubmit` 키워드 감지기
  - 역할: `ulw`/`ultrawork` 키워드를 감지합니다. 설치 프로그램은 번들로 제공되는 Codex 에이전트 TOML을
    `$CODEX_HOME/agents`에 연결합니다.
- **구성요소: `ulw-loop`**
  - 언어: 타입스크립트
  - Codex 훅: `UserPromptSubmit`, `PreToolUse`, `Stop`
  - 역할: `.omo/ulw-loop/`의 증거 감사 추적, 서브에이전트 생성 제한, Stop 훅의 자동 재개 기능을 갖춘 다중 목표
    오케스트레이션을 제공합니다.
- **구성요소: `ulw-execute-continuation`**
  - 언어: 타입스크립트
  - Codex 훅: `Stop`, `SubagentStop`
  - 역할: Codex가 종료 시점에 일시 중지되면 `.omo/boulder.json`의 ulw-execute 계획을 이어서 실행합니다.
- **구성요소: `telemetry`**
  - 언어: 타입스크립트
  - Codex 훅: `SessionStart`
  - 역할: 활성화된 경우 익명화된 일일 활성 사용 원격 측정 이벤트를 전송합니다.

#### OpenCode와의 공존

Codex CLI Light 버전과 OpenCode 플러그인은 함께 실행할 수 있습니다. 각 하네스는 하네스별 `[opencode]`,
`[senpi]`, `[codex]` 설정을 통해 통합된 `omo.jsonc`를 읽지만, 런타임 상태와 모델 선택은 하네스별로
유지됩니다. 일일 원격 측정 이벤트도 각각 전송합니다.

호환성 참고 사항: LazyCodex는 `oh-my-openagent`의 Codex 플랫폼용 OmO 설치 경로입니다.
`~/.codex/agents`에는 번들로 제공되는 Codex 기본 서브에이전트가 있어야 합니다. 하나의 `CODEX_HOME`에서
Codex용 OmO와 LazyCodex를 중복 설치해 활성화하지 마세요. `omo@sisyphuslabs` Codex 플러그인 소스는
하나만 활성 상태로 유지하세요. 설정 상태가 혼란스럽다면 캐시나 설정 상태를 삭제하기 전에 `npx lazycodex-ai doctor`를 실행하세요.

#### Codex 문제 해결

- **`codex --help`에 omo 플러그인이 표시되지 않음**: `npx lazycodex-ai install`을 다시 실행하세요.
  재실행해도 안전하며
  훅 해시가 다시 계산됩니다.
- **`command not found: omo-rules` 또는 `command not found: omo-agent-toolkit`**:
  `~/.local/bin`을 `PATH`에 추가하거나, `$CODEX_LOCAL_BIN_DIR`를 이미 `PATH`에 포함된 디렉터리로 설정하세요.
- **설치 중 `npm install` 실패**: `rm -rf ~/.codex/plugins/cache/sisyphuslabs`를 실행한 뒤
  다시 시도하세요.
- **플러그인 블록은 있지만 훅가 실행되지 않음**: `~/.codex/config.toml`에
  `[features]\nplugins = true\nplugin_hooks = true`와
  `[plugins."omo@sisyphuslabs"]`가 포함되어 있는지 확인하세요.
- **`Ignoring malformed agent role definition: agents.*.config_file must point
  to an existing file`**:
  `npx lazycodex-ai install`을 다시 실행하세요. 설치 프로그램이 오래된 관리 대상 `[agents.*]` 항목을 복구하고
  `~/.codex/agents/*.toml`을 다시 생성합니다.
- **특정 프로젝트에서
  `agents.max_threads cannot be set when multi_agent_v2 is enabled` 발생**: 해당 프로젝트에서
  `npx lazycodex-ai install`을 다시 실행하세요. 설치 프로그램이 프로젝트 로컬 `.codex/config.toml`
  설정을 복구하고, 변경되는 설정의 `.backup-<timestamp>` 파일을 만들며, 사용자가 작성한 `.codex` 파일은
  그대로 유지합니다.
- **`components/*/dist/cli.js`의 `MODULE_NOT_FOUND`가 포함된
  `SessionStart hook (failed)`/`UserPromptSubmit hook (failed)`**: 설치 프로그램을 다시
  실행해 캐시된 플러그인의
  구성요소 `dist/` 파일을 다시 빌드하세요. 캐시를 수동으로 편집했다면 먼저
  `~/.codex/plugins/cache/sisyphuslabs`를 삭제하세요.
- **설치 후 `hook exited with code 1`만 표시되는
  `SessionStart hook (failed)`/`UserPromptSubmit hook (failed)`**:
  `npx lazycodex-ai install`을 다시 실행한 뒤 새 Codex 세션을 시작하거나 Codex 앱을 다시 시작하세요. 새
  세션에서도 같은 훅가 실패한다면 캐시 상태를 삭제하기 전에 저장된 훅 출력을 확인해 문제가 발생한 구성요소 명령을 찾으세요.
- **훅 신뢰 해시 불일치 경고**: 설치 프로그램을 다시 실행하세요. 해시는 설치할 때마다 다시 생성됩니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="10-8단계-팀-모드선택-사항.md"><b>8단계: 팀 모드(선택 사항)</b> →</a></p>

<sub>← 이전: <a href="08-6단계-처음-사용-모드-명령-에이전트-스킬.md">6단계: 처음 사용 - 모드, 명령, 에이전트, 스킬</a></sub>
