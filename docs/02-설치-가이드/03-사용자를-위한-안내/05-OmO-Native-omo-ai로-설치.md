[목차](../../README.md) / [설치 가이드](../README.md) / [사용자를 위한 안내](README.md)

### OmO Native: omo-ai로 설치

OmO Native는 npm 패키지 `omo-ai`로 제공됩니다. 전체 OMO 확장이 로드된 고정 버전의 Senpi 엔진을 시작하는 단일 명령
`omo`를 설치하며, 설정 파일 수정이나 플러그인 등록 등 추가 설정은 필요하지 않습니다. OpenCode 에디션에서 이전하나요?
[OpenCode에서 마이그레이션](/ko/migrating-from-opencode.md) 문서에서 설치 프로그램, `omo setup`가 이전하는
항목, 사용 방식의 대응 관계, 두 버전을 나란히 실행하는 방법을 설명합니다.

설치하고 실행하세요.

```bash
bun add -g omo-ai
omo
```

Bun이 없어도 `npm i -g omo-ai`를 사용할 수 있습니다. 시험판 빌드는 `omo-ai@beta`에 게시됩니다. 채널 운영 방식은
[omo-ai 게시 Runbook](/reference/omo-ai-publishing.md)을 참조하세요.

**omo의 상태 저장 위치.** OmO Native는 `~/.omo/agent` 아래에 엔진 상태(`settings.json`, `auth.json`,
`models.json` 등)를 저장합니다. 통합 전의 단일 디렉터리 구조인 `~/.omo`는 `~/.omo/agent`로 한 번 이전됩니다
(마커는 `.adopted-from-omo-flat`이며 세션, 캐시, 로그는 복사하지 않습니다). 두 브랜드 경로 모두 없으면 엔진은 파일을
복사하지 않고 `~/.senpi/agent`를 대체 경로로 사용하므로 이전 독립형 설치도 계속 작동합니다. 저장 위치를 직접 지정하려면
`OMO_CODING_AGENT_DIR`를 설정하세요. `OMO_*` 변수를 설정하지 않은 경우에도 기존 `SENPI_*` 및 `PI_*` 변수를
계속 읽습니다.

**이전 머신: 전역 `omo` 이름이 이미 사용 중일 수 있습니다.** oh-my-openagent/oh-my-opencode 4.19.4 및
이전
버전은 자체 전역 `omo` 명령을 제공합니다. 이런 머신에서 `npm i -g omo-ai`를 그대로 실행하면 EEXIST 오류로 실패합니다.
`bun add -g omo-ai`는 성공하지만 이전 명령이 PATH에서 우선하므로 `omo --version`는 여전히 `4.19.4`를
출력합니다. `bunx oh-my-openagent install --platform=native`(Bun이 없다면 `npx`)는 이 문제를 처리합니다.
기존 `omo` 항목 하나만 제거하고(이전 패키지와 다른 명령은 유지합니다) `omo-ai`를 설치한 뒤 `omo --version`를
확인합니다. 다른 `omo`가 여전히 먼저 실행된다면 설치 프로그램이 PATH 순서를 바로잡을 정확한 `export PATH=...` 줄을
출력합니다. 나중에 이전 패키지를 제거할 때 `bun remove -g oh-my-openagent`는 omo-ai의 `omo`를
유지합니다. 반면 `npm uninstall -g oh-my-openagent`는 이전 패키지가 선언한 모든 bin 이름을 삭제하며, 여기에는
npm으로 설치한 omo-ai가 현재 소유한 `omo`도 포함됩니다. 따라서 곧바로 `npm i -g omo-ai`를 다시 실행하세요.

---

이전: [직접 설치에 대한 참고 사항](04-직접-설치에-대한-참고-사항.md) | 다음: [첫 번째 실행: omo 설정](06-첫-번째-실행-omo-설정.md)
