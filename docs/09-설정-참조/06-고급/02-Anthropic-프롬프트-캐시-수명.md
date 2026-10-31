[목차](../../README.md) / [설정 참조](../README.md) / [고급](README.md)

### Anthropic 프롬프트 캐시 수명

OmO Native는 Anthropic 모델의 프롬프트 접두사를 캐시합니다. 캐시된 접두사는 기본적으로 5분 동안 유지됩니다. 긴 검토, 빌드
대기, 자리 비움 등으로 대화 턴 사이의 간격이 자주 5분을 넘으면, 다음 턴마다 전체 접두사를 캐시에 다시 써야 하므로 캐시 쓰기 토큰 비용이
요금의 대부분을 차지하게 됩니다. Anthropic은 1시간 캐시 수명도 제공하며, OmO Native에서도 이를 사용할 수 있습니다.

`omo`를 시작하기 전에 환경 변수를 설정하여 **모든 Anthropic 모델에 활성화**하세요.

```sh
export PI_CACHE_RETENTION=long
```

**또는 `~/.omo/agent/models.json`에서 모델 ID마다 항목을 하나씩 추가하여 모델별로 활성화하세요**. 이 설정은 어떤
셸에서 시작했는지와 관계없이 해당 에이전트 디렉터리를 읽는 모든 세션에 적용됩니다.

```json
{
  "providers": {
    "anthropic": {
      "modelOverrides": {
        "claude-opus-5-5": { "cacheRetention": "long" },
        "claude-sonnet-5-5": { "cacheRetention": "long" }
      }
    }
  }
}
```

`cacheRetention`에 허용되는 값은 `"short"`(5분, 기본값), `"long"`(1시간), `"none"`(캐싱 없음)입니다.
모델별 값이 환경 변수보다 우선 적용됩니다. 이 값은 `modelOverrides` 아래에 설정하세요. `anthropic`과 같은 기본 제공
모델 제공업체에 직접 설정한 `cacheRetention`은 거부됩니다. 모델 제공업체 수준의 값은 해당 모델 제공업체의 `models`에
정의된 사용자 지정 모델에만 적용되기 때문입니다.

1시간 수명 설정은 Anthropic API 자체(`https://api.anthropic.com`)에만 전송됩니다. 프록시나 다른 기본
URL을 통해 제공되는 모델은 `cacheRetention`이 `"long"`이어도 5분 수명을 유지합니다. 이러한 엔드포인트가 모두 1시간
수명을 지원하지는 않기 때문입니다.

**비용 간의 절충.** Anthropic의 5분 캐시 쓰기 비용은 기본 입력 가격의 1.25배이고, 1시간 캐시 쓰기 비용은 2배이며, 캐시
읽기 비용은 두 경우 모두 0.1배입니다. 수명이 길수록 쓰기당 비용이 높으므로, 대화 턴 간격이 자주 5분을 넘는 경우에 적합합니다.
일반적으로 몇 분 안에 응답한다면 기본값을 유지하세요.

**대안으로 캐시를 유지할 수 있습니다.** `~/.omo/agent/settings.json`의 `promptCache.keepAlive`는
세션이 유휴 상태일 때 캐시가 만료되기 직전에 작은 워밍업 요청을 보냅니다. 따라서 다음 턴에서는 캐시를 다시 쓰지 않고 읽을 수 있습니다.
기본적으로 비활성화되어 있으며, 세션별 제한이 적용됩니다.

```jsonc
{
  "promptCache": {
    "keepAlive": {
      "enabled": true,
      "maxRequestsPerSession": 3,   // 세션당 워밍업 요청 수(기본값 3)
      "maxCostUsdPerSession": 0.05, // 세션당 예상 지출 상한(기본값 0.05)
      "marginSeconds": 60           // 만료 전 이 시간(초)에 전송(기본값 60)
    }
  }
}
```

캐시 유지는 Anthropic API 기본 URL을 사용하는 Anthropic Messages 모델에 대해서만 실행됩니다. 짧은 일시 중지에
사용하세요. 여러 번의 워밍업이 필요할 정도로 긴 대기 시간이 반복된다면 1시간 수명이 더 간단한 옵션입니다.

---

이전: [런타임 폴백](01-런타임-폴백.md) | 다음: [모델 기능](03-모델-기능.md)
