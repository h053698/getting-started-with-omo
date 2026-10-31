## LLM 에이전트용 설치 절차

> **중요: 이 파일은 WebFetch가 아닌 `curl`로 가져오세요.** WebFetch는 콘텐츠를 요약하면서
> `--platform`, 구독 관련 질문, Codex 확인 절차 등 중요한 세부정보를 누락합니다. 항상 다음을 사용하세요.
>
> ```bash
> curl -fsSL https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/refs/heads/dev/docs/guide/installation.md
> ```

사용자가 oh-my-openagent를 설치하도록 돕는 LLM 에이전트라면 요청한 버전을 설치하고, 설정을 확인하고, 모델 제공업체를
설정하도록 도와주세요.

다음 단계를 순서대로 따르세요.

### 0단계: 플랫폼과 구독 확인

먼저 설치할 플랫폼을 물어보세요. 답변에 따라 이후 절차가 달라집니다.

> "oh-my-openagent를 어떤 하네스에 설치하시겠습니까? 다음 중 하나를 선택하세요.
>
> 1. OpenCode: 터미널 AI 코딩 에이전트
> 2. ChatGPT 구독 CLI
> 3. 둘 다"

답변에 따라 `--platform` 플래그를 선택합니다.

| 사용자 답변 | 사용할 값 |
| --- | --- |
| OpenCode | `--platform=opencode`(생략해도 기본값) |
| Codex | `--platform=codex` |
| 둘 다 | `--platform=both` |

Codex 또는 둘 다를 선택했다면 다음을 물어보세요.

> "Codex는 권한 확인 메시지를 반복해서 표시하지 않고 실행할 수 있는 자동화 에이전트 설정에 가장 적합합니다.
> `approval_policy = "never"` 및 `sandbox_mode = "danger-full-access"` 설정은
> OMO/LazyCodex에 권장됩니다. Codex를 이렇게 설정할까요?"

답변에 따라 다음 플래그를 선택합니다.

| 사용자 답변 | 사용할 값 |
| --- | --- |
| 예 | `--codex-autonomous` |
| 아니요 | `--no-codex-autonomous` |

**Codex만 선택했다면** 자동 실행 권한에 관해 질문한 뒤 0단계의 나머지 절차는 건너뛰세요. Codex에는 구독 관련 질문이
필요하지 않습니다. 바로 2단계로 진행하세요.

**OpenCode 또는 둘 다를 선택한 경우** 다음 구독 여부를 확인해 나머지 CLI 플래그를 정하세요.

1. **Claude Pro/Max를 구독하고 계신가요?**

   - **예**, **Max20 모드(20×)** 사용 → `--claude=max20`
   - **예**, Max20 모드는 사용하지 않음 → `--claude=yes`
   - **아니요** → `--claude=no`

2. **OpenAI/ChatGPT Plus를 구독하고 계신가요?**

   - **예** → `--openai=yes`(OpenAI 경로를 활성화합니다. `ultrabrain`(max) 및
     `deep-high`(high) 카테고리는 GPT-6 Astra에서 시작하고, `deep-low`는 GPT-6.1
     Sol(medium)에서 시작합니다.
     `quick` 카테고리는 GPT-6 Luna Fast(low)에서 시작하고, plan-reviewer는 GPT-6 Astra(xhigh)에서
     시작합니다.)
   - **아니요** → `--openai=no`(기본값)

3. **Gemini 모델을 통합하시겠습니까?**

   - **예** → `--gemini=yes`
   - **아니요** → `--gemini=no`

4. **GitHub Copilot을 구독하고 계신가요?**

   - **예** → `--copilot=yes`
   - **아니요** → `--copilot=no`

5. **OpenCode Zen(`opencode/` 모델)에 액세스할 수 있나요?**

   - **예** → `--opencode-zen=yes`
   - **아니요** → `--opencode-zen=no`(기본값)

6. **Z.ai 코딩 플랜을 구독하고 계신가요?**

   - **예** → `--zai-coding-plan=yes`
   - **아니요** → `--zai-coding-plan=no`(기본값)

7. **OpenCode Go를 구독하고 계신가요?** (GLM 5.2, Kimi K3/K2.7, MiniMax M2.7/M3의 경우 월 $10)

   - **예** → `--opencode-go=yes`
   - **아니요** → `--opencode-go=no`(기본값)

8. **Kimi for Coding을 구독하고 계신가요?**

   - **예** → `--kimi-for-coding=yes`
   - **아니요** → `--kimi-for-coding=no`(기본값)

9. **Bailian Coding Plan을 구독하고 계신가요?**

   - **예** -> `--bailian-coding-plan=yes`
   - **아니요** -> `--bailian-coding-plan=no`(기본값)

10. **MiniMax CN 코딩 플랜(`minimaxi.com`)을 구독하고 계신가요?**
    - **예** -> `--minimax-cn-coding-plan=yes`
    - **아니요** -> `--minimax-cn-coding-plan=no`(기본값)
11. **MiniMax 코딩 플랜(`minimax.io`)을 구독하고 계신가요?**
    - **예** -> `--minimax-coding-plan=yes`
    - **아니요** -> `--minimax-coding-plan=no`(기본값)
12. **Vercel AI Gateway를 사용하시나요?**
    - **예** -> `--vercel-ai-gateway=yes`
    - **아니요** -> `--vercel-ai-gateway=no`(기본값)

**모델 제공업체 선택은 에이전트마다 다릅니다.** 모든 에이전트에 적용되는 단일 제공업체 우선순위는 없습니다. 각 전용 에이전트와
카테고리에는 고유한 대체 모델 순서가 있습니다.

**Claude를 구독하지 않은 경우 메인 에이전트의 권장 모델을 사용할 수 없다는 점을 강력히 경고하세요.**

### 1단계: 사전 요구 사항

#### OpenCode 또는 둘 다를 선택한 경우

OpenCode가 설치되어 있고 버전이 지원 범위에 있는지 확인하세요.

```bash
if command -v opencode &> /dev/null; then
    echo "OpenCode $(opencode --version) is installed"
else
    echo "OpenCode가 설치되어 있지 않습니다. 먼저 설치하세요."
    echo "Ref: https://opencode.ai/docs"
fi
```

설치되어 있지 않다면 서브에이전트를 생성해 OpenCode를 설치하게 하고, 결과를 다시 보고받아 컨텍스트를 보존하세요.

필수 버전: OpenCode `>= 1.4.0`.

#### Codex 또는 둘 다를 선택한 경우

Codex CLI가 설치되어 있는지 확인하세요.

```bash
if command -v codex &> /dev/null; then
    codex --version
else
    echo "Codex CLI가 설치되어 있지 않습니다. 먼저 설치하세요."
    echo "Ref: https://github.com/openai/codex"
fi
```

설치 프로그램은 `~/.codex/`에 쓸 수 있어야 합니다. 이 디렉터리는 Codex CLI를 처음 실행할 때 생성됩니다. 아직
없다면 Codex CLI를 설치하고, 계속하기 전에 한 번 실행하세요.

Windows에 기본 방식으로 Codex를 설치한 경우 Git Bash도 필요합니다. 설치 프로그램은 `OMO_CODEX_GIT_BASH_PATH`,
Windows용 Git의 표준 설치 위치, PATH 순서로 확인합니다. 찾지 못하면 다음을 실행하세요.

```powershell
winget install --id Git.Git -e --source winget
where bash
```

Git Bash를 사용자 지정 위치에 설치했다면 `OMO_CODEX_GIT_BASH_PATH`를 설정하세요.

