<a href="../README.md">목차</a> › <a href="README.md">CLI 참조</a>

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

<p align="right"><sub>다음 문서</sub><br><a href="06-doctor-진단.md"><b>doctor 진단</b> →</a></p>

<sub>← 이전: <a href="04-install.md">install</a></sub>
