# v-sideout 저장소 준비 기록 · 2026-09-29

기록 범위: **최초 파일 배치·설치·로컬 검증과 후속 이관 결정**. 아래 커밋 대기·미실행 표기는 최초 준비 단계의 기록이며, 후속 사용자 승인과 소스 관리 기준 전환은 마지막 절을 따른다. 원본 문서에 있는 `v-team-builder`, ‘루트/docs는 Git 밖’ 등의 표현은 이전 당시의 역사 기록이다.

## 작업 위치와 Git 상태

- 새 작업 폴더: `/Users/donnieyu/DevSource/Personal/v-sideout`
- GitHub origin: `https://github.com/donnieyu/v-sideout.git`
- 작업 브랜치: `chore/import-project`
- `HEAD`와 `origin/main`: `a9c1bb389c33f4280ecec903dbf4bb2ad9ae1cc6` (기존 GitHub Initial commit)
- `MERGE_HEAD`: `cf391c2800ba58df8220843cecedb26390f43d95` (기존 최신 인증 브랜치)
- `legacy-web` remote: 원본 로컬 `v-team-builder/web`. 기존 main·인증·이전 통합 브랜치를 읽기 fetch했다.
- 사용자 요청에 따라 새 커밋을 만들지 않았다. `git status`의 **병합 중, 커밋 대기**는 충돌이 아니라 이력 보존용 import 준비 상태다. 검토 대상 파일은 staging되어 있다.

계획의 `git subtree add`는 즉시 커밋을 생성하므로 이번 요청에 맞지 않는다. 대신 `git merge --no-commit --no-ff --allow-unrelated-histories -s ours legacy-web/feat/member-auth-foundation`으로 부모 관계만 준비하고, `git read-tree --prefix=web/ -u legacy-web/feat/member-auth-foundation`으로 전체 앱을 `web/` 아래 배치했다. 최종 staged tree에는 초기 README와 앱·문서가 함께 있다. 기존 앱 main `bfb1597`은 인증 HEAD의 조상이므로 기존 개발 이력도 보존된다. `ours`는 향후 기능 병합에 사용하라는 지침이 아니다.

이번 사용자는 ‘작업 중인 소스들’을 준비하도록 요청했으므로, 계획의 별도 인증 PR 방식 대신 현재 인증 기반까지 한 준비본에 담았다. 인증 완성·운영 연결을 승인한 것은 아니다. 실제 기능 개발은 첫 import 이후 A/R/I별 브랜치로 나눈다.

**다음 커밋을 사용자가 요청하면:** Git 상태와 원본 변동을 다시 확인한 뒤 이 준비본을 하나의 import 병합 커밋으로 기록할 수 있다. 현재 단계에서는 commit, push, PR 생성, 원본 삭제, 기존 채팅의 작업 위치 전환을 하지 않는다. 병합 상태에서 임의로 branch switch/abort/reset하지 않는다.

## 복사 기준과 보존

| 원본 | 기준 | 처리 |
| --- | --- | --- |
| `web/work/member-auth-foundation` | A가 clean/no-writes 확인한 `cf391c2` | 추적 파일 128개를 새 `web/`에 배치. 인증 Task 1·2 포함 |
| 원본 루트 `docs/` | R이 no-writes 및 복사 가능 상태를 확인 | 문서·목업·검증 이미지 294개 복사. 원본 전체 파일 해시 기록 |
| `web/work/member-roster-integration` | `bfa0af1` + 기존 미커밋/미추적 20개 | 정본으로 사용하지 않음. 14개는 A 정본과 동일, 6개는 기존 인증 원본이며 A 보완으로 달라짐. 원본 26개 baseline과 다시 대조 |
| 원본 루트 README | 과거 프로젝트 안내 | 원본 유지, 새 루트에는 현재 상태·실행·작업 지침으로 작성 |

[원본 snapshot JSON](REPOSITORY_SOURCE_SNAPSHOT_2026-09-29.json)은 **설정 문서를 고치기 전 복사한 파일**의 해시다. 복사 중과 복사 후 원본 변동이 없음을 확인했다. 최초 설정 시 새 저장소에서 변경한 기존 파일은 `web/README.md`, `web/.gitignore`, 목업 `README.md`뿐이다. 제품 소스, schema/migration, 테스트, lockfile은 복사 기준 그대로다.

