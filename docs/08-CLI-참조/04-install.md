<sub><a href="../README.md">목차</a> › <a href="README.md">CLI 참조</a></sub>

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

<p align="right"><sub>다음 문서</sub><br><a href="05-uninstall-cleanup-제거와-정리.md"><b>uninstall / cleanup: 제거와 정리</b> →</a></p>

<sub>← 이전: <a href="03-명령.md">명령</a></sub>
