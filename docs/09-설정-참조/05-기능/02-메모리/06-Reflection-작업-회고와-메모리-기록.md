<a href="../../../README.md">목차</a> › <a href="../../README.md">설정 참조</a> › <a href="../README.md">기능</a> › <a href="README.md">메모리</a>

#### Reflection: 작업 회고와 메모리 기록

Reflection은 대화를 검토하고 장기적으로 보존할 메모를 메모리에 기록합니다. 단계 수 또는 압축으로 트리거된 자동 실행이 실패하면 다음
트리거에서 즉시 재시도하지 않습니다. 해당 대화에 5초의 백오프를 적용하고, 연속으로 실패할 때마다 대기 시간을 두 배로 늘리되 최대 5분으로 제한합니다.
Reflection이 성공하면 백오프를 해제합니다. `/reflect`는 백오프를 무시하므로 언제든지 강제로 실행할 수 있습니다.

- **옵션: `reflection.enabled`**
  - 기본값: `true`
  - 설명: 다른 메모리 기능은 유지하면서 Reflection만 비활성화할 수 있습니다.
- **옵션: `reflection.trigger.step_count`**
  - 기본값: `25`
  - 설명: N단계마다 Reflection을 실행합니다. `0`은 단계 수 트리거를 비활성화합니다.
- **옵션: `reflection.trigger.on_compaction`**
  - 기본값: `true`
  - 설명: 컨텍스트가 압축될 때도 Reflection을 실행합니다.
- **옵션: `reflection.merge`**
  - 기본값: `"auto"`
  - 설명: 병합 전략을 `auto` 또는 `integration`으로 설정합니다.
- **옵션: `reflection.category`**
  - 기본값: `"quick"`
  - 설명: Reflection 자식 작업에 사용할 작업 실행자 카테고리입니다.
- **옵션: `reflection.timeout_minutes`**
  - 기본값: `15`
  - 설명: Reflection 실행에 적용할 강제 시간 제한입니다.
- **옵션: `reflection.max_concurrent_runs`**
  - 기본값: `1`
  - 설명: 모든 메모리 ID에서 동시에 실행할 수 있는 Reflection/Dream 자식 작업 수입니다.
- **옵션: `reflection.sandbox`**
  - 기본값: `"auto"`
  - 설명: `auto`, `required` 또는 `off`로 설정합니다.

Reflection과 Dream 관리 프로세스는 `<OMO_MEMORY_HOME>/runtime/locks` 아래의 FIFO 슬롯을 공유합니다.
기본 메모리 홈은 `~/.omo/memory`입니다.
대기 중인 작업은 시간 제한 없이 기다리며 삭제되지 않습니다. 대기열에서 보낸 시간은 실행 시간 예산에 포함되지
않습니다. 실행이 승인되면 자식 작업을 시작하기 전에 영구 저장된 모든 마감 시각을 조정합니다. 대체 모델 시도는 남은 실행 시간 예산을 공유합니다.
같은 메모리 홈을 사용하는 모든 세션에서 값이 일치하도록 공유 사용자 설정의 `max_concurrent_runs`를 설정하세요. 이 컴퓨터
단위 설정은 개별 ID에서
재정의할 수 없습니다. 메모리 홈이 다르면 대기열도 별도로 유지됩니다.

---

<p align="right"><sub>다음 문서</sub><br><a href="07-Nudge-메모리-저장-알림.md"><b>Nudge: 메모리 저장 알림</b> →</a></p>

<sub>← 이전: <a href="05-시크릿-검사.md">시크릿 검사</a></sub>
