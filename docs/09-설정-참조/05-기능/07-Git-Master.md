<sub><a href="../../README.md">목차</a> › <a href="../README.md">설정 참조</a> › <a href="README.md">기능</a></sub>

### Git Master

Git 커밋 동작을 설정합니다.

```json
{
  "git_master": {
  "include_co_authored_by": true,
  "commit_footer": false,
  "git_env_prefix": "GIT_MASTER=1"
  }
  }
```

`include_co_authored_by`(기본값 `true`)는 git-master가 작성하는 모든 커밋에
`Co-authored-by: sisyphus-dev-ai <sisyphus-dev-ai@users.noreply.github.com>`를
정확히 한 번
추가합니다. 이 값은 `git -c trailer.ifexists=addIfDifferent commit --trailer`로 전달되므로 기존
커밋을 수정하거나 다시 작성해도 중복으로 추가되지 않습니다. 스쿼시 시에는 git-master가 합쳐진 메시지를 한 번 다시 작성합니다.
git 2.32 이상이 필요합니다. 커밋 기록에 이 트레일러를 남기지 않으려면 `false`로 설정하세요. `commit_footer`(기본값
`false`)는 커밋 본문에 "Ultraworked with Sisyphus" 푸터를 추가할지 설정합니다. 문자열을 지정하면 기본 텍스트를
대체합니다. 어느
경우든 커밋의 Git 작성자와 커미터 정보는 유지됩니다.

이 키는 `[opencode]` 내부의 OpenCode 플러그인을 설정합니다. Senpi 하네스는 대신 [omo.json
참조](/ko/omo-json.md#git_master-native-harness)에 문서화된, 타입이 정의된 공유 `git_master` 섹션을
읽습니다.

`git_env_prefix`(기본값 `"GIT_MASTER=1"`)는 git 명령 앞에 추가됩니다. 비활성화하려면 `""`로 설정하세요.

---

<p align="right"><sub>다음 문서</sub><br><a href="08-주석-검사기.md"><b>주석 검사기</b> →</a></p>

<sub>← 이전: <a href="06-Tmux-통합.md">Tmux 통합</a></sub>
