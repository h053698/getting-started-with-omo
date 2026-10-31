<sub><a href="../README.md">목차</a> › <a href="README.md">CLI 참조</a></sub>

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

<p align="right"><sub>다음 문서</sub><br><a href="10-version.md"><b>version</b> →</a></p>

<sub>← 이전: <a href="08-get-local-version-로컬-버전-조회.md">get-local-version: 로컬 버전 조회</a></sub>
