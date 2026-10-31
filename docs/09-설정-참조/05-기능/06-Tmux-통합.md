<a href="../../README.md">목차</a> › <a href="../README.md">설정 참조</a> › <a href="README.md">기능</a>

### Tmux 통합

백그라운드 하위 에이전트를 별도의 tmux 창에서 실행합니다. tmux 내부에서 `opencode --port <port>`를 사용해 실행해야
합니다.

```json
{
  "tmux": {
    "enabled": true,
    "layout": "main-vertical",
    "main_pane_size": 60,
    "main_pane_min_width": 120,
    "agent_pane_min_width": 40,
    "isolation": "inline"
  }
}
```

- **옵션: `enabled`**
  - 기본값: `false`
  - 설명: tmux 창 생성 활성화
- **옵션: `layout`**
  - 기본값: `main-vertical`
  - 설명: `main-vertical` / `main-horizontal` / `tiled` / `even-horizontal` / `even-vertical`
- **옵션: `main_pane_size`**
  - 기본값: `60`
  - 설명: 메인 창의 크기 비율(%)(20–80)
- **옵션: `main_pane_min_width`**
  - 기본값: `120`
  - 설명: 메인 창의 최소 너비(열 수)
- **옵션: `agent_pane_min_width`**
  - 기본값: `40`
  - 설명: 에이전트 창의 최소 너비(열 수)
- **옵션: `isolation`**
  - 기본값: `inline`
  - 설명: `inline` / `window` / `session`

---

<p align="right"><sub>다음 문서</sub><br><a href="07-Git-Master.md"><b>Git Master</b> →</a></p>

<sub>← 이전: <a href="05-브라우저-자동화.md">브라우저 자동화</a></sub>
