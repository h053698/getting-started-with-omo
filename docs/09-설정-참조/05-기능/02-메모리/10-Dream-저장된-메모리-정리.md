[목차](../../../README.md) / [설정 참조](../../README.md) / [기능](../README.md) / [메모리](README.md)

#### Dream: 저장된 메모리 정리

메모리를 재구성하고 스킬 사용을 감사하며 페르소나 기록을 업데이트하는 통합 처리 과정입니다. 세션이 유휴 상태가 되면 실행 조건이 충족될 때
실행되며, 설정에 따라
종료 시에도 실행됩니다.

| 옵션 | 기본값 | 설명 |
| --- | --- | --- |
| `dream.enabled` | `true` | Dream 실행 활성화 |
| `dream.idle_minutes` | `30` | Dream 실행 전 유휴 시간(분). `0`이면 이 트리거를 끕니다 |
| `dream.min_hours_between` | `24` | Dream 실행 사이의 최소 간격(시간) |
| `dream.shutdown_launch` | `true` | 종료 시 Dream 실행 허용 |
| `dream.auto_select_max` | `5` | `--auto`로 선택할 수 있는 대화 수(1~10) |
| `dream.auto_select_max_chars` | `150000` | 자동 선택된 대화의 바이트 한도 |

---

이전: [Facts: 대화에서 사실 추출](09-Facts-대화에서-사실-추출.md) | 다음: [메모리 진단](11-메모리-진단.md)
