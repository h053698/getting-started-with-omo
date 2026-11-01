# OmO 시작하기

구독 중인 AI 서비스와 API 키를 입력하면 OmO Native 설정을 추천하고 적용해 주는 터미널 설정 도구입니다.

## 바로 실행

macOS 또는 Linux 터미널에서 아래 명령을 실행하세요.

```bash
curl -fsSL https://raw.githubusercontent.com/h053698/getting-started-with-omo/main/start.sh | bash
```

`bash`, `curl`, `tar`가 필요합니다. 이 명령은 원격 `start.sh`를 바로 실행하며, Bun이 없으면 `bun.sh`의 설치 스크립트도 실행합니다. OmO Native의 `omo` 명령은 미리 설치되어 있어야 합니다.

## 사용 순서

1. 언어와 사용 방식을 고릅니다.
2. 구독 또는 API 키 계정을 모두 추가합니다.
3. 추천된 모델 구성을 확인합니다.
4. 계정마다 로그인합니다. 잘못 로그인했거나 건너뛴 계정은 다시 선택할 수 있습니다.
5. 마지막 확인 화면에서 **OmO에 적용**을 눌러 설정을 반영합니다.

로그인 정보는 마지막 적용 전까지 임시 폴더에만 저장됩니다.

### 조작 방법

- 방향키: 이동
- Enter: 선택
- Esc: 이전 화면 또는 건너뛰기
- 마우스: 항목 클릭과 휠 이동

Tab과 Space는 선택에 사용하지 않습니다.

## 문서

기능과 설정 방법은 [한국어 문서](docs/README.md)에서 확인할 수 있습니다.

- [설치 가이드](docs/02-설치-가이드/README.md)
- [설정 참고](docs/09-설정-참조/README.md)
- [CLI 명령 참고](docs/08-CLI-참조/README.md)
