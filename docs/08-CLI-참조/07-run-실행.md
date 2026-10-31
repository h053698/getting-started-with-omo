<sub><a href="../README.md">목차</a> › <a href="README.md">CLI 참조</a></sub>

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

<p align="right"><sub>다음 문서</sub><br><a href="08-get-local-version-로컬-버전-조회.md"><b>get-local-version: 로컬 버전 조회</b> →</a></p>

<sub>← 이전: <a href="06-doctor-진단.md">doctor 진단</a></sub>