```powershell
setx OMO_CODEX_GIT_BASH_PATH "C:\Program Files\Git\bin\bash.exe"
```

```powershell
$env:OMO_CODEX_GIT_BASH_PATH = "C:\Program Files\Git\bin\bash.exe"
```

### 2단계: 설치 프로그램 실행

0단계에서 확인한 플랫폼 플래그와 구독 플래그를 지정해 실행하세요.

```bash
bunx oh-my-openagent install \
  --no-tui \
  --platform=<opencode|codex|both> \
  [--claude=<yes|no|max20>] \
  [--gemini=<yes|no>] \
  [--copilot=<yes|no>] \
  [--openai=<yes|no>] \
  [--opencode-zen=<yes|no>] \
  [--zai-coding-plan=<yes|no>] \
  [--opencode-go=<yes|no>] \
  [--kimi-for-coding=<yes|no>] \
  [--bailian-coding-plan=<yes|no>] \
  [--minimax-cn-coding-plan=<yes|no>] \
  [--minimax-coding-plan=<yes|no>] \
  [--vercel-ai-gateway=<yes|no>] \
  [--codex-autonomous|--no-codex-autonomous] \
  [--skip-auth]
```

`--platform`을 생략하면 기본값은 `opencode`입니다. 구독 플래그는 `--platform`이 `opencode`
또는 `both`일 때만 적용됩니다. Light 버전은 OpenCode 모델 설정을 작성하지 않으므로
`--platform=codex`에서는 구독 플래그가 허용되지 않습니다. `--codex-autonomous`는 선택한 플랫폼에 Codex가
포함된 경우에만
효과가 있습니다.

**예:**

- OpenCode + Claude Max20 + ChatGPT + Gemini:

 ```bash
 bunx oh-my-openagent install --no-tui --platform=opencode --claude=max20 \
   --openai=yes --gemini=yes --copilot=no
 ```

- 권장 자율 권한만 적용한 Codex:

 ```bash
 npx lazycodex-ai install --no-tui --codex-autonomous
 ```

- Claude만 사용하는 두 실행 환경:

 ```bash
 bunx oh-my-openagent install --no-tui --platform=both --claude=yes \
   --gemini=no --copilot=no --codex-autonomous
 ```

- 사서용 OpenCode + Z.ai:

 ```bash
 bunx oh-my-openagent install --no-tui --platform=opencode --claude=yes \
   --gemini=no --copilot=no --zai-coding-plan=yes
 ```

- OpenCode Go만 구독한 경우:

 ```bash
 bunx oh-my-openagent install --no-tui --platform=opencode --claude=no \
   --openai=no --gemini=no --copilot=no --opencode-go=yes
 ```

**Codex 실행 파일 이름 안내.** `lazycodex-ai`와 `lazycodex`는 모두 Codex Light Node 설치 프로그램에서
제공하는 bin 별칭입니다. `lazycodex`는 마켓플레이스 번들을 호스팅하는 GitHub 저장소의 ID이기도 합니다. 어느 명령으로
실행하든 Bun은 필요하지 않습니다. Codex 마켓플레이스 이름은 `sisyphuslabs`, 플러그인 이름은 `omo`입니다.

**설치 프로그램이 수행하는 작업:**

- **`opencode`, `both`**: `opencode.json`의 `plugin` 배열에 `"oh-my-openagent"`를
  등록합니다. `~/.omo/omo.jsonc`의 `[opencode]` 블록에는 에이전트 → 모델 매핑을 생성합니다(레거시 설정 파일은
  먼저 통합 파일로 마이그레이션합니다).
- **`codex`, `both`**: `packages/omo-codex/plugin/`을
  `~/.codex/plugins/cache/sisyphuslabs/omo/<version>/`에 복사합니다. 패키지로 제공되는
  `lazycodex-ai` 설치는 번들된 구성 요소 아티팩트를 사용하고 캐시에서 `npm ci --omit=dev`를 실행합니다. 소스
  체크아웃에서 설치할 때는 플러그인을 먼저 빌드할 수 있습니다. 마켓플레이스 메타데이터를 위해
  `~/.codex/.tmp/marketplaces/sisyphuslabs/` 아래에 설치된 로컬 마켓플레이스 스냅샷을 만들고, 번들 에이전트
  TOML을 `~/.codex/agents/`에 복사하여 캐시나 임시 스냅샷을 정리한 후에도 역할 정의가 유지되도록 합니다. Symlink
  구성 요소 CLI는 `~/.local/bin`(또는 `$CODEX_LOCAL_BIN_DIR`)에 연결합니다. 모든 훅의 SHA256
  신뢰 해시를 계산한 뒤, 로컬 소스 `~/.codex/plugins/cache/sisyphuslabs`,
  `[plugins."omo@sisyphuslabs"]`, 관리형 `[agents.*]`,
  `[features.multi_agent_v2] max_concurrent_threads_per_session = 16`(MultiAgentV2가
  선호되지 않으면 `[agents] max_threads = 1000`), 그리고
  `[hooks.state."omo@sisyphuslabs:..."]` 블록을 사용해 `[marketplaces.sisyphuslabs]`를
  `~/.codex/config.toml`에 기록합니다. 레거시 약식 설정인 `[features] multi_agent_v2 = false`가
  있으면 설치 프로그램은 이를 `[features.multi_agent_v2] enabled = false`로 변환합니다. 이렇게 하면 명시적인
  비활성화 설정을 유지하면서 파일도 유효하게 유지할 수 있습니다. `--codex-autonomous`를 선택했다면
  `approval_policy = "never"`, `sandbox_mode = "danger-full-access"` 및 이에 맞는
  `[notice]` 경고 억제 설정도 기록하고, 레거시 최상위 `network_access` 키를 제거합니다.

두 부분은 서로 독립적이며 멱등적이므로 다시 실행해도 안전합니다.

### 3단계: 확인

#### OpenCode 플러그인 확인(플랫폼=codex인 경우 건너뛰기)

```bash
opencode --version  # Should be 1.4.0 or higher
cat ~/.config/opencode/opencode.json
# 플러그인 배열에 "oh-my-openagent"가 있어야 합니다(레거시 "oh-my-opencode"도 경고와 함께 로드됨)
bunx oh-my-openagent doctor
```

OpenCode 대상에서 `doctor`는 **시스템**, **설정**, **TUI 플러그인**, **사용되지 않는 추론 키**,
**도구**, **모델**, **원격 측정**, **팀 모드** 등 등록된 검사 8개를 실행합니다. Codex 대상에서는 별도의
**Codex**, **codex-comComponents**, **codex-runtime-wrapper** 검사를 실행합니다. 종료 코드
`0`은 실패한 검사가 없다는 뜻이고, `1`은 하나 이상의 검사가 실패했다는 뜻입니다. 경고만 있으면 여전히 `0`을 반환합니다.

#### Codex CLI Light 버전 확인(플랫폼=opencode인 경우 건너뛰기)

```bash
# 플러그인 캐시가 있는가?
ls ~/.codex/plugins/cache/sisyphuslabs/omo/

# 마켓플레이스 소스가 로컬 빌드 캐시인가?
grep -A4 'marketplaces.sisyphuslabs' ~/.codex/config.toml

# Codex 구성에 플러그인 블록이 있는가?
grep -A2 'omo@sisyphuslabs' ~/.codex/config.toml

# 사용자가 자율 모드를 수락했다면 권한 설정이 있는가?
grep -E 'approval_policy|sandbox_mode' ~/.codex/config.toml

# 구성 요소 바이너리가 연결됐는가?
ls ~/.local/bin/ | grep -E '^(omo-agent-toolkit|lazycodex-executor-verify|ulw|ulw-loop|omo-(comment-checker|git-bash-hook|lsp|rules|ulw-execute-continuation|telemetry|ultrawork|ulw-loop))$'

# Codex CLI가 플러그인을 인식하는가?
codex --help

# 네이티브 Windows에서 Git Bash를 찾을 수 있는가?
where bash
```

