# CLI로 모델 설정하기

이 문서는 아래 문서들에 흩어져 있는 내용 중 터미널에서 OmO Native(`omo`)의 모델을 설정하는 데 필요한 부분만 모은 것입니다.
여기 적은 명령과 키는 모두 이 폴더의 문서에 나온 것입니다. 자세한 설명은 각 항목의 링크를 따라가세요.

`omo`에는 모델 값을 바로 써 주는 명령이 없습니다.
모델은 설정 파일 `omo.jsonc`(또는 `omo.json`)에서 정하고, CLI로는 로그인 상태와 실제로 어떤 모델이 선택되는지 확인합니다.

## 1. 로그인 확인

```bash
omo login
omo account show
```

`omo account`의 하위 명령(`show`, `adopt`, `token`, `export`, `forget`)은 `omo login`과 같은 OS 키체인 로그인 정보를 씁니다.
[CLI 참조](08-CLI-참조.md#omo-계정omo-native)

## 2. 설정 파일 위치

```text
프로젝트 계층(가장 가까운 항목 우선): <pwd up to $HOME>/.omo/omo.json[c]
사용자 계층:                         ~/.omo/omo.json[c]
```

프로젝트의 `.omo/omo.jsonc`가 있으면 사용자 설정보다 우선합니다.
[설정 파일 우선순위](02-설치-가이드/04-LLM-에이전트용-설치-절차.md#설정-파일-우선순위)

## 3. 메인 세션 모델: `model_profile`

프로필 이름을 지정하면 omo가 연결된 제공업체에서 사용할 수 있는 첫 번째 모델을 고릅니다.

```json
{ "model_profile": "capable" }
```

특정 모델을 계속 쓰려면 모델 ID를 그대로 넣습니다. 값에 `/`가 있으면 모델 ID로 처리합니다.

```json
{ "model_profile": "anthropic/claude-opus-5-5" }
```

설정이 겹치면 다음 순서로 적용합니다.

1. `--model` 플래그 또는 특정 범위에 지정한 모델
2. `model_profile`에 직접 지정한 모델
3. `model_profile`에 지정한 프로필
4. Senpi의 기본 설정

`model_profile`은 메인 세션 모델만 정합니다. 카테고리와 에이전트는 각자의 대체 순서를 따릅니다.
[프로필을 선택하세요](01-소개.md#프로필을-선택하세요),
[네 가지 프로필](04-에이전트-모델-매칭-가이드/02-네-가지-프로필이-메인-에이전트-모델을-선택하는-방식.md)

## 4. 카테고리와 에이전트 모델: `categories`, `agents`

`model`은 모델 하나를 지정하고, `models`는 내장 대체 순서보다 먼저 시도할 목록을 지정합니다.
`openai/gpt-6-astra:xhigh`처럼 `:level`을 붙여 추론 강도를 정할 수 있습니다.

```jsonc
{
  "agents": {
    "explore": { "model": "openai/gpt-6-luna-fast", "reasoning": "low" }
  },
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

[omo.json에서 사용자 지정](04-에이전트-모델-매칭-가이드/06-omojson에서-사용자-지정.md),
[권장하는 재정의와 피해야 할 설정](04-에이전트-모델-매칭-가이드/07-권장하는-모델-재정의와-피해야-할-설정.md)

## 5. 결과 확인

```bash
omo doctor --models
omo doctor --models --json
```

모든 카테고리와 에이전트에 대해 먼저 실행되는 모델, 재시도 순서, 출처(`built-in`, `omo.json`, `category:<name>`), 상태(`runs first`, `fallback N`, `excluded by exclude_models`, `no login`, `not reached`)를 출력합니다.
메인 세션의 `model_profile` 경로도 함께 보여 줍니다. 자격 증명은 조회하지 않습니다.
[doctor 진단](08-CLI-참조.md#doctor-진단)

## 6. 기존 OpenCode 설정이 있을 때

`omo setup`을 실행하면 사용자 동의를 받은 뒤 OpenCode 에디션의 모델 설정을 Native 설정으로 옮겨 줍니다.
설정 차이가 남아 있는 동안에는 `omo doctor`가 같은 안내를 계속 표시합니다.
[시작하기](09-설정-참조/02-시작하기.md)
