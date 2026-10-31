<sub><a href="../README.md">목차</a> › <a href="README.md">CLI 참조</a></sub>

## mcp oauth: 인증 관리

MCP 서버의 OAuth 토큰을 관리합니다. 서버가 지원하는 경우 PKCE와 동적 클라이언트 등록을 포함한 Tier-3 MCP OAuth 흐름을
사용합니다.

### mcp 인증 사용법

```bash
# 인증하다
bunx oh-my-openagent mcp oauth login <server-name> --server-url https://api.example.com

# 명시적인 클라이언트 ID 및 범위로 인증
bunx oh-my-openagent mcp oauth login <server-name> --server-url \
  https://api.example.com --client-id my-client --scopes read write

# 저장된 토큰 제거
bunx oh-my-openagent mcp oauth logout <server-name> --server-url https://api.example.com

# 토큰 상태 표시
bunx oh-my-openagent mcp oauth status [server-name]
```

### mcp 인증 옵션

| 옵션 | 설명 |
| --- | --- |
| `--server-url <url>` | OAuth 서버 URL(`login`과 `logout`에 모두 필요) |
| `--client-id <id>` | OAuth 클라이언트 ID(서버가 DCR을 지원하면 선택 사항) |
| `--scopes <scopes...>` | 여러 값을 지정할 수 있는 OAuth 범위 |

---

<p align="right"><sub>다음 문서</sub><br><a href="12-종료-코드.md"><b>종료 코드</b> →</a></p>

<sub>← 이전: <a href="10-version.md">version</a></sub>
