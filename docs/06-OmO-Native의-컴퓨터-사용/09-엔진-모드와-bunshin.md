[목차](../README.md) / [OmO Native의 컴퓨터 사용](README.md)

## 엔진 모드와 bunshin

엔진은 `--stdio`(NDJSON을 통한 JSON-RPC), `--serve <socket>`(데몬), `--oneshot`(요청 하나를
데몬에 전달), `--resume`(사용자가 중지한 제어 재개), `--mcp`(MCP stdio 서버), `--selftest`,
`--schema`를 지원합니다. `--serve`, `--oneshot`, `--mcp`는 `--enable-daemon`과 함께 지정해야
실행됩니다. 이 플래그는 실수로 데몬을 실행하는 일을 방지하지만 보안 경계는 아닙니다. macOS에서는 엔진 자체가 권한 책임 프로세스인
경우(책임 연결을 해제한
프로세스 생성, launchd 작업, 셸을 통해 fork-exec하는 호스트) 모든 모드의 실행을 거부합니다. 컴퓨터 사용 권한이 있는 앱이나 터미널의
일반 자식 프로세스로 시작하세요. `--mcp` 모드에서 `tools/list`는 엔진 메서드를 `desktop_<method>` 도구로
제공하며, 캡처
결과에는 MCP 이미지가 포함됩니다. 입력에는 동일한 안전 검사가 적용됩니다. 사용자만 실행할 수 있는 재개 작업을 모델 도구로 노출하지 마세요.

`packages/senpi-desktop-engine/bunshin/descriptor.mjs`의 설명자는 `--oneshot` 브리지를
사용합니다. `bun script/install-bunshin-desktop-capability.mjs`는 로컬에서 사용 가능한 엔진의
설명자를 bunshin 에이전트 기능 디렉터리에 설치합니다. 특정 바이너리를 지정하려면 `--engine <path>`를, 제거하려면 `--remove`를
사용하세요. 설명자를 설치하는 것만으로는 에이전트가 시작되거나 데스크톱 권한이 부여되지 않습니다. `--oneshot` 및 `--mcp`
브리지는 전경 제어
승인을 받을 수 없으므로(`control.grant`는 호스트 전용), 이 브리지를 통한 데스크톱/디스플레이 클릭과 입력 등은
`ControlRequired` 오류로 실패합니다. 대신 창을 대상으로 백그라운드 입력을 전달하세요. Wayland에서는 창 입력도 지원하지
않으므로, 브리지만
사용하는 Wayland 세션에서는 포인터나 키보드 입력을 전혀 주입할 수 없습니다. OmO처럼 사용자 확인을 받을 수 있는 호스트에서는 데스크톱
입력을
계속 사용할 수 있습니다.

---

이전: [알려진 제한](08-알려진-제한.md) | 다음: [computer 도구](../07-computer-도구.md)