이 중 하나라도 비어 있다면 `npx lazycodex-ai install`을 다시 실행하세요. 설치 프로그램은 멱등적이며 훅 신뢰
해시를 다시 계산합니다.

### 4단계: 인증 설정

#### Codex CLI

Codex는 자체 OpenAI 인증을 사용합니다. Light 버전은 Codex CLI에서 이미 사용하는 인증을 그대로 이어받으므로 여기서
추가로 설정할 것은 없습니다. `codex --help`가 작동하면 Codex 인증이 완료된 상태입니다.

#### OpenCode 모델 제공업체

`--platform=codex`라면 이 섹션을 건너뛰세요. 그렇지 않으면 0단계에서 사용한다고 답한 모델 제공업체를 설정합니다. OAuth
인증에는 대화형 터미널을 사용하세요(tmux가 적합합니다).

##### Anthropic(Claude)

```bash
opencode auth login
# 대화형 터미널: Provider를 찾아 Anthropic 선택
# 대화형 터미널: Login method를 찾아 Claude Pro/Max 선택
# 브라우저의 OAuth 흐름을 사용자에게 안내
# 완료될 때까지 대기
# 성공 여부를 확인하고 사용자에게 확인
```

##### Google Gemini(Antigravity OAuth)

먼저 `opencode.json`에 `opencode-antigravity-auth` 플러그인 항목을 추가합니다.

```json
{
  "plugin": ["oh-my-openagent", "opencode-antigravity-auth@latest"]
}
```

