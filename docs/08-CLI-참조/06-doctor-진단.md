[목차](../README.md) / [CLI 참조](README.md)

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

---

이전: [uninstall / cleanup: 제거와 정리](05-uninstall-cleanup-제거와-정리.md) | 다음: [run 실행](07-run-실행.md)
