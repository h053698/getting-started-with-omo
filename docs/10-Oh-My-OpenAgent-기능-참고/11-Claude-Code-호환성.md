## Claude Code 호환성

Claude Code 설정을 읽어들이는 호환 기능을 제공합니다.

### 설정 로더

- **명령**: OpenCode: `~/.config/opencode/command(s)/`, `.opencode/command(s)/`.
  Claude: `~/.claude/commands/`, `.claude/commands/`(`claude_code.commands`로 제어)
- **스킬**: `~/.config/opencode/skills/*/SKILL.md`, `.claude/skills/*/SKILL.md`
- **에이전트**: `~/.config/opencode/agents/*.md`, `.claude/agents/*.md`
- **MCP**: `~/.claude.json`, `~/.config/opencode/.mcp.json`, `.mcp.json`, `.claude/.mcp.json`

MCP 설정에서는 환경 변수 `${VAR}`를 확장할 수 있습니다.

### 호환성 설정

기능별로 끄려면 다음과 같이 설정하세요.

```json
{
  "claude_code": {
    "mcp": false,
    "commands": false,
    "skills": false,
    "agents": false,
    "hooks": false,
    "plugins": false
  }
}
```

| 설정 | 비활성화되는 기능 |
| --- | --- |
| `mcp` | `.mcp.json` 파일(내장 MCP는 유지) |
| `commands` | Claude Code 경로의 명령 |
| `skills` | Claude Code 경로의 스킬 |
| `agents` | Claude Code 경로의 에이전트(내장 에이전트는 유지) |
| `hooks` | settings.json 훅 |
| `plugins` | Claude Code 마켓플레이스 플러그인 |

특정 플러그인만 비활성화하려면 다음과 같이 설정하세요.

```json
{
  "claude_code": {
    "plugins_override": {
      "claude-mem@thedotmack": false
    }
  }
}
```

