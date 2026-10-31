[목차](../README.md) / [Oh My OpenAgent 기능 참고](README.md)

## MCP 기능

플러그인은 세 계층의 MCP 구조를 사용합니다.

1. `packages/omo-opencode/src/mcp/`에 있는 내장 MCP(원격 및 로컬 stdio)
2. `${VAR}` 확장을 지원하는 Claude Code `.mcp.json` 로더
3. `SKILL.md` 프런트매터에 선언한 스킬 내장 MCP 서버

### OpenCode 기본 MCP와 플러그인이 추가하는 MCP

Oh My OpenAgent는 OpenCode 플러그인 API를 통해 MCP 서버를 **실행 중에** 추가합니다. `opencode.json`에
직접 설정하는 MCP 서버와는 등록 방식이 다릅니다.

`opencode mcp list`는 OpenCode의 정적 설정만 읽으므로 플러그인이 실행 중에 추가한 MCP는 **표시하지 않습니다**.
정상적인 동작입니다.

```text
# 플러그인이 주입한 MCP이므로 여기에 표시되지 않습니다
$ opencode mcp list
No MCP servers configured
```

Oh My OpenAgent가 실제로 제공하는 MCP 서버는 doctor 명령으로 확인하세요.

```bash
bunx oh-my-openagent doctor --verbose
```

세 계층의 MCP 서버와 별도의 OpenCode 기본 MCP는 다음과 같이 구분합니다.

- **계층: 1 - 내장**
  - 출처: Oh My OpenAgent가 실행 중에 추가(`websearch`, `context7`, `grep_app`, `lsp`)
  - `opencode mcp list`에 표시되나요?: 아니요
- **계층: 2 - Claude Code `.mcp.json`**
  - 출처: `.mcp.json`에서 불러와 Oh My OpenAgent가 실행 중에 병합
  - `opencode mcp list`에 표시되나요?: 아니요
- **계층: 3 - 스킬 내장**
  - 출처: `SKILL.md` 프런트매터에 선언하며 세션별로 필요할 때 실행
  - `opencode mcp list`에 표시되나요?: 아니요
- **계층: - OpenCode 기본**
  - 출처: 플러그인을 거치지 않고 `opencode.json`의 `mcp` 키에 직접 설정
  - `opencode mcp list`에 표시되나요?: 예

**내장 MCP 비활성화**: 플러그인 설정에서 `disabled_mcps`를 사용하세요.

```json
{
  "disabled_mcps": ["websearch", "grep_app"]
}
```

### 내장 MCP

| MCP | 설명 |
| --- | --- |
| **websearch** | Exa AI 기반 실시간 웹 검색 |
| **context7** | 라이브러리·프레임워크의 공식 문서 조회 |
| **grep\_app** | 공개 GitHub 저장소에서 코드를 빠르게 검색해 구현 예시를 찾습니다. |
| **lsp** | 진단, 심볼, 참조, 이름 변경을 위한 로컬 LSP 도구 |

### 스킬 내장 MCP

스킬에 자체 MCP 서버를 포함할 수 있습니다.

```yaml
---
description: 브라우저 자동화 스킬
mcp:
  playwright:
    command: npx
    args: ["-y", "@anthropic-ai/mcp-playwright"]
---
```

`skill_mcp` 도구는 전체 스키마를 확인한 뒤 해당 작업을 호출합니다.

스킬 MCP 클라이언트는 `${sessionID}:${skillName}:${serverName}` 키를 기준으로 세션마다 격리됩니다.

#### OAuth를 사용하는 MCP

스킬에서 OAuth로 보호하는 원격 MCP 서버를 정의할 수 있습니다. RFC 9728, 8414, 8707, 7591을 완전히 준수하는
OAuth 2.1을 지원합니다.

```yaml
---
description: 내 API 스킬
mcp:
  my-api:
    url: https://api.example.com/mcp
    oauth:
      clientId: ${CLIENT_ID}
      scopes: ["read", "write"]
---
```

스킬 MCP에 `oauth`를 설정하면 다음과 같이 동작합니다.

- **자동 검색**: `/.well-known/oauth-protected-resource`(RFC 9728)를 가져오고, 실패하면
  `/.well-known/oauth-authorization-server`(RFC 8414)를 사용합니다.
- **동적 클라이언트 등록**: RFC 7591을 지원하는 서버에 자동으로 등록합니다(`clientId`는 선택 사항이 됩니다).
- **PKCE**: 모든 흐름에서 필수입니다.
- **리소스 지시자**: RFC 8707에 따라 MCP URL에서 자동으로 생성합니다.
- **토큰 저장소**: 서버별 파일을 `~/.config/opencode/mcp-oauth/<hash>.json`에 모드 0600으로
  저장합니다. 기존 `~/.config/opencode/mcp-oauth.json`도 계속 읽습니다.
- **자동 갱신**: 401 응답 시 토큰을 갱신하고, `WWW-Authenticate`가 포함된 403 응답 시 단계적 인증을 수행합니다.
- **동적 포트**: OAuth 콜백 서버가 사용 가능한 포트를 자동으로 찾습니다.

CLI에서 미리 인증하려면 다음 명령을 실행하세요.

```bash
bunx oh-my-openagent mcp oauth login <server-name> --server-url https://api.example.com
```

---

이전: [훅 기능](07-훅-기능.md) | 다음: [모델 기능 참고](09-모델-기능-참고.md)
