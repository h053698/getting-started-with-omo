[목차](../../README.md) / [설정 참조](../README.md) / [기능](README.md)

### MCP

기본으로 활성화되는 내장 MCP는 `websearch`(Exa AI), `context7`(라이브러리 문서), `grep_app`(GitHub
코드 검색), `lsp`(로컬 언어 서버 도구)입니다. 구조적 검색과 재작성은 내장 MCP가 아닌 `ast-grep` 스킬로 제공됩니다.

```json
{ "disabled_mcps": ["websearch", "context7", "grep_app", "lsp"] }
```

---

이전: [알림](09-알림.md) | 다음: [LSP](11-LSP.md)
