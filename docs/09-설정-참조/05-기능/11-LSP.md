<sub><a href="../../README.md">목차</a> › <a href="../README.md">설정 참조</a> › <a href="README.md">기능</a></sub>

### LSP

LSP 도구는 내장 `lsp` MCP 서버에서 제공됩니다([MCP](10-MCP.md#mcp) 참조). 플러그인 설정의 기존 최상위 `"lsp"` 블록은 더
이상 읽지 않습니다. 통합 설정 마이그레이션은 레거시 파일을 가져올 때 이 블록을 제거합니다.

사용자 지정 언어 서버를 설정하려면 프로젝트 루트에 `.opencode/lsp.json`, `.omo/lsp.json` 또는
`.omo/lsp-client.json`를 생성하세요. MCP 서버를 시작할 때는 세 경로를 플랫폼별 경로 구분자로 연결한 검색 목록을
`LSP_TOOLS_MCP_PROJECT_CONFIG`에 설정하며, 서버는 적용 가능한 첫 번째 서버 맵을 읽습니다. 스키마는
`packages/lsp-tools-mcp` 제공 패키지(업스트림:
[code-youngyu/lsp-tools-mcp](https://github.com/code-yeongyu/lsp-tools-mcp))에
있습니다.

LSP MCP를 완전히 비활성화하려면 다음과 같이 설정하세요.

```json
{ "disabled_mcps": ["lsp"] }
```

프로세스 정리는 항상 수행되며 별도의 설정 키는 없습니다. 부모 프로세스 감시 기능은 부모가 종료되면 MCP 서버 프로세스를 종료합니다. 새로
시작된 lsp 데몬은
시작 시 이전 버전의 데몬을 인계받습니다. 또한 각 어댑터가 시작될 때 프로세스 계열을 가능한 범위에서 검사하여 고아 lsp 프로세스를
제거합니다(OpenCode 플러그인
시작, Codex `SessionStart` 훅, Senpi 세션 시작).

---

<p align="right"><sub>다음 문서</sub><br><a href="../06-고급/01-런타임-폴백.md"><b>런타임 폴백</b> →</a></p>

<sub>← 이전: <a href="10-MCP.md">MCP</a></sub>
