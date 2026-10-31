<a href="../../README.md">목차</a> › <a href="../README.md">설치 가이드</a> › <a href="README.md">사용자를 위한 안내</a>

### Codex 마켓플레이스에서 설치(앱 내)

> **실험적인 추가 설치 경로입니다.** 위의 `npx lazycodex-ai install`는 계속해서 완전히 지원되는 기본 경로입니다. 마켓플레이스
> 번들은 이 프로젝트의 자체 [lazycodex](https://github.com/code-yeongyu/lazycodex) 저장소에서
> 호스팅됩니다. OpenAI가 선별한 목록은 아닙니다.

동일한 Light 에디션을 npx 단계 없이 Codex 내부의 플러그인 마켓플레이스에서 바로 설치할 수도 있습니다.

**TUI 설치 경로.** Codex 세션에서 `/plugins`를 입력하고 **마켓플레이스 추가** 탭("Git 저장소 또는 로컬 루트에서
마켓플레이스 추가")을 연 뒤 마켓플레이스 소스를 입력하세요.

```text
https://github.com/code-yeongyu/lazycodex
```

그런 다음 동일한 `/plugins` 메뉴에서 `sisyphuslabs` 마켓플레이스의 `omo`를 선택해 설치하세요.

**CLI 경로**: 동일한 작업을 수행하는 두 줄짜리 경로:

```bash
codex plugin marketplace add https://github.com/code-yeongyu/lazycodex
codex plugin add omo@sisyphuslabs
```

**첫 번째 세션: 훅를 승인하세요.** 다음에 `codex`를 실행하면 시작 훅 검토에 모든 omo 훅가 새 훅로 표시됩니다.
내용을 검토한 뒤 승인하세요. 승인 전에는 omo 훅가 실행되지 않으므로, 훅를 신뢰하고 승인해야 아래 부트스트랩을 시작할 수 있습니다.

**부트스트랩 알림 및 재시작.** 훅를 승인한 첫 번째 세션에는 다음 상태 줄이 출력됩니다.

```text
LazyCodex 부트스트랩이 백그라운드에서 실행 중입니다. 완료되면 세션을 다시 시작하세요
```

별도의 작업자가 백그라운드에서 설치를 마칩니다(`sg` 다운로드에 시간이 가장 오래 걸립니다). 완료되면 Codex 세션을 다시 시작하세요.
다음 세션부터는 모든 구성 요소가 연결된 상태로 시작되며 알림도 더 이상 표시되지 않습니다.

**부트스트랩에서 수행하는 작업:**

- 관리형 `~/.codex/config.toml` 블록을 작성합니다. 마켓플레이스 소스를 보존하고, `omo@sisyphuslabs`
  플러그인을 활성화하며,
  `[agents.*]` 항목을 관리하고 SHA256 `[hooks.state."omo@sisyphuslabs:..."]` 신뢰 해시를 다시 기록합니다.
- 번들로 제공되는 Codex 에이전트 TOML을 `~/.codex/agents/`에 복사합니다.
- 최상위 `omo-agent-toolkit` 런타임 래퍼와 구성 요소 CLI(`omo-rules`, `omo-lsp`, …)를
  `~/.local/bin`에 연결합니다(`$CODEX_LOCAL_BIN_DIR`가 설정된 경우 해당 디렉터리를 사용하고, 격리된
  `CODEX_HOME` 설치에서는
  `<CODEX_HOME>/bin`을 사용합니다).
- `ast-grep` 스킬에 사용할 체크섬으로 버전이 고정된 독립 실행형 `sg`(ast-grep) 바이너리를
  `<CODEX_HOME>/runtime/ast-grep/<platform>-<arch>/`에 설치합니다.
- 기본 Windows 환경에서 `node`가 없으면 버전이 고정된 Node LTS 런타임을 `<CODEX_HOME>/runtime/node/`에
  설치합니다(아래 Windows 상태 참조).
- 모든 실행 내역을 플러그인 데이터 디렉터리의
  `<CODEX_HOME>/plugins/data/omo-sisyphuslabs/bootstrap/state.json`과 JSONL 형식의
  `bootstrap.log`에 기록합니다(Windows에서는 `ps-bootstrap.log` 실행 기록도 추가합니다).

**부트스트랩에서 수행하지 않는 작업:**

- **Codex 권한 설정은 변경하지 않습니다.** `approval_policy`, `sandbox_mode`,
  `network_access`는 그대로 유지됩니다. 자율 모드를 사용하려면 npx 설치 프로그램에서
  `npx lazycodex-ai install --no-tui --codex-autonomous`를 명시적으로 선택해야 합니다([한 줄 설치
  섹션](02-LightCodex-CLI-한-줄로-설치-에이전트-불필요.md#lightcodex-cli---한-줄로-설치-에이전트-불필요) 참조).
- 일반적인 마켓플레이스 관리형 설치에서는 npx 자체 업데이트를 실행하지 않습니다. 자동 업데이트 훅는 업데이트를 건너뛰었다고 기록하고
  대신 다음 안내를 표시합니다. "자동 업데이트 건너뛰기: 이 LazyCodex 설치는 Codex 플러그인 마켓플레이스에서 관리되므로 npx
  자체 업데이트가
  시작되지 않았습니다. `codex plugin marketplace upgrade sisyphuslabs`로 업그레이드하도록 안내하세요.
  업그레이드 후에는 Codex에서 훅를 다시 승인하라는 메시지가 표시됩니다." 훅가 오래된 로컬 마켓플레이스 캐시 또는 bin 상태(예:
  삭제된 페이로드를 가리키는 로컬 매니페스트나 관리형 `ulw` 링크)를 감지하면, 로컬 복구를 위해 npx 설치 프로그램을 실행하고
  이후 Codex 세션을 다시 시작하도록 요청할 수 있습니다.
- Codex가 관리하는 플러그인 캐시 디렉터리에는 아무것도 저장하지 않습니다. 모든 부트스트랩 상태는 위 플러그인 데이터 디렉터리에 저장됩니다.

**업그레이드 및 훅 승인 복구 절차:**

1. `codex plugin marketplace upgrade sisyphuslabs`를 실행합니다.
2. `codex`를 다시 실행하세요. 시작 훅 검토에 omo 훅가 **수정됨**으로 표시됩니다. 플러그인 파일이 변경되어 이전에 신뢰한
   해시가 더 이상 일치하지 않기 때문입니다. 업그레이드 후에는 정상적으로 발생하는 현상이며, 변조되었다는 뜻은 아닙니다.
3. 검토 화면에서 훅를 다시 승인하세요. 실수로 검토를 건너뛰었다면 `codex`를 다시 시작하면 됩니다. 승인할 때까지 검토 화면이 다시
   나타나며, 그동안 훅는 비활성화된 상태로 유지됩니다.
4. 다음 세션에서 새 버전의 부트스트랩이 다시 실행됩니다. 신뢰 해시를 다시 기록하고, 저장소와 에이전트를 다시 연결한 뒤 재시작
   알림을 표시합니다. 한 번 더 다시 시작하면 업그레이드된 버전을 사용할 수 있습니다.

**기능 저하 모드.** 부트스트랩의 일부 단계가 실패해도 치명적인 오류로 처리하지 않습니다. 실패한 단계는 `state.json`에 구성 요소별로
기록되고(`lastStatus: "degraded"`), 설치를 중단하는 대신 이후 세션에서 재시도합니다. 확인할 수 있는 증상과 대처 방법은
다음과 같습니다.

- **모드: `omo-agent-toolkit` 없음**
  - 증상: 설치된 페이로드가 오래되었거나 불완전해 루트 CLI 런타임이 없으므로 최상위
    `omo-agent-toolkit` 명령이 연결되지 않습니다. 현재 마켓플레이스 페이로드에는 `dist/cli/index.js`와
    `dist/cli-node/index.js`가 모두 포함되어 있으므로 새로 마켓플레이스를 설치했다면 발생하지 않아야 합니다. 구성 요소 CLI는
    정상적으로 연결됩니다.
  - 대처 방법: 마켓플레이스 플러그인을 업그레이드하거나 다시 설치한 뒤 새 Codex 세션을 시작해 부트스트랩에서 저장소를 다시
    연결하도록 하세요. `npx lazycodex-ai doctor`로 확인하세요. 임시 해결책으로만
    `npx lazycodex-ai <command>`를 사용하세요.
- **모드: `sg` 설치 대기 중/오프라인**
  - 증상: ast-grep 설치 항목이 기능 저하 목록에 나타나고 `ast-grep` 스킬에서 아직 `sg`를 찾지 못합니다.
    첫 다운로드가 진행 중이거나 오프라인 상태에서 실패한 경우입니다.
  - 대처 방법: 다른 세션을 시작해 부트스트랩에서 자동으로 재시도하게 하거나, ast-grep을 직접 설치하거나,
    `OMO_AST_GREP_SG_PATH=/path/to/sg`를 설정하세요. `npx lazycodex-ai doctor`로 확인하세요.
- **모드: 프록시 제한**
  - 증상: HTTP(S) 프록시 뒤에서 바이너리 다운로드가 실패합니다. 기록된 오류에는 부트스트랩 다운로더가
    "v1에서는 HTTP(S) 프록시를 통해 터널링하지 않습니다. 다운로드가 직접 시도되었습니다."라고 명시됩니다.
  - 대처 방법: 직접 연결할 수 있는 환경에서 세션을 한 번 실행하거나 `OMO_AST_GREP_SG_PATH`/`PATH`를 통해
    `sg`를 제공하세요.
    `npx lazycodex-ai doctor`로 확인하세요.
- **모드: OpenCode Windows 프록시 사전 설치**
  - 증상: OMO가 로드되기 전에 OpenCode가 시작되거나, 기본 에이전트만 표시되거나,
    `oh-my-openagent@latest` 설치 중
    `fetch() proxy.url must be a non-empty string` 오류가 기록됩니다.
  - 대처 방법: OpenCode를 실행하는 셸에서 `HTTP_PROXY`/`HTTPS_PROXY`를 설정한 뒤, OpenCode의
    Windows 설정 경로에 다음 명령으로 사전 설치하세요:
    `npm install oh-my-openagent@latest --prefix "%APPDATA%\\opencode"`.
    OpenCode를 다시 시작하고
    `bunx oh-my-openagent doctor --json`를 실행합니다.

**Windows 상태.** 기본 Windows 환경에서는 마켓플레이스 부트스트랩이 PowerShell 5.1 호환
`bootstrap.ps1`을 통해
실행됩니다. `node`가 없으면 버전이 고정된 Node LTS zip을 설치하고, npx 설치 프로그램과 같은 방식으로 Git Bash를
준비하며, 그 내용을 플러그인 데이터 디렉터리의 `ps-bootstrap.log`에 기록합니다(기능 저하 항목은
`degraded component=node reason=... hint=npx lazycodex-ai doctor`와 같은 형식입니다).
Windows 설치 절차에는 정적 테스트가 마련되어 있습니다. 실제 장치에서의 검증은 코드로 확인된 사실이 아니라 별도의 외부 추적기에서
관리합니다. 정적 테스트 결과를 실제 Windows 설치가 실행되었다는 증거로 간주하지 마세요.

---

<p align="right"><sub>다음 문서</sub><br><a href="04-직접-설치에-대한-참고-사항.md"><b>직접 설치에 대한 참고 사항</b> →</a></p>

<sub>← 이전: <a href="02-LightCodex-CLI-한-줄로-설치-에이전트-불필요.md">Light(Codex CLI) - 한 줄로 설치, 에이전트 불필요</a></sub>