새 파일: 루트 README/AGENTS/gitignore, `.nvmrc`, `.gitattributes`, `.github/workflows/ci.yml`, PR 양식, 본 기록과 snapshot JSON. 기존 연구·검토 문서도 맥락 보존을 위해 포함했다. 개인 Codex 메모리·설정·플러그인·실행 로그는 가져오지 않았다.

설치 패키지·빌드 결과·로컬 DB·작업용 checkout은 추적하지 않는다. 특히 `web/build/`는 플러그인 **소스**라 추적하고, 목업 생성 결과는 정확한 세 디렉터리(`a-shadcn`, `allocation-ab`, `position-slots`)만 제외한다. 기존 수작업 시안은 보존한다. `allocation-reference-a/`는 당시 A안 소스·빌드를 고정한 비교 증거이므로 예외적으로 함께 보존한다. `.gitattributes`는 Markdown의 의도된 줄바꿈 공백과 이 고정 번들 공백만 허용하며 원본 파일을 일괄 재포맷하지 않는다. `.openai/hosting.json`은 기존 D1 바인딩/프로젝트 메타데이터로 유지했다.

## Codex 재개와 담당

Codex에서 새 `v-sideout` 폴더를 프로젝트로 열고 원하는 작업을 요청해 이어갈 수 있다. 실행·구조 정보는 [루트 README](../../README.md), 담당 분담·진척은 관련 작업 문서에서 관리한다. 사용자 후속 결정에 따라 별도의 `AGENTS.md`는 두지 않는다. 기존 채팅은 현재 원본 경로에 연결되어 있으며 자동 이동되지 않는다. 사용자 환경에 설치된 스킬/플러그인을 저장소에 복사할 필요는 없다. 다른 컴퓨터에서 사용할 경우 별도의 개인 도구 설정이 필요하지만, 앱/목업 설치·검증은 저장소의 명령만으로 수행하도록 구성했다.

| 담당 | 기존 채팅 | 책임 |
| --- | --- | --- |
| A | 배포 및 운영 전략 세우기 · `01a0e806-3863-76d1-bfa3-f34e3016e9ae` | 회원·로그인·인증·관리 UI/내부, schema/migration 단독 작성 |
| R | Plan Seoul volleyball club site · `01a0c686-ac70-7ca0-84b9-fddd9c11af09` | 참가·대기·명단·팀편성·관련 UI. 로그인·인증 제외 |
| I | 통합 담당 · `01a0ea7f-c288-7e23-91b2-dfe7c87ebb20` | 셸·계약 연결·업무 API 권한·통합 검증·저장소 준비 |

인증 SSOT v0.4와 Task 1·2 인계가 통합 계획 v0.3의 M0 진행 상태보다 최신이다. **M0는 완료, M1 Task 1·2는 완료, Task 3·4와 앱 연동은 미완료**다. 이전을 위해 복사했다는 사실만으로 모든 공유 파일 편집권이 I에게 넘어오지 않는다.

A/R은 이번 복사 시점에 쓰기 작업이 없음을 확인했다. 첫 import 전 새 수정이 발생하면 원본과 준비본의 차이를 다시 인계해야 한다. 이후 전환은 새 작업 경로·브랜치·진척을 각 담당에게 명시적으로 알리고 수행한다.

## 검증

이번 새 checkout에서 실행한 결과다. Node.js **24.16.0**, npm **11.13.0**. `.nvmrc`와 CI Node 버전을 이 기준으로 지정했다. 중간에 셸 기본 Node가 26.7.0으로 바뀐 것을 발견하여, 마지막에는 `fnm exec --using=24.16.0`으로 앱 테스트·타입·빌드·lint 및 목업 검사·세 빌드를 다시 실행해 아래 결과를 확정했다.

