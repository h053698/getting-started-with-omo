[목차](../README.md) / [CLI 참조](README.md)

## refresh-model-capabilities: 모델 기능 갱신

models.dev에서 가져와 캐시한 모델 기능 스냅샷을 새로 고칩니다.

### 모델 기능 새로 고침 사용법

```bash
bunx oh-my-openagent refresh-model-capabilities
```

### 모델 기능 새로 고침 옵션

| 옵션 | 설명 |
| --- | --- |
| `-d, --directory <path>` | 플러그인 설정을 읽을 작업 디렉터리 |
| `--source-url <url>` | models.dev 소스 URL 재정의 |
| `--json` | 새로 고침 요약을 JSON으로 출력 |

### 모델 기능 갱신 설정

```jsonc
{
  "model_capabilities": {
    "enabled": true,
    "auto_refresh_on_start": true,
    "refresh_timeout_ms": 5000,
    "source_url": "https://models.dev/api.json"
  }
}
```

---

---

이전: [get-local-version: 로컬 버전 조회](08-get-local-version-로컬-버전-조회.md) | 다음: [version](10-version.md)
