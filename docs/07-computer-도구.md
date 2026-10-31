<sub><a href="README.md">목차</a></sub>

## computer 도구

OmO Native 컴퓨터 사용 구성 요소는 도구 검색으로 찾을 수 있는 `computer` 도구를 등록하고, 활성화되면 JavaScript 및
Python
eval 커널에 `computer` 전역 객체를 제공합니다. 설정, 중지 수단, 플랫폼 제한, 권한은 [컴퓨터
사용](06-OmO-Native의-컴퓨터-사용/01-개요.md#omo-native의-컴퓨터-사용)을 참고하세요.

> **실험적 기능입니다.** 컴퓨터 사용 지원은 실험적이며, 아래 도구 계약은 릴리스 간에 변경될 수 있습니다.

## 도구 인터페이스의 기준

- 구성 요소 등록, 세션 수명 주기, 리소스 검색: `packages/omo-senpi/src/components/computer-use/index.ts`
- 타입이 정의된 Native 전용 설정: `packages/omo-config-core/src/schema/computer.ts`
- 도구 액션 및 검증: `packages/senpi-desktop-tool/src/tool.ts`, `packages/senpi-desktop-tool/src/params.ts`
- 사용자 명령 및 권한 등급: `packages/senpi-desktop-tool/src/command.ts`, `packages/senpi-desktop-tool/src/permission.ts`
- Eval 인터페이스 및 모델용 지침: `packages/senpi-desktop-prelude/src/prelude.js`, `packages/senpi-desktop-prelude/src/prelude.py`
- 엔진 클라이언트 및 프로토콜: `packages/senpi-desktop-service/src`, `packages/senpi-desktop-protocol/src`
- 엔진 및 플랫폼 백엔드: `crates/senpi-desktop-engine`,
  `crates/senpi-desktop-backend-macos`, `crates/senpi-desktop-backend-x11`,
  `crates/senpi-desktop-backend-wayland`, `crates/senpi-desktop-backend-win32`

## 액션

- **`action`: `call`**
  - 매개변수: 데스크톱 도우미 호출을 지정하는 `chain`: `{ method, args? }`. 필요하면 창 또는 요소 메서드 하나를
    뒤에 연결할 수 있습니다.
  - 결과: 도우미의 실행 결과입니다. 스크린샷은 이미지 콘텐츠도 반환합니다.
- **`action`: `run`**
  - 매개변수: `desktop`, `wait`, `assert`, `tool`을 사용하는 JavaScript 비동기 함수 본문인 `code`,
    선택적 매개변수인 `read_only`와 초 단위의 `timeout`
  - 결과: 반환값과 표시 결과입니다.
- **`action`: `capabilities`**
  - 매개변수: 없음
  - 결과: 백엔드, 캡처/입력/AX 권한, 중지 경로, 포커스 가드 정보입니다.
- **`action`: `close`**
  - 매개변수: 없음
  - 결과: 데스크톱 세션을 종료합니다.

예를 들어 `{ "action": "call", "chain": [{ "method": "screenshot" }] }`은 데스크톱을
캡처합니다. `run`에서는 `await desktop.screenshot()`을 호출한 다음 해당 프레임의 좌표를 사용해
`await desktop.click(x, y)`를 실행할 수 있습니다. 모델에 전달되는 스크린샷은 좌표를 안전하게 사용할 수 있는 크기로
제한되며, 오래된
프레임을 사용하면 `InvalidCoordinateFrame` 오류로 거부됩니다.

eval의 전역 객체인 `computer`는 같은 작업을 유연한 인터페이스로 제공합니다. `read_only: true`로 지정한 `run`에는
런타임
제한이 적용되므로, 입력을 시도하면 읽기 권한 등급을 벗어나지 않은 상태에서 실패합니다.

## 권한 분류

`capabilities`, 검사만 수행하는 `call` 체인, `read_only: true`인 `run`은 `computer:read`를
사용합니다. `close`, 그 밖의 호출과 실행, 알 수 없는 메서드, 잘못된 입력은 `computer:exec`를 사용합니다. 호스트는 엔진에
액션을 보내기 전에 권한 등급을 검사하므로, 실행이 거부된 클릭은 엔진에서 수행한 클릭으로 감사 로그에 기록되지 않습니다. 규칙은
`computer` 도구 전체 또는
`computer:read`와 `computer:exec` 등급에 적용할 수 있습니다. 읽기 권한을 승인해도 실행 권한은 승인되지 않습니다.

## 좌표 기준과 입력 전달 방식

포인터 좌표는 동일한 대상의 최신 스크린샷을 기준으로 하며, 접근성 좌표는 전역 데스크톱 좌표를 사용합니다. 접근성 스냅샷이 생성될 때마다 참조
세대가 바뀌므로, 오래된
참조를 사용하면 `StaleRef` 오류로 실패합니다.

스크롤 양(`scroll`의 `dx`/`dy`, `computer_actions`의 `scroll_x`/`scroll_y`)은 모든 OS에서
동일하게 픽셀 단위를 사용합니다. macOS는 픽셀 스크롤 이벤트를 전송하고, Windows와 X11은 40px당 휠 한 노치로 환산해
전송합니다(반올림하며 최소 한 노치).
Wayland는 같은 비율을 적용하되 노치의 120분의 1 단위로 전송합니다. 따라서 `dy: 120`은 모든 OS에서 약 세 노치만큼
스크롤합니다. 자연스러운
스크롤 설정과 관계없이 양의 `dy`는 콘텐츠 끝 쪽으로, 양의 `dx`는 오른쪽 가장자리 쪽으로 표시 영역을 이동합니다.

지원되는 환경에서는 기본적으로 입력을 백그라운드로 전달합니다. macOS에서는 클릭한 대상 창이 사용자의 맨 앞 창 바로 아래까지 올라올 수
있지만, 맨 앞
앱, 포커스된 창, 커서, 다음 키 입력을 받을 대상은 바뀌지 않습니다. 전경 전달에서는 포커스 가드가 이전 창과 커서를 복원하며, 복원에
실패하면 이를 숨기지 않고
보고합니다. 중지 단축키 입력, 화면 잠금, 중지 경로 상실, OS 권한 누락이 발생하면 백엔드 액션을 수행하기 전에 입력을 거부합니다.

전경 전달에는 현재 세션의 활성 제어 승인도 필요합니다. 호스트는 사용자에게 확인을 받은 뒤
호스트 전용 호출인 `control.grant { reason, confirmationId }`를 실행합니다. `control.revoke`는
승인을 해제하며, `session.close`와 중지 단축키도 승인을 해제합니다. `stopPath.resume`은 승인을 복원하지 않습니다.
프로세스 내에서
승인을 보유할 수 있는 세션은 최대 하나입니다. 다른 세션이 승인을 보유하고 있으면 이를 빼앗지 않고 `InputBusy` 오류로 요청을
거부합니다. 공개 인터페이스인 `control.state`는
`{ active, reason?, grantedAt? }`를 반환합니다. 전달 방식을 생략하면 백그라운드 전달을 사용하지만, `desktop`
또는
`display:*` 대상의 포인터/키보드 입력(click, moveMouse, drag, scroll, typeText, keyChord,
holdKeys, holdMouse)에는 항상 승인이 필요합니다. 모든 백엔드가 사용자의 실제 포인터와 맨 앞 앱에 입력을 전역으로 전달하므로,
엔진은 요청한
전달 방식이 아니라 실제 영향을 기준으로 허용 여부를 판단합니다(#10788). 전체 접근 모드에서는 OmO 호스트가 비대화형 실행에서도 확인
없이 직접
승인하며, 세션이 전체 접근 모드를 벗어나면 승인을 해제합니다. `raiseWindow`(`win.raise()`)는 창을 올릴 때 항상
사용자의 전경을
차지하므로 승인이 필요합니다. 이는 사용자 제어권을 빼앗는 입력만 제한하는 upstream oh-my-pi보다 의도적으로 엄격한 동작입니다.

## 오류 코드

실패한 호출에는 엔진 오류 코드 하나가 포함됩니다(`crates/senpi-desktop-core/src/error.rs`). 사용자나 모델이
대응해야 하는 주요 코드는 다음과 같습니다.

- **코드: `PermissionDenied`**
  - 의미: 화면 캡처, 입력 또는 접근성에 필요한 OS 권한이 없습니다.
  - 조치: OmO를 실행하는 앱에 권한을 부여하세요. [운영체제 설정](06-OmO-Native의-컴퓨터-사용/01-개요.md#omo-native의-컴퓨터-사용)을 참조하세요.
- **코드: `Suspended`**
  - 의미: 사용자가 중지 단축키를 누르거나 `/computer stop`을 실행했습니다. macOS/X11에서는 물리적 입력만 인정합니다.
  - 조치: 작업을 중지하세요. `/computer resume`은 사용자만 실행할 수 있습니다.
- **코드: `StopPathUnavailable`**
  - 의미: 전역 중지 단축키를 준비할 수 없거나 키 입력을 감지할 수 없어(`secure-input-active`) 입력이 거부되었습니다.
    실행 중인
    `typeText`는 다음 문자를 입력할 때, 메뉴 순회는 다음 메뉴 단계에서 이 코드로 중지됩니다. 이후에도 중지 상태가 유지되지는 않습니다.
  - 조치: 단축키를 준비할 수 있는 호스트 또는 `allow_host_relay_only_stop`을 사용하세요.
    `secure-input-active`인 경우에는
    사용자가 비밀번호 필드에서 포커스를 옮길 때까지 기다리세요.
- **코드: `ScreenLocked`**
  - 의미: 화면이 잠겨 있습니다.
  - 조치: 세션 잠금을 해제하세요.
- **코드: `BackgroundUnavailable`**
  - 의미: 대상이 백그라운드 전달을 거부했습니다.
  - 조치: 접근성 작업 또는 `delivery: "foreground"`를 사용하세요.
- **코드: `ControlRequired`**
  - 의미: 현재 세션에 제어 권한이 부여되지 않은 상태에서 전경 전달, `raiseWindow` 또는 데스크톱/디스플레이 입력을 요청했습니다.
  - 조치: 사용자 동의를 받을 수 있는 호스트에서 사용자 확인 후 `control.grant`를 호출하세요. 브리지
    클라이언트(`--oneshot`, MCP)는 권한을 부여할 수
    없으므로 창 대상 백그라운드 전달을 사용하세요.
- **코드: `InputBusy`**
  - 의미: 다른 세션이 전경 제어 권한을 보유하고 있습니다.
  - 조치: 해당 세션이 권한을 해제하거나 종료된 후 다시 시도하세요.
- **코드: `InvalidCoordinateFrame`**
  - 의미: 좌표가 동일한 대상의 최신 스크린샷에 속하지 않거나 대상이 이동하거나 크기가 변경되었습니다.
  - 조치: 동일한 대상의 스크린샷을 새로 촬영하세요.
- **코드: `StaleRef`**
  - 의미: 이전 접근성 스냅샷의 참조를 사용했습니다.
  - 조치: 새 `ax()` 스냅샷을 생성하세요.
- **코드: `WindowNotFound`, `InvalidTarget`**
  - 의미: 창이 닫혔거나 필터와 일치하는 창이 없거나 여러 개입니다.
  - 조치: 창 목록을 다시 확인하고 창 하나를 선택하세요.
- **코드: `AxUnsupported`, `AxFailed`**
  - 의미: 요소 또는 플랫폼이 접근성 작업을 지원하지 않습니다.
  - 조치: 포인터 입력으로 대체하세요.
- **코드: `FocusRestoreFailed`, `CursorRestoreFailed`**
  - 의미: 전경 전달 후 이전 창 또는 커서 상태를 복원하지 못했습니다.
  - 조치: 실패 사실을 숨기지 말고 사용자에게 알리세요.
- **코드: `CaptureFailed`, `InputFailed`, `Timeout`, `Cancelled`, `Closed`,
  `TransactionFailed`, `Internal`**
  - 의미: 플랫폼 호출 실패, 시간 초과, 중단 또는 세션 종료가 발생했습니다.
  - 조치: 다시 시도하기 전에 상태를 다시 확인하고, 실패가 반복되면 중지하세요.

엔진 시작 실패는 `/computer status`에서 `engine: native-unavailable`, `quarantined`,
`abi-mismatch`로 표시됩니다. 자세한 내용은 [문제 해결](06-OmO-Native의-컴퓨터-사용/01-개요.md#omo-native의-컴퓨터-사용)을 참조하세요.

## 엔진 상호 운용성

엔진은 `computer.engine_path`, 컴파일된 사이드카, 패키지의 사전 빌드 바이너리, `target/release` 순서로
탐색합니다(`packages/senpi-desktop-engine/src/locator.ts`). OmO Native 외부에서는
`senpi-desktop-engine --enable-daemon --mcp`가 MCP stdio를 통해 동일한 엔진 작업을 제공합니다.
작업은 데몬을 통해
전달되며 중지 경로와 감사 검사는 그대로 유지됩니다. 릴레이 전용 중지를 사용하는 호스트는 하트비트를 유지해야 하며, 모델은 사용자 전용 재개 작업을
호출할 수 없습니다. MCP 및 `--oneshot` 브리지는 호스트 전용인 `control.grant`를 거부하므로 데스크톱 및 디스플레이
입력도 `ControlRequired`로 거부됩니다. 백엔드가 지원하는 경우 창 대상 백그라운드 입력은 계속 사용할 수 있습니다.
Wayland는 전혀
지원하지 않으므로 브리지만 사용하는 Wayland 세션에서는 포인터나 키보드 입력을 주입할 수 없습니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="08-CLI-참조/01-실행-파일-명령.md"><b>실행 파일 명령</b> →</a></p>

<sub>← 이전: <a href="06-OmO-Native의-컴퓨터-사용/09-엔진-모드와-bunshin.md">엔진 모드와 bunshin</a></sub>
