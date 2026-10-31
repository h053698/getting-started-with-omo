<a href="../README.md">목차</a> › <a href="README.md">에이전트-모델 매칭 가이드</a>

## omo.json에서 사용자 지정

`omo.json`에서 카테고리나 전용 에이전트의 모델을 덮어쓸 수 있습니다. `model`은 모델 하나를, `models`는 내장 대체
순서보다 먼저 시도할 모델 목록을 지정합니다. 목록 항목은 `provider/model` 형식의 문자열에
`openai/gpt-6-astra:xhigh`처럼 선택적으로 `:level` 추론 강도를 붙인 값일 수 있습니다. `model`,
`reasoning`, `max_tokens`, `provider_options`를 담은 객체도 사용할 수 있습니다. 전체 키는
[omo.json](/reference/omo-json.md)을 참고하세요.

### 예시 A: Claude와 OpenAI

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-openagent/dev/assets/omo.schema.json",

  "agents": {
    "plan-consultant": {
      "model": "anthropic/claude-opus-5-5",
      "reasoning": "high"
      },
    "plan-reviewer": { "model": "openai/gpt-6-astra", "reasoning": "xhigh" },
    "explore": { "model": "openai/gpt-6-luna-fast", "reasoning": "low" },
    "librarian": { "model": "openai/gpt-6-luna-fast", "reasoning": "low" }
  },

  "categories": {
    "visual-engineering": {
      "model": "anthropic/claude-fable-5-1",
      "reasoning": "max"
      },
    "deep-high": { "model": "openai/gpt-6-astra", "reasoning": "high" },
    "ultrabrain": { "model": "openai/gpt-6-astra", "reasoning": "max" },
    "unspecified-high": {
      "model": "anthropic/claude-opus-5-5",
      "reasoning": "medium"
      }
  }
}
```

### 예시 B: Claude형 역할에 Kimi와 GLM 사용

```json
{
  "agents": {
    "plan-consultant": { "model": "kimi-for-coding/kimi-k3" }
  },
  "categories": {
    "visual-engineering": {
      "model": "kimi-for-coding/kimi-k3",
      "reasoning": "max"
      },
    "unspecified-high": {
      "models": [
        { "model": "zai-coding-plan/glm-5.3", "reasoning": "max" },
        "kimi-for-coding/kimi-k3"
      ]
    }
  }
}
```

### 예시 C: 대체 순서에 GPT 대신 DeepSeek 지정

```json
{
  "categories": {
    "deep-low": {
      "models": [
        { "model": "openai/gpt-6-sol", "reasoning": "medium" },
        { "model": "deepseek/deepseek-v4-pro", "reasoning": "max" }
      ]
    }
  }
}
```

사용자가 `deep-low`를 직접 설정했으므로 GPT-6 모델이 없는 머신에서도 목록에 남고 DeepSeek V4 Pro로 실행할 수 있습니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="07-권장하는-모델-재정의와-피해야-할-설정.md"><b>권장하는 모델 재정의와 피해야 할 설정</b> →</a></p>

<sub>← 이전: <a href="05-전용-에이전트와-카테고리의-독립적인-대체-순서.md">전용 에이전트와 카테고리의 독립적인 대체 순서</a></sub>