그런 다음 [opencode-antigravity-auth
README](https://github.com/NoeFabris/opencode-antigravity-auth)의 전체 모델 설정을
`opencode.json`에 병합합니다. 이 플러그인은 **변형 시스템**을 사용합니다. `antigravity-gemini-3-pro` 같은
모델은 별도의 `-low`/`-high` 항목 대신 `low`/`high` 변형을 지원합니다.

`~/.omo/omo.jsonc`(또는 프로젝트의 `.omo/omo.jsonc`)에 있는 `[opencode]` 블록에서 에이전트 모델을 재정의합니다.

```json
{
  "agents": {
    "explore": { "model": "google/antigravity-gemini-3-flash" }
  }
}
```

**사용 가능한 Antigravity 모델:** `google/antigravity-gemini-3-pro`(변형: `low`, `high`),
`google/antigravity-gemini-3-flash`(변형: `minimal`, `low`, `medium`, `high`),
`google/antigravity-claude-sonnet-4-6`,
`google/antigravity-claude-sonnet-4-6-thinking`(변형: `low`, `max`),
`google/antigravity-claude-opus-4-5-thinking`(변형: `low`, `max`).

**사용 가능한 Gemini CLI 모델:** `google/gemini-2.5-flash`, `google/gemini-2.5-pro`,
`google/gemini-3.6-flash`, `google/gemini-3.1-pro-preview`.

> `google/antigravity-gemini-3-pro-high` 같은 레거시 등급 접미사 이름도 계속 작동하지만 변형 사용을 권장합니다.
> 대신 기본 모델 이름에 `--variant=high`를 지정하세요.

그런 다음 인증합니다.

```bash
opencode auth login
# 대화형 터미널: Provider → Google
# 대화형 터미널: Login method → OAuth with Google (Antigravity)
# 브라우저에서 로그인 완료(자동 감지)
# 선택 사항: 다중 계정 부하 분산을 위해 Google 계정 추가
```

`opencode-antigravity-auth` 플러그인은 여러 Google 계정을 사용할 수 있습니다. 한 계정이 요청 한도에 도달하면
사용 가능한 다음 계정으로 자동 전환합니다.

##### Amazon Bedrock

Bedrock 인증은 OpenCode에서 처리합니다. 먼저 `opencode.json` 또는 AWS 환경 변수로 Bedrock을
설정한 다음 OMO의 에이전트 또는 카테고리 라우팅에 Bedrock 모델 ID를 사용합니다.

```json
{
  "provider": {
    "amazon-bedrock": {
      "options": {
        "region": "us-east-1",
        "profile": "my-aws-profile"
      }
    }
  }
}
```

한 번만 실행할 때는 대신 OpenCode에 AWS 자격 증명을 설정하세요.

```bash
AWS_PROFILE=my-aws-profile AWS_REGION=us-east-1 opencode
```

OpenCode에서 모델 제공업체를 확인한 뒤에는 OpenCode 모델 제공업체 접두사가 붙은 모델을 참조합니다.

```json
{
  "agents": {
    "plan-consultant": {
      "model": "amazon-bedrock/us.anthropic.claude-fable-5-1",
      "reasoning": "max"
      },
    "plan-reviewer": { "model": "amazon-bedrock/us.anthropic.claude-opus-5-5" }
  },
  "categories": {
    "deep-low": { "model": "amazon-bedrock/us.anthropic.claude-opus-5-5" }
  }
}
```

모델 액세스, 전달자 토큰, 명명된 프로필, VPC 엔드포인트, 사용자 지정 추론 프로필 ARN에 관한 내용은 OpenCode의 [Amazon
Bedrock 모델 제공업체 가이드](https://opencode.ai/docs/providers/#amazon-bedrock)를 참고하세요.
OMO는 설치 중 별도의 Bedrock 로그인 절차를 실행하지 않습니다.

##### GitHub Copilot(대체 모델 제공업체)

GitHub Copilot은 기본 모델 제공업체를 사용할 수 없을 때 **대체 모델 제공업체**로 지원됩니다. 우선순위는 에이전트마다
다릅니다. Copilot이 가장 적합한 모델 제공업체인 경우, 일반적인 설치 시 기본값은 다음과 같습니다.

| 에이전트/카테고리 | 모델 |
| --- | --- |
| **plan-consultant** | `github-copilot/claude-opus-5-5`(max) |
| **plan-reviewer** | `github-copilot/gpt-6-astra`(high) |
| **explore** | `github-copilot/claude-haiku-5-5`(medium) |
| **librarian** | `github-copilot/claude-haiku-5-5`(medium) |
| **deep**(카테고리) | `github-copilot/gpt-6-astra`(high) |

Copilot은 구독을 기반으로 요청을 실제 모델에 연결하는 프록시 모델 제공업체입니다. 메인 에이전트는 선택한 세션 모델과 관계없이 계속
실행됩니다. Copilot만 사용하는 설치에서는 일반적으로 `github-copilot/claude-opus-5-5`를 사용합니다.

##### Z.ai Coding Plan

Z.ai Coding Plan은 이제 주로 `glm-5.2` / `glm-4.6v` 대체 모델을 제공합니다. 더 이상 모든 에이전트에
공통으로 적용되는 대체 모델은 아닙니다.

Z.ai가 기본 모델 제공업체라면 가장 중요한 대체 설정은 다음과 같습니다.

| 에이전트/카테고리 | 모델 |
| --- | --- |
| **unspecified-high** | `zai-coding-plan/glm-5.3` |

메인 에이전트는 세션 모델인 `zai-coding-plan/glm-5.2`로 실행할 수 있습니다. GLM 5.2에는 조정된 프롬프트
프리셋이 있습니다. `glm-4.6v`는 비전 작업에서 수동으로 선택할 수 있습니다.

##### OpenCode Zen

OpenCode Zen은 `opencode/claude-opus-5-5`, `opencode/gpt-6-astra`,
`opencode/gpt-5.6-sol`, `opencode/gpt-5-nano`, `opencode/glm-5.2`,
`opencode/big-pickle`, `opencode/minimax-m2.7`,
`opencode/minimax-m2.7-highspeed` 등을 포함해 `opencode/` 접두사가 붙은 모델에 대한 액세스를 제공합니다.

OpenCode Zen이 가장 적합한 모델 제공업체인 경우의 일반적인 구성 예시는 다음과 같습니다.

| 에이전트/카테고리 | 모델 |
| --- | --- |
| **plan-consultant** | `opencode/claude-fable-5-1`(max) |
| **plan-reviewer** | `opencode/gpt-6-astra`(high) |
| **deep**(카테고리) | `opencode/gpt-6-astra`(high) |
| 메인 에이전트(세션) | `opencode/claude-opus-5-5` 또는 `opencode-go/kimi-k3` |

설치 프로그램을 `--opencode-zen=yes`로 실행하고, 프롬프트에서 OpenCode Zen에 대해 "예"를 선택하세요. OpenCode
환경에서 모델 제공업체 인증을 요청하면 `opencode/` 모델에 대한 OpenCode 모델 제공업체 인증 절차를 따르세요.

### 5단계: 모델 설정 이해

#### 설치 시 모델 계열

모든 모델이 같은 방식으로 작동하지는 않습니다. 동작이 비슷한 모델 계열을 이해하면 안전한 대체 모델을 선택하는 데 도움이 됩니다. 모델
제공업체 열에는 내장
대체 순서가 나와 있습니다. Vercel AI 게이트웨이(`vercel/<model-id>`)는 모델 제공업체를 수동으로 선택할 때만 사용할 수
있으며, 기본 제공 대체 순서에는
포함되지 않습니다.

**Claude 유사 모델**(지시 준수, 구조화된 출력):

- **모델: Claude Opus 5.5**
  - 모델 제공업체: Anthropic, github-copilot, opencode
  - 참고: 현재 가장 뛰어난 Opus 모델입니다. 에이전트별 전용 프롬프트 변형이 있습니다.
- **모델: Claude Sonnet 5.5**
  - 모델 제공업체: Anthropic, github-copilot, opencode
  - 참고: `unspecified-low` 카테고리의 기본 모델입니다(medium).
- **모델: Claude Sonnet 5**
  - 모델 제공업체: Anthropic, github-copilot, opencode
  - 참고: 더 빠르고 저렴하며 성능과 비용의 균형이 좋습니다.
- **모델: Claude Haiku 5.5**
  - 모델 제공업체: Anthropic, github-copilot
  - 참고: 빠르고 저렴해 짧은 작업에 적합합니다.
- **모델: Kimi K3**
  - 모델 제공업체: opencode-go, kimi-for-coding, moonshotai, opencode
  - 참고: 사고 토큰 비용을 감당할 수 있다면 메인 에이전트에 우선 권장하는 Kimi 모델입니다.
- **모델: Kimi K2.7**
  - 모델 제공업체: opencode-go(수동 선택)
  - 참고: Claude와 유사한 오케스트레이션 경로에서 제한적으로 사용하는 Kimi 대체 모델입니다.
- **모델: Kimi K3 Free**
  - 모델 제공업체: opencode
  - 참고: 무료 티어 Kimi 모델입니다. 속도에는 제한이 있지만 작업을 수행할 수 있습니다.
- **모델: GLM 5.2**
  - 모델 제공업체: zai-coding-plan, opencode-go, opencode, bailian-coding-plan
  - 참고: Claude와 비슷하게 동작합니다. 현재 OpenCode Go/Z.ai의 대체 모델입니다.
- **모델: GLM 5**
  - 모델 제공업체: zai-coding-plan, opencode
  - 참고: Claude와 비슷하게 동작하며 다양한 작업에 적합합니다.
- **모델: Big Pickle(GLM 4.6)**
  - 모델 제공업체: opencode
  - 참고: 무료 티어 GLM 모델로, 대체 모델로 사용할 만합니다.

**GPT 모델**(명시적 추론, 원칙 중심):

- **모델: GPT-6 Astra**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot, opencode
  - 참고: OpenAI에서 가장 성능이 뛰어난 모델이자 권장하는 주력 GPT 모델입니다. plan-reviewer(xhigh,
    Copilot에서는 높음),
    `ultrabrain`(max), `deep-high`(high)의 기본 모델입니다. `gpt-6-astra-fast`는 고속 모드
    변형입니다. 메인 에이전트와 `architect` 카테고리에서 수동으로 지정할 수도 있습니다.
- **모델: GPT-6 Sol**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot, opencode
  - 참고: GPT-6의 주력 티어이자 Hephaestus의 기본 모델입니다(medium). GPT-5.6 Sol은 대체 순서에 남아
    있습니다. `max`까지
    `none`을 포함한 추론 강도를 지원하고, 온도 설정은 없으며, 컨텍스트는 1.05M입니다. `gpt-6-sol-fast`는 고속 모드
    변형입니다.
- **모델: GPT-6.1 Sol**
  - 모델 제공업체: openai, chatgpt-subscription
  - 참고: `deep-low` 카테고리의 모델(medium)이며, 고속 티어인 `gpt-6.1-sol-fast`도 있습니다. 두 모델 모두
    대체 순서에서 GPT-5.6 Sol보다
    앞섭니다. `unspecified-low`의 GPT 대체 순서에도 포함되며(중간, GPT-5.6 Terra보다 앞), Fast 티어는 Obsessive
    · Normal 모델 프로필에서 첫 번째 Sol 단계이고 일반 GPT-6.1 Sol이 바로 뒤따릅니다. 추론 강도는 `low`부터
    `max`까지 지원하지만 `none`과 `minimal`은 지원하지 않습니다. 온도 설정은 없으며, 컨텍스트는 400K입니다.
- **모델: GPT-6 Luna**
  - 모델 제공업체: openai, chatgpt-subscription
  - 참고: GPT-6의 경량 티어입니다. `gpt-6-luna-fast`(low)는 `explore`, `librarian`, `quick`
    카테고리에서
    사용하는 OpenAI 대체 모델입니다. 추론 강도 단계와 제한 사항은 GPT-6 Sol과 같습니다.
- **모델: GPT-5.6 Sol**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot, opencode
  - 참고: GPT-6.1 Sol(medium)에 이은 `deep-low` 대체 모델이며, GitHub Copilot과
    OpenCode Zen에서 제공하는 유일한 `deep-low` 단계입니다. 고속 티어 `gpt-5.6-sol-fast`는 OpenAI
    대체 순서의 마지막 단계입니다. 또한
    Hephaestus에서는 GPT-6 Sol, `ultrabrain`(max)에서는 GPT-6 Astra의 대체 모델입니다.
- **모델: GPT-5.6 Terra**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot
  - 참고: GPT-5.6의 중간 티어입니다. 더 이상 모든 에이전트의 기본 모델은 아니며, 균형 잡힌 선택지로 수동 지정할 수 있습니다.
- **모델: GPT-5.6 Luna**
  - 모델 제공업체: openai, chatgpt-subscription
  - 참고: GPT-5.6의 경량 티어입니다. `unspecified-low`의 기본 모델은 아닙니다. 해당 카테고리의 OpenAI 대체 순서는
    `claude-sonnet-5-5 (medium)`, `xiaomi|opencode-go/mimo-v2.6-pro (max)`,
    `grok-4.7 (xhigh)`, `glm-5.3 (high)`, `gpt-6.1-sol (medium)`,
    `gpt-5.6-sol (medium)`으로 시작합니다.
- **모델: GPT-5.6 Sol 재정의 경로**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot, opencode
  - 참고: plan-consultant와 `ultrabrain`에서 처음으로 대체되는 GPT-5.6 Sol 계열 모델입니다.
- **모델: GPT-5.6 Luna Fast**
  - 모델 제공업체: openai, chatgpt-subscription
  - 참고: 빠르면서도 추론 성능이 뛰어납니다. Kimi 고속 모델을 기본으로 사용하는 빠른 작업의 유틸리티 대체 모델입니다.
- **모델: GPT-5-nano**
  - 모델 제공업체: openai, chatgpt-subscription, github-copilot, opencode
  - 참고: 매우 저렴하고 빠르며 간단한 유틸리티 작업에 적합합니다.

**동작 특성이 다른 모델**:

- **모델: Gemini 3.1 Pro**
  - 모델 제공업체: google, github-copilot, opencode
  - 참고: 시각적 작업과 프론트엔드 작업에 뛰어나며 추론 방식이 다릅니다.
- **모델: Gemini 3.6 Flash**
  - 모델 제공업체: google, github-copilot, opencode
  - 참고: 빠르며 문서 검색과 가벼운 작업에 적합합니다.
- **모델: MiniMax M3**
  - 모델 제공업체: opencode-go
  - 참고: 최신 MiniMax 주력 모델입니다. 기본 유틸리티 대체 순서에서 M2.7보다 앞섭니다.
- **모델: MiniMax M2.7**
  - 모델 제공업체: opencode-go
  - 참고: 빠르고 성능이 좋으며 여러 대체 순서에서 유틸리티 대체 모델로 사용됩니다.
- **모델: MiniMax M2.7 Fast**
  - 모델 제공업체: opencode(수동 선택)
  - 참고: 더 빠른 유틸리티 변형입니다. 더 이상 내장 Explore 또는 Librarian 대체 순서에 포함되지 않습니다.
- **모델: Qwen 3.7 Plus**
  - 모델 제공업체: opencode-go
  - 참고: 1M 컨텍스트와 고속 추론을 지원합니다. Explore와 Librarian에서 GPT-6 Luna Fast 및 DeepSeek
    V4.1 Flash 다음으로
    사용하는 OpenCode Go 유틸리티 대체 모델입니다.

**속도 중심 모델**:

- **모델: Grok Code Fast 1**
  - 모델 제공업체: github-copilot, xai
  - 속도: 매우 빠름
  - 메모: 코드 grep/검색에 최적화되어 있습니다. 수동으로 재정의할 때 선택할 수 있으며, 기본 대체 순서에는 포함되지 않습니다.
- **모델: Claude Haiku 5.5**
  - 모델 제공업체: Anthropic, github-copilot
  - 속도: 빠름
  - 메모: 속도와 성능의 균형이 좋습니다.
- **모델: MiniMax M2.7 Fast**
  - 모델 제공업체: OpenCode
  - 속도: 매우 빠름
  - 메모: MiniMax의 고속 변형입니다. 수동으로만 선택할 수 있으며, 내장 대체 순서에는 포함되지 않습니다.
- **모델: GPT-5.3-codex-spark**
  - 모델 제공업체: openai
  - 속도: 매우 빠름
  - 메모: 빠르지만 지나치게 공격적으로 압축합니다. OmO 에이전트에는 권장하지 않습니다.

#### 각 역할과 할당되는 모델

**메인 에이전트**는 현재 대화가 진행되는 세션입니다. 세션 모델에서 실행되며 별도의 에이전트 대체 순서는 없습니다. Claude Opus
5.5를 권장하며, GPT 구성에는 GPT-6 Astra, GPT-6.1 Sol 또는 GPT-6 Sol을 권장합니다.
`model_profile`이 없으면 새 OmO 기본 세션은 권장 목록(Opus 5.5, Fable 5.1, Kimi K3, GPT-6
Astra, GPT-6.1 Sol, GPT-6 Sol, GLM 5.3)에서 연결 가능한 첫 번째 모델을 선택합니다. 모델별로 조정된 프롬프트
사전 설정에
관해서는 [에이전트 모델 일치](../04-에이전트-모델-매칭-가이드/01-출시-게이트가-적용된-Fable-55-준비.md#에이전트-모델-매칭-가이드)를 참조하세요.

**전용 에이전트**(메인 에이전트가 `task(subagent_type: ...)`로 작업을 위임하는 읽기 전용 도우미,
`packages/senpi-task/src/agents/builtin/fallback-chains.ts`에 정의된 대체 순서):

- **에이전트: plan-consultant**
  - 역할: `/ulw-plan` 실행 전 계획의 누락 사항 분석
  - 기본 대체 순서: anthropic|github-copilot|opencode/claude-fable-5-1(max) →
    anthropic|github-copilot|opencode/claude-opus-5-5(max) →
    opencode-go|kimi-for-coding|moonshotai|opencode/kimi-k3(max)
- **에이전트: plan-reviewer**
  - 역할: 높은 정확도가 필요한 계획 검토 관문
  - 기본 대체 순서: openai|chatgpt-subscription/gpt-6-astra (xhigh) →
    github-copilot/gpt-6-astra (high) →
    openai|chatgpt-subscription|opencode/gpt-6-astra (high) →
    anthropic|github-copilot|opencode/claude-opus-5-5 (max) → … (소스의 전체 대체 순서)
- **에이전트: explore**
  - 역할: 코드베이스에서 빠르게 grep 검색
  - 기본 대체 순서: kimi-coding|kimi-for-coding/kimi-for-coding-highspeed(off) →
    openai|chatgpt-subscription/gpt-6-luna-fast(low) →
    anthropic|github-copilot/claude-haiku-5-5(medium) → deepseek/deepseek-flash(max)
    → opencode-go|bailian-coding-plan/qwen3.7-plus → opencode-go/minimax-m2.7
- **에이전트: librarian**
  - 역할: 문서/코드 검색
  - 기본 대체 순서: (`explore`와 동일한 대체 순서)

`explore`와 `librarian`는 응답 속도를 위해 성능을 절충합니다. Opus로 “업그레이드”하지 마세요. 결과는 개선되지 않고
비용만 늘어납니다.

**카테고리**는 실행 작업을 해당 카테고리의 모델과 스킬로 구성된 새 작업자 세션에 할당합니다.
`task(category: "architect")`는 아키텍처 및 디버깅 질문을 처리하는 아키텍처 자문 경로입니다. `deep`,
`ultrabrain`, `quick`, `unspecified-low`, `unspecified-high`,
`visual-engineering`, `artistry`, `writing`이 나머지 작업을 처리합니다. 각 대체 순서는
`packages/senpi-task/src/category/fallback-chains.ts`에 정의되어 있습니다. [Agent Model
Matching](../04-에이전트-모델-매칭-가이드/01-출시-게이트가-적용된-Fable-55-준비.md#에이전트-모델-매칭-가이드)도 참조하세요.

#### 모델마다 다른 프롬프트가 필요한 이유

- **Claude 모델**은 세부 체크리스트, 템플릿, 단계별 절차 같은 **절차 중심** 프롬프트에 잘 반응합니다. 규칙이 많을수록 지시를
  더 잘 따릅니다.
- **GPT 모델**(특히 5.2 이상)은 간결한 원칙, XML 태그로 구분한 구조, 명시적인 판단 기준 같은 **원칙 중심** 프롬프트에
  더 잘 반응합니다. 규칙이 많아질수록 모순이 생길 여지가 커지고 지시에서 벗어날 가능성도 높아집니다.

Codex 계획 모드 분석에서 얻은 핵심 통찰은 계획의 품질이 **“결정을 모두 마친 계획”**에서 나온다는 것입니다. 실행자가 내려야 할 결정을
0개로 만들어야 합니다.
Ultrawork Planner(`/ulw-plan`)는 모델 계열별로 별도의 프롬프트 파일을 유지하지 않습니다. 대신 `ulw-plan`
스킬을 기반으로 해당 동작을 수행하는 간결한 단일 프롬프트를 사용합니다. 따라서 세션 모델을 바꾸면 프롬프트 문구가 아니라 성능, 비용,
가용성이 달라집니다.

#### 모델 설정 맞춤화

전용 에이전트 또는 카테고리에서 사용하는 모델을 재정의하려면 `~/.omo/omo.jsonc`(또는 프로젝트의
`.omo/omo.jsonc`)를 편집하세요.

```jsonc
{
  "agents": {
    "plan-consultant": {
      "model": "anthropic/claude-fable-5-1",
      "reasoning": "max"
      },
    "plan-reviewer": { "model": "openai/gpt-6-astra" }, // 계획 게이트이므로 강력한 추론 모델을 유지
  },
  "categories": {
    "deep-low": { "model": "openai/gpt-6-sol" },
  },
}
```

**위험이 낮은 재정의**(호환되는 동작): 메인 에이전트의 Opus 5.5 → Fable 5.1/Kimi K3/GLM 5.3(모두 권장 목록에
있고 조정된 프롬프트 사전 설정이 있음); plan-consultant의 Fable 5.1 → Opus 5.5/Kimi K3;
plan-reviewer의 GPT-6 Astra
→ Opus 5.5(max).

**세션 모델이 GLM 5.2인 경우:** 모델 ID가 GLM으로 인식되므로 GLM 5.2에는 GLM에 맞게 조정된 프롬프트 사전 설정이
적용됩니다. 다만 Claude나 Kimi에 비해 유지관리자의 검증이 여전히 부족합니다.

**위험한 재정의**(즉각적인 지원 없음): 기본 에이전트 → 사전 설정이 없는 GPT 모델(사전 설정은 GPT-6 제품군과 GPT-5 계열
5.6까지 포함); `explore` → Opus(비용이 크게 낭비됨); `librarian` → Opus(동일).

#### 선택 사항: 커뮤니티 모델 관리 도구

독립적으로 유지관리되는 실험적 도구인 [oh-my-openagent VS Code
Extension](https://github.com/andersou/oh-my-openagent-vscode-extension)으로 사용자 수준의
모델 할당을 편집할 수 있습니다. 이 도구는 OmO 런타임 구성 요소가 아닌 타사 설정 프런트엔드입니다. OmO 프로젝트는 이를 유지관리하거나
지원하지 않으며, 호환성도 보장하지 않습니다.

외부 도구는 [설정](../09-설정-참조/01-목차.md#설정-참조)에 설명된 표준 `[opencode]` 필드를 편집할 때만 사용하세요. 도구가 변경한 파일을 확인하세요.
프로젝트의 `.omo/omo.jsonc`가 있으면 사용자 수준 설정보다 우선합니다.

외부 UI에서 모델을 변경한 후에는 다음을 수행하세요.

1. OpenCode를 다시 시작하기 전에 생성된 JSONC를 검토하세요.
2. `bunx oh-my-openagent doctor --verbose`를 실행해 진단 결과에 표시된 모델 결정 과정을 확인하세요. 이 결과만으로
   더 가까운 위치의 프로젝트 설정이나 런타임 등록 및 모델 매칭 규칙 확인을 대신할 수는 없습니다.
3. 모델 제공업체 자격 증명과 API 키는 공유 프로젝트 설정이 아닌 모델 제공업체의 인증 절차나 환경에 보관하세요.

외부 도구에 표시된 모델을 OmO가 나중에 건너뛰더라도, 판단의 기준은 이 저장소의 모델 매칭 및 등록 로직입니다. 선택한 모델 계열이
해당 에이전트에서 지원되는지 확인하려면 [에이전트 모델 매칭](../04-에이전트-모델-매칭-가이드/01-출시-게이트가-적용된-Fable-55-준비.md#에이전트-모델-매칭-가이드) 가이드를 참조하세요.

#### 모델 제공업체 결정

모든 상황에 적용되는 단일 모델 제공업체 우선순위는 없습니다. 설치 프로그램과 런타임은 에이전트마다 해당 대체 순서를 확인하므로 최종
모델 제공업체는 활성화된 에이전트와 구독에 따라 달라집니다.

### 6단계: 처음 사용 - 모드, 명령, 에이전트, 스킬

설치 후에는 다섯 가지 방식으로 Oh My OpenAgent와 상호 작용할 수 있습니다. 각각 살펴보세요.

#### 모드(채팅에서 자연스럽게 입력)

메시지에 다음 단어 중 하나를 입력하면 시스템이 해당 모드의 프롬프트를 삽입합니다.

- **키워드: `ultrawork` 또는 `ulw`**
  - 에디션: 둘 다
  - 기능: 전체 오케스트레이션 모드를 활성화합니다. 모든 에이전트(Ultimate) 또는 Codex `ultrawork` 구성
    요소(Light)를 활성화하고 작업이 완료될 때까지 멈추지 않습니다.
- **키워드: `team mode`, `team-mode`, `team_mode` 또는 `teammode`**
  - 에디션: Ultimate
  - 기능: `team_*` 도구를 통한 오케스트레이션을 강제합니다(`team_mode.enabled` 필요). `team`만으로는
    트리거되지 않습니다.
- **키워드: `hyperplan`**
  - 에디션: Ultimate
  - 기능: 5명의 비판적 검토자를 활용해 계획을 검증합니다.
- **키워드: `hyperplan ultrawork` (조합)**
  - 에디션: Ultimate
  - 기능: 두 모드를 동시에 활성화합니다.

#### 슬래시 명령

모든 내장 슬래시 명령은 **Ultimate 전용**입니다. Codex CLI는 슬래시 명령을 제공하지 않으므로 Light 버전에는 이
기능 전체가 포함되지 않습니다.

- **명령: `/ulw-execute`**
  - 에디션: Ultimate
  - 목적: 메인 에이전트가 동일한 세션에서 `.omo/plans/`의 승인된 ulw-plan 작업 계획을 실행합니다.
- **명령: `/goal`**
  - 에디션: Ultimate
  - 목적: 완료될 때까지 유휴 상태에서도 자동으로 작업을 이어 가는 영구 스레드 목표를 설정, 표시, 일시 중지, 재개하거나 지웁니다.
- **명령: `/stop-continuation`**
  - 에디션: Ultimate
  - 목적: 할 일에 따른 작업 지속을 중지하고, 활성 목표와 바위 상태를 지웁니다.
- **명령: `/refactor`**
  - 에디션: Ultimate
  - 목적: LSP, AST-grep, TDD 검증을 활용해 지능적으로 리팩터링합니다.
- **명령: `/handoff`**
  - 에디션: Ultimate
  - 목적: 새 세션에서 작업을 이어 갈 수 있도록 자세한 컨텍스트 요약을 생성합니다.
- **명령: `/remove-ai-slops`**
  - 에디션: Ultimate
  - 목적: 최근 변경 사항에서 AI가 생성한 코드의 문제 패턴을 제거합니다.
- **명령: `/hyperplan`**
  - 에디션: Ultimate
  - 목적: 에이전트에 `skill(name="hyperplan")`를 지시하는 내장 명령입니다. OpenCode는 `hyperplan`라는
    내장 스킬을 등록하지 않습니다.

#### 역할 - Ultimate에만 해당

Light 버전은 아래 에이전트 목록을 제공하지 않습니다. 대신 별도의 Codex 기본 에이전트 역할과 `teammode` 구성 요소를
제공합니다. 메인 에이전트가 아래 역할에 작업을 위임하므로, 직접 호출할 일은 드물지만 각 역할을 알아두면 유용합니다.

- **메인 에이전트**: 대화가 진행되는 세션의 에이전트입니다. 세션 모델에서 계획을 세우고, 작업을 위임하고, 완료까지 진행합니다.
- **Ultrawork Planner**(`/ulw-plan`): 코드 작성 전에 요구사항을 질문하고, 필요한 결정을 마친 작업 계획을 작성합니다.
- **`/ulw-execute`**: 메인 에이전트가 동일한 세션에서 승인된 작업 계획을 실행합니다.
- **작업자 카테고리**: 카테고리에 지정된 모델과 스킬로 구성되는 새 작업자 세션입니다. `task(category: "architect")`는
  아키텍처 및 디버깅 질문을 다루는 아키텍처 자문 역할입니다.
- **`explore`**: 코드베이스를 빠르게 grep으로 검색합니다.
- **`librarian`**: 외부 문서와 코드를 검색합니다.
- **`plan-consultant`**: 계획 수립 전 자문 역할로, 계획 작성 전에 요청을 분석해 드러나지 않은 의도와 빠진 내용을 찾습니다.
- **`plan-reviewer`**: 계획을 면밀히 검토합니다.

#### 스킬

작업이 설명과 일치하면 내장 OpenCode 스킬이 자동으로 로드됩니다. 이름을 지정해 호출할 필요는 없습니다. 이 OpenCode 스킬
시스템은 **Ultimate 전용**입니다. Light는 OpenCode 스킬 로더 대신 스크립트 기반 `teammode` 스킬을 포함한
Codex 기본 플러그인 스킬을 사용합니다.

| 스킬 | 에디션 | 트리거 조건 |
| --- | --- | --- |
| `playwright` | Ultimate | 브라우저 자동화 |
| `git-master` | Ultimate | 원자적 커밋, 리베이스, 기록 검색 |
| `frontend` | Ultimate | UI/UX 구현 작업 |
| `review-work` | Ultimate | 구현 후 코드 검토 |
| `$omo:remove-ai-slops` | Ultimate | AI가 생성한 코드의 문제 패턴 제거 |
| `team-mode` | Ultimate | `team_mode.enabled` |

`.opencode/skills/<name>/SKILL.md`(프로젝트 범위) 또는
`~/.config/opencode/skills/<name>/SKILL.md`(사용자 범위)에 사용자 지정 스킬을 추가할 수 있습니다. 각
`SKILL.md`에는 에이전트가 메시지와 대조할 설명을 선언합니다.

#### 사용자에게 알려주는 튜토리얼

확인 후 다음과 같이 안내합니다.

1. **메인 에이전트는 세션 모델에서 실행되며 Claude Opus 5.5를 적극 권장합니다**(GPT 설정이라면 GPT-6 Astra,
   GPT-6.1 Sol 또는 GPT-6 Sol). 다른 모델을 사용하면 경험이 눈에 띄게 저하될 수 있습니다.
2. **설정을 간단히 쓰고 싶으신가요?** 프롬프트에 `ultrawork`(또는 `ulw`)만 포함하세요. 메인 에이전트가 나머지를 처리합니다.
3. **정확성이 필요하신가요?** `/ulw-plan`을 실행해 `.omo/plans/`에 계획을 생성한 다음 `/ulw-execute`를
   실행하세요. 메인 에이전트가 동일한 세션에서 확정된 계획을 실행합니다.
4. **에이전트/카테고리를 직접 설정하고 싶으신가요?**
   [`docs/guide/agent-model-matching.md`](../04-에이전트-모델-매칭-가이드/01-출시-게이트가-적용된-Fable-55-준비.md#에이전트-모델-매칭-가이드)를 읽어보세요. 어시스턴트가 요구사항을
   질문하고 설정을 조정할 수 있습니다.

그런 다음 **축하합니다! 🎉 oh-my-openagent 설정이 완료되었습니다! 사용을 시작하려면 터미널에
`opencode`(또는 `codex`)를 입력하세요.**

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

### 8단계: 팀 모드(선택 사항)

팀 모드는 기본적으로 꺼져 있습니다. 활성화하면 전용 도구 12개를 사용해 리드와 구성원으로 이루어진 다중 에이전트 시스템을 운영할 수 있습니다.

활성화하려면 플러그인 설정을 편집하세요.

```jsonc
// ~/.omo/omo.jsonc의 "[opencode]" 블록 또는 <project>/.omo/omo.jsonc의 "[opencode]" 블록
{
  "team_mode": {
    "enabled": true,
    "max_parallel_members": 4,         // 1..8
    "max_members": 8,                  // 1~8의 하드 한도
    "tmux_visualization": false,
    "max_messages_per_run": 10000,
    "max_wall_clock_minutes": 120,
    "max_member_turns": 500,
    "message_payload_max_bytes": 32768,
    "recipient_unread_max_bytes": 262144,
    "mailbox_poll_interval_ms": 3000
  }
}
```

변경 후 OpenCode를 다시 시작하세요. 다음 12개 도구를 사용할 수 있습니다: `team_create`, `team_delete`,
`team_shutdown_request`, `team_approve_shutdown`, `team_reject_shutdown`,
`team_send_message`, `team_task_create`, `team_task_list`, `team_task_update`,
`team_task_get`, `team_status`, `team_list`.

팀 데이터는 `~/.omo/teams/{name}/`(사용자 범위) 또는 `<project>/.omo/teams/{name}/`(프로젝트 범위)에
저장됩니다. 두 위치가 충돌하면 프로젝트 범위의 데이터가 사용자 범위보다 우선합니다.

구성원 지정 규칙:

- **리드는 현재 세션입니다.** 리드 구성원을 별도로 선언하지 마세요.
- **구성원**은 해결 가능한 카테고리를 지정하는 `category` 구성원(`prompt` 필요)이거나, 사용자 지정 에이전트 이름을
  지정하는 `subagent_type` 구성원입니다.
- **구문 분석 시 거부되는 이름**: 읽기 전용 에이전트(`explore`, `librarian`, `plan-consultant`,
  `plan-reviewer`) 및 ulw-loop 검토자 3종(`omo-native-code-reviewer`,
  `omo-native-qa-executor`, `omo-native-gate-reviewer`)은 구성원으로 지정할 수 없습니다. 이름 변경
  전의
  `omo-senpi-code-reviewer`, `omo-senpi-qa-executor`, `omo-senpi-gate-reviewer`
  표기는 여전히 인식됩니다. 이 에이전트에는 대신 `task` 도구로 작업을 위임하세요.

팀 모드를 활용하는 스킬 두 가지가 이미 제공됩니다.

- **`security-research`**(내장): 취약점 explore 3명과 PoC 엔지니어 2명이 동시에
  코드베이스를 감사합니다.
- **`hyperplan`**은 에이전트에게 `hyperplan` 스킬을 로드하도록 지시하는 키워드/명령입니다. 이 스킬은 OpenCode
  `createBuiltinSkills`에 포함되어 있지 않습니다.

전체 가이드: [`docs/guide/team-mode.md`](../05-팀-모드-가이드.md#팀-모드-가이드).

### 9단계: 고급 설정

#### 설정 파일 우선순위

```text
프로젝트 계층(가장 가까운 항목 우선): <pwd up to $HOME>/.omo/omo.json[c]
                            ↓ 다음에 병합
사용자 계층:                  ~/.omo/omo.json[c]
                            ↓ 하네스별로 해석되며 뒤쪽 항목 우선
공유 기본값 → [opencode] 블록 → profiles.<P> → profiles.<P>.[opencode]
                            ↓ 마지막에 한 번 적용
Defaults
```

병합 규칙:

- 일반 객체: 재귀적으로 깊이 병합하며 프로토타입 오염을 방지합니다.
- 스칼라와 배열: 재정의한 값이 기본값을 대체합니다.
- `mcp_env_allowlist`: 보안상 **사용자 계층에서만** 설정할 수 있으며 프로젝트 계층에서는 확장할 수 없습니다.
- 프로필 활성화 우선순위: `OMO_PROFILE` > `OCX_PROFILE` > `OPENCODE_CONFIG_DIR` 경로 끝의
  `profiles/<name>` > 없음

편집기에서 스키마 자동 완성을 사용하려면:

```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/omo.schema.json"
}
```

#### 기능 끄기

모든 에이전트, 훅, 스킬, MCP, 명령 및 도구는 `disabled_*` 배열로 비활성화할 수 있습니다.
`disabled_skills`는 `~/.omo/omo.jsonc`의 공유 기본 설정과 OmO Native(`omo`)에서도 작동합니다. 예를 들어
`{ "disabled_skills": ["frontend", "visual-qa"] }`를 설정하면 세션에서 해당 스킬이 제거됩니다. 사용자 및
프로젝트의 `disabled_*` 배열은 서로 덮어쓰지 않고 병합됩니다.

```json
{
  "disabled_agents": ["librarian"],
  "disabled_hooks": ["goal", "keyword-detector"],
  "disabled_skills": ["playwright"],
  "disabled_mcps": ["grep_app"],
  "disabled_commands": ["hyperplan"],
  "disabled_tools": ["interactive_bash"]
}
```

#### 환경변수

- **`OMO_INVOCATION_NAME`**: 감지된 저장소 이름(`oh-my-opencode`, `omo-agent-toolkit`,
  `lazycodex-ai` 등)을 재정의합니다. 공유 래퍼 패키지에서 `lazycodex-ai` 호출을 노드 설치 프로그램 경로로
  전달하는 데 사용합니다.
- **`OMO_DISABLE_POSTHOG=1`**: 기본 플러그인의 모든 PostHog 원격 측정을 비활성화합니다.
- **`OMO_SEND_ANONYMOUS_TELEMETRY=0`**: 위와 동일한 효과가 있습니다.
- **`OMO_CODEX_DISABLE_POSTHOG=1`**: Codex CLI Light 버전의 PostHog 원격 측정만 비활성화합니다.
- **`OMO_CODEX_SEND_ANONYMOUS_TELEMETRY=0`**: 위와 동일한 효과가 있습니다.
- **`OMO_DISABLE_PROCESS_CLEANUP=1`**: 상위 프로세스가 종료될 때 백그라운드 에이전트 프로세스를 정리하려는 시도를
  비활성화합니다.
- **`OMO_OPENCLAW_COMMAND_TIMEOUT_MS`**: OpenClaw에서 외부로 실행하는 셸/HTTP 명령의 시간 초과를 설정합니다.
- **`OMO_OPENCLAW_DEBUG=1`**: OpenClaw 디버그 로깅을 활성화합니다.
- **`OMO_OPENCLAW_REPLY_LISTENER_STARTUP_TOKEN`**: OpenClaw 응답 리스너 데몬의 시작 토큰을 설정합니다.
- **`OMO_OPENCLAW_REPLY_LISTENER_STARTUP_TIMEOUT_MS`**: 응답 리스너의 시작 시간 초과를 설정합니다.
- **`OH_MY_OPENCODE_FORCE_BASELINE=1`**: x64에서 AVX2가 아닌 기본 바이너리를 강제로 선택합니다.
- **`OPENCODE_DEFAULT_AGENT`**: `omo-agent-toolkit run`의 기본 에이전트를
  설정합니다(`--agent`로 재정의 가능).
- **`CODEX_LOCAL_BIN_DIR`**: Codex 구성 요소의 심볼릭 링크에 사용할 `~/.local/bin` 경로를 재정의합니다.

#### 해시 고정 편집(해시라인)

해시 고정 편집은 기본적으로 꺼져 있습니다(`hashline_edit`는 불리언이며 기본값은 false입니다).
`"hashline_edit": true`를 설정하면 파일을 읽을 때 출력에 `LINE#ID` 해시 태그가 붙고 편집 도구가 교체됩니다.
마지막으로 파일을 읽은 뒤 내용이 변경되었다면 `hashline_edit` 도구는 편집을 거부합니다.

#### OpenClaw(선택적 외부 알림)

OpenClaw는 양방향 외부 통합 기능입니다. 외부 알림 전송기는 세션 이벤트(유휴, 오류, 완료)가 발생하면 Discord/Telegram/HTTP/셸
대상으로 알림을 보냅니다. 선택적으로 사용할 수 있는 인바운드 응답 리스너 데몬은 Discord/Telegram을 폴링하고
`send-keys`로 추적 중인
tmux 창에 응답을 전달합니다. `openclaw` 설정 블록에서 설정합니다. 전체 참조는
`packages/omo-opencode/src/openclaw/`를 확인하세요.

### 10단계: 유지 관리

- **`bunx oh-my-openagent doctor`**: 8가지 OpenCode 항목(시스템/설정/TUI 플러그인/사용되지 않는 추론
  키/도구/모델/원격 측정/팀 모드)을 검사하거나, 별도의 Codex 대상
  항목(Codex/codex-comComponents/codex-runtime-wrapper)을 검사합니다.
- **`bunx oh-my-openagent boulder`**: `.omo/boulder.json`에서 볼더 작업 상태와 작업별 통계를 확인합니다.
- **`bunx oh-my-openagent refresh-model-capabilities`**: models.dev에서
  `models.json` 캐시를 새로 고칩니다.
- **`bunx oh-my-openagent mcp oauth login <server-name>`**: OAuth로 MCP 서버에 인증합니다.
- **`bunx oh-my-openagent mcp oauth logout <server-name>`**: MCP 서버에 저장된
  OAuth 토큰을 제거합니다.
- **`bunx oh-my-openagent mcp oauth status [server-name]`**: 지정한 서버 또는 모든 서버의
  OAuth 토큰 상태를 표시합니다.
- **`bunx oh-my-openagent get-local-version`**: 설치된 버전과 npm의 최신 버전을 표시합니다.
- **`bunx oh-my-openagent version`**: CLI 버전을 출력합니다.
- **`bunx oh-my-openagent run <message>`**: 비대화형 세션을 실행하며, 할 일 목록이 비워지고 백그라운드 작업이
  유휴 상태가 될 때까지 기다립니다.

설치 후 실행되는 스크립트는 플랫폼에 맞는 바이너리가 선택되는지와 OpenCode 버전 호환성을 모두 검증합니다. 검증은 npm으로 설치할
때마다 실행됩니다.

