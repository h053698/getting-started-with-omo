<sub><a href="../../README.md">목차</a> › <a href="../README.md">설치 가이드</a> › <a href="README.md">사용자를 위한 안내</a></sub>

### Light(Codex CLI) - 한 줄로 설치, 에이전트 불필요

Light 설치 프로그램은 Codex를 자율 실행을 위한 전체 권한 모드로 설정할지 묻습니다. 에이전트 방식으로 사용할 때 권장되는 설정은
`approval_policy = "never"`, `sandbox_mode = "danger-full-access"`(이 설정에는 이미 무제한
네트워크
액세스가 포함됩니다), 알림 경고 숨김입니다. 이전 설치 프로그램이 남긴 레거시 최상위 `network_access` 키는 Codex가
`--strict-config`에서 거부하므로 제거합니다. 대화 없이 옵션을 지정하려면 `--codex-autonomous` 또는
`--no-codex-autonomous`를 사용하세요.

```bash
npx lazycodex-ai install
# 권장 비대화형 모드:
npx lazycodex-ai install --no-tui --codex-autonomous
```

설치 프로그램은 관리 대상 Codex 상태를 `~/.codex/`에 기록하며 OpenCode나 모델 제공업체 플래그는 변경하지 않습니다. 이전 Codex
플러그인 설치에서 마이그레이션할 때 해당 프로젝트에 알려진 `multi_agent_v2`와 레거시 `[agents] max_threads`
충돌이 있으면 현재 프로젝트의 `.codex/config.toml`를 복구할 수도 있습니다. 프로젝트 소유 `.codex` 아티팩트는
삭제하지 않고 보고합니다. 전역 Codex 설정은 `~/.codex/plugins/cache/sisyphuslabs` 아래에 로컬로 구축한
캐시에서 마켓플레이스 `sisyphuslabs`를 등록하고, 플러그인 `omo@sisyphuslabs`를 활성화하며, 유효한
`[features.multi_agent_v2]` 제한 테이블을 작성합니다. 설치 프로그램은 MultiAgentV2를 활성화하지 않습니다.
명시적인 레거시 `multi_agent_v2 = false` 약칭을 발견하면 비활성화 상태를 테이블 형식 `enabled = false`로
유지합니다.

Windows에서는 위에 나온 `npx lazycodex-ai install ...` 명령을 직접 사용하세요.
`omo-agent-toolkit install` 저장소를 간접적으로 실행하는 `npx --package` 명령으로 바꾸지 마세요.
그 패키지 관리자 명령 형식은 설치 프로그램이 시작되기도 전에 실패할 수 있습니다.

기본 Windows Codex 설치에서 설치 프로그램은 Codex 설정을 작성하기 전에 Git Bash를 찾습니다.
`OMO_CODEX_GIT_BASH_PATH`, 표준 Windows용 Git 설치 위치, PATH 순서로 확인합니다. Git Bash가 없으면
여기에 표시된 설치 지침을 출력하고 중지합니다. `winget`를 실행하거나 시스템 종속성을 변경하지 않습니다.

```powershell
winget install --id Git.Git -e --source winget
where bash
```

Git을 사용자 지정 위치에 설치했다면 설치 프로그램을 다시 실행하기 전에 경로를 설정하세요.

```powershell
setx OMO_CODEX_GIT_BASH_PATH "C:\Program Files\Git\bin\bash.exe"
```

```powershell
$env:OMO_CODEX_GIT_BASH_PATH = "C:\Program Files\Git\bin\bash.exe"
```

Codex는 자체 기본값에 따라 Windows 셸 호출을 시작할 수 있습니다. Light는 전역 Codex 셸 설정을 작성하지
않습니다. 대신 Git Bash 사용 가능 여부를 확인하고, Windows 전용 `git_bash` MCP 정책을 활성화한 뒤, 첫 번째 셸
관련 호출 전에 지침을 주입합니다. 컨텍스트 압축 후에는 알림 상태가 초기화되어 다음 셸 관련 호출에서도 동일한 `git_bash` 권장 사항을
받습니다.

> **이전 Codex 플러그인을 사용했다면 먼저 정리하세요.** 다른 Codex 플러그인 번들을 사용했던 Codex 홈에
> Light를 설치하기 전에 이전 번들을 제거한 다음 이 설치 프로그램을 다시 실행하세요. 여러 번들이 동일한 `~/.codex`에 Codex
> 마켓플레이스
> 플러그인, 수명 주기 훅, `ultrawork`/`ulw` 키워드를 기록할 수 있습니다. Codex 홈을 정리하면
> 오래된 공유 `config.toml` 키와 중복 훅를 방지할 수 있습니다.
>
> 마이그레이션 후 Light를 제거하려면 `npx lazycodex-ai uninstall`를 실행하세요. 관리 대상
> `sisyphuslabs` Codex 캐시와 마켓플레이스 상태를 제거하고, 백업을 만든 뒤 `~/.codex/config.toml`에서
> `omo@sisyphuslabs` 플러그인 및 훅 상태 블록을 제거하며, `~/.codex/agents/`에서 관리 대상 에이전트 TOML
> 파일을 제거합니다. `cleanup`는 이전 버전과 호환되는 별칭으로 계속 사용할 수 있습니다.
> `agents.max_threads cannot be set when multi_agent_v2 is enabled` 오류로 특정
> 프로젝트에서만 Codex가 계속 실패한다면 해당 프로젝트에서 `npx lazycodex-ai install`를 실행하세요. 설치
> 프로그램은 프로젝트 루트부터 현재 디렉터리까지의 프로젝트 로컬 `.codex/config.toml` 계층을 복구하고,
> MultiAgentV2가 활성화된 경우에만 충돌하는 레거시 `[agents] max_threads`를 제거하며, 변경한 파일 옆에
> 타임스탬프가 포함된 백업을 기록합니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="03-Codex-마켓플레이스에서-설치앱-내.md"><b>Codex 마켓플레이스에서 설치(앱 내)</b> →</a></p>

<sub>← 이전: <a href="01-UltimateOpenCode-에이전트에게-맡기세요.md">Ultimate(OpenCode) - 에이전트에게 맡기세요</a></sub>