| 검사 | 결과 |
| --- | --- |
| 두 프로젝트 `npm ci` | 통과. 원본 node_modules 링크 없이 각각 설치 |
| 앱 `tests/*.mjs` | 11개 스크립트 모두 통과. 도메인 35개·신원 연결 8개 포함 |
| 앱 TypeScript | `tsc --noEmit --incremental false` 통과 |
| 앱 `npm run build` | 통과. 인증 4개 API와 workspace API 포함 |
| 목업 `check:allocation` | 순수 배정 검사 69개, Vitest 8개 파일·52개 검사 통과 |
| 목업 세 빌드 | `build`, `build:allocation`, `build:positions` 모두 통과 |
| 앱 `npm run lint` | **실패: 오류 1개, 경고 33개.** 원본과 동일한 `web/app/court-app.tsx:37`의 effect 내 setState, `react-hooks/set-state-in-effect`. 제품 코드 변경 없이 기존 과제로 남김 |
| 새 로컬 DB | 생성된 `dist/server/wrangler.json`으로 0000/0001 SQL을 순서대로 `--local` 적용 성공. 운영 DB 미접근 |
| 로컬 HTTP | 5180의 앱 `/`, `/api/workspace?role=member&club=seoul-demo`, `/api/auth/session` 모두 200. session은 anonymous. 4174의 목업 세 경로 모두 200 |
| 브라우저 | 새 경로에서 빌드한 통합 목업의 홈·모임 카드·신청 버튼 렌더를 확인. 이번 이전에서 전체 모바일 UX·모든 사용자 흐름을 재검증한 것은 아님 |
| Git/index·제외 규칙 | 원본 422개 보존, 제품 코드/lockfile 변경 없음. 431개 경로 staged, 미해결 충돌·gitlink·미스테이징 변경 없음. 제외 12개/보존 6개 경로 점검 및 `git diff --cached --check` 통과. HEAD는 초기 커밋 그대로 |
| GitHub Actions | 두 npm 프로젝트의 테스트·타입·빌드를 구성. 아직 push하지 않아 GitHub에서 실행되지 않음. 기존 lint 부채는 필수 CI에 포함하지 않았고 이 기록으로 공개함 |

설치 시 일부 의존성 deprecated/install-script 경고, 목업 검사 시 `module.register()` deprecated 및 jsdom `scrollTo` 미구현 경고가 있었으나 위 명령은 정상 종료했다. 실제 브라우저의 스크롤 검증을 뜻하지 않는다. vinext 빌드의 동적 route 자동 분류 안내도 있었다.

이전 시점의 파일·전체 fetched Git 이력에 대해 private key, GitHub token, AWS access ID, OpenAI key, 자격정보 포함 URL 패턴을 검사했고 일치 항목이 없었다. 이는 제한된 패턴 검사이며 전체 보안 감사·이미지 OCR 검사는 아니다. 원격 저장소 가시성·브랜치 보호 규칙은 변경하지 않았다.

## 독립 검토

읽기 전용 독립 검토에서 원본 422개 파일과 현재 원본의 해시 일치, 명시된 문서 3개 외 제품 코드 무변경, staged 431개·충돌/gitlink/심볼릭 링크 없음, HEAD/이력 보존, 문서 상대 링크·실행 경로·담당 경계를 재확인했다. Critical/Important/Minor로 보고된 실질적 결함은 없었다. 검토자는 테스트·브라우저를 재실행하지 않았고, 제품의 기존 결함·실제 GitHub CI·전체 보안 감사는 판정 범위에서 제외했다. 이 검토는 커밋·배포 승인이 아니다.

## 남은 제품 작업

- A: F02 비밀번호 변경·기존 세션 폐기·신규 세션 발급 원자성(Task 3), 브라우저/서버 신원 계약(Task 4), 회원 관리·로그인 화면·가입 신청 등.
- R: 360px·3팀 배정판에서 이름/X 터치 영역 겹침(P2), 이후 사용자 요청 범위. 목업을 운영 앱 이식 완료로 표시하지 않는다.
- I: 계약 확정 후 앱 셸과 업무 API 연결, 실제 서버 권한·영속 참가 상태·통합 테스트. 현재 `role` query를 쓰는 샘플 workspace API가 실제 인증으로 보호됐다고 주장하지 않는다.
- 기존 lint 오류와 경고는 별도 수정 대상이다. 이 설정 작업은 기능 변경·결함 수정이나 배포 준비 완료를 의미하지 않는다.

## 실행 중인 로컬 미리보기

