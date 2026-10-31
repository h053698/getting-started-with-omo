<sub><a href="../README.md">목차</a> › <a href="README.md">오케스트레이션 시스템 가이드</a></sub>

## 실행: /ulw-execute

```text
/ulw-execute [plan-name] [--worktree <absolute-path>] [--make-pr] [--ship]
```

- `plan-name`(선택): `.omo/plans/`에 있는 파일 이름의 전체 또는 일부.
- `--worktree`: 새 워크트리를 만드는 대신 첫 단계에서 기존 작업 소유 워크트리를 재사용합니다.
- `--make-pr`: 단계별 워크트리를 풀 리퀘스트로 제출하고 URL을 전달합니다. 병합은 사용자가 요청할 때만 합니다.
- `--ship`: `--make-pr`도 적용하고, PR이 병합될 때까지 워크트리에서 CI와 검토 의견을 반영합니다.

메인 에이전트가 승인된 작업 계획을 같은 세션에서 실행합니다. 에이전트를 교체하는 대신 실행 스킬의 오케스트레이션 규칙을 따릅니다. **메인
에이전트는 제품 코드를 직접 작성하지 않습니다.** 구현·테스트·QA·검토는 모두 워커에게 위임합니다. 메인 에이전트는 계획 선택,
`.omo/` 상태, 작업 분해와 배정, 결과 판정과 증거를 관리합니다.

### 실행하면 일어나는 일

1. **계획 선택.** `.omo/boulder.json`에서 현재 세션의 `active` 또는 `paused` 작업을 찾아 재개합니다. 없으면
   `plan-name`과 일치하는 계획을 찾거나, 계획이 하나면 자동으로 선택합니다. 여러 개면 질문 하나로 결정합니다.
   선택할 계획이 전혀 없으면 `/ulw-plan`을 먼저 시작합니다.
2. **목표와 할 일 등록.** 세션 목표 하나를 등록하고(도구가 있다면 `create_goal` 사용), 0열 체크박스마다 할 일을
   하나씩 처음부터 등록합니다.
3. **boulder 상태 기록.** `.omo/boulder.json`은 `works`와 `active_work_id`를 담은 여러 작업의
   레지스트리입니다. 각 작업에 `active_plan`, `plan_name`, `session_ids`(`senpi:<session_id>`
   접두사), `status`, `worktree_path`를 기록합니다.
4. **다음 체크박스 실행.** 작업을 LIGHT 또는 HEAVY로 분류하고 워커가 처리할 크기의 하위 작업으로 나눕니다.
   계획의 `Recommended task executor category:` 줄이나 아래 위임 라우터에 따라 독립된 작업을 한 번에 병렬 배정합니다.
5. **검증 및 기록.** 각 체크박스에는 계획 재확인, 자동 검증, Manual-QA 결과물, 적대적 QA, 정리 증빙의 다섯
   게이트가 있습니다. 증거는 `.omo/ulw-execute/ledger.jsonl`에 기록합니다. 워커가 완료를 보고해도
   독립 검토자(게이트 검토자 또는 새 검토 워커)가 확인하기 전에는 체크박스를 `- [x]`로 바꾸지 않습니다.
6. **완료.** 최상위 체크박스를 모두 완료하면 계획의 최종 검증을 실행하고 `.omo/` 상태를 동기화합니다.
   요청된 PR 처리까지 끝낸 뒤 `ORCHESTRATION COMPLETE` 블록을 출력합니다.

계획의 각 작업 묶음은 해당 작업의 워크트리에서 실행합니다. 체크박스를 검증한 다음 통합 기준 브랜치에 반영하며, 병합은 오케스트레이터만 수행합니다.

### 세션 간 이어서 실행

`ulw-execute-continuation` 구성 요소는 `.omo/boulder.json`을 감시합니다. 현재 세션 작업이 `active`
또는 `paused`이고 계획에 완료하지 않은 최상위 체크박스가 남아 있다면, 사용자 프롬프트마다 이어서 실행하라는 알림을 붙입니다. 알림에는
boulder 상태와 계획을 읽고, 증거를 확인하며 실행을 계속하고, 관계없는 작업을 시작하지 말라는 지시가 들어갑니다. 유휴 턴에는 최대 8회
연속 자동으로 다시 주입됩니다. 계획 중간에 세션을 종료해도 진행 상태는 남습니다. 새 세션에서 `/ulw-execute`를 실행하면 같은
작업을 계획 체크박스와 증거 기록부을 기준으로 재개합니다.

```text
월요일 오전 9:00
  |- /ulw-plan "사용자 인증 구축"
  |- Ultrawork Planner가 인터뷰하고 .omo/plans/user-auth.md를 작성하며 plan-reviewer가 승인
  |- /ulw-execute
  |- boulder.json 생성, 작업 1~2 반영
  |- [세션 종료]

월요일 오후 2:00(새 세션)
  |- /ulw-execute
  |- "'user-auth' 재개 중 - 작업 8개 중 2개 완료"
  |- 작업 3부터 실행 계속
```

---

<p align="right"><sub>다음 문서</sub><br><a href="05-카테고리-스킬.md"><b>카테고리 + 스킬</b> →</a></p>

<sub>← 이전: <a href="03-계획-Ultrawork-Planner.md">계획: Ultrawork Planner</a></sub>