설정 검증 시 앱은 `http://127.0.0.1:5180/`, 목업은 `http://127.0.0.1:4174/weekend/a-shadcn/`에서 띄웠다. 프로세스는 로컬 세션 상태이며 재시작 후 지속을 보장하지 않는다. 앱의 같은 포트 재실행은 빌드 후 루트에서 `npm --prefix web run start -- --port 5180`이다. 목업 재실행 방법은 루트 README를 따른다. DB와 로그는 ignore 대상이다. 기존 5173/4173 서버는 종료하거나 변경하지 않았다.

## 후속 수정: AGENTS.md의 추가 제약 축소

사용자가 기존 작업보다 제약이 늘어나는 점을 우려하여 `AGENTS.md`를 프로젝트 안내 중심으로 간소화했다. 매 작업의 고정 시작 순서, 이전 기록의 상시 필독, 광범위한 파일별 사전 인계 절차, 특정 브랜치/작업 공간 사용 규칙, 인증 Task별 임시 상태를 제거했다. 사용자 요청 범위에서는 일반적인 수정·구현 선택을 추가 확인 없이 진행하고, 실제 병행 편집 충돌이 예상될 때 필요한 만큼 조율하도록 명시했다. 기존 사용자 지정 A/R/I 분담과 다른 작업 보존은 유지했다. 검증은 변경 영향에 맞게 선택하며 문서 수정에 앱 전체 테스트를 요구하지 않는다.

위 독립 검토는 최초 준비본에 대한 기록이다. 이번 후속 수정은 안내 문서와 상대 링크·diff 형식만 확인했고 제품 소스는 변경하지 않았다. 초기 커밋 대기 상태와 사용자 지시인 커밋·push 미실행은 그대로다.

## 최종 결정: AGENTS.md 제외

사용자가 비판적 검토 결과에 동의하여 `AGENTS.md`를 삭제하고 staging 대상에서도 제외했다. README와 앱 README의 필독 안내·파일 링크, 이전 계획의 생성 항목도 정리했다. 기존 실행 정보·정책·담당 분담·진척 문서는 유지한다. 이 파일을 대체하는 별도의 상시 에이전트 규칙 문서는 만들지 않았다.

앞선 생성·간소화·검토 내역은 경과 기록이다. 현재 준비본에는 `AGENTS.md`가 없으며 staged 경로는 430개다. 이번 후속 변경은 문서에 한정하고 링크·diff 및 삭제 반영을 확인했다. 제품 코드와 기존 커밋은 그대로이며 커밋·push는 실행하지 않았다.

## 후속 결정: GitHub 소스 관리 시작

사용자가 커밋과 Git 저장소 기반 소스 관리를 요청하여 기존 커밋·push 보류를 해제했다. 대상은 공개 저장소 `donnieyu/v-sideout`, 기준 브랜치는 `main`이다. 원격 main이 초기 커밋 `a9c1bb3` 그대로이고 원본 snapshot 422개에 추가 변경이 없음을 재확인했다. `AGENTS.md`는 제외한 상태를 유지한다.

초기 import는 기존 GitHub 초기 커밋과 앱 인증 HEAD `cf391c2`를 부모로 연결하고 소스는 `web/` 아래에 배치한다. 기존 앱 main도 인증 HEAD의 조상으로 보존된다. 강제 push나 원본 checkout 삭제는 하지 않는다. 실제 원격 반영 커밋은 GitHub main 및 로컬 `git log --first-parent`에서 확인한다.

소스 관리 작업 경로는 `/Users/donnieyu/DevSource/Personal/v-sideout`이다. README의 커밋 대기·AGENTS 필독 안내는 제거했으며, 실행 방법·문서 진입·일상적인 Git 작업 방법을 유지했다. 기존 A/R 채팅에는 이 경로와 보존 기준을 전달한다. 채팅 자체의 작업 디렉터리가 자동 변경되는 것은 아니므로 이후 작업에서는 새 경로 또는 그에 기반한 checkout을 명시적으로 사용한다.

기존 인증 Task 3·4, 모바일 P2, lint 오류 1개·경고 33개는 초기 이관 범위에 포함된 미완료 과제다. 이 커밋은 해당 기능이나 공개 서비스 배포가 완료됐다는 의미가 아니다. 공개 저장소의 visibility는 기존 설정 그대로이며 배포 workflow는 추가하지 않았다.
