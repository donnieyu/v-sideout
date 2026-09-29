# v-sideout GitHub 저장소 이전·운영 계획

> 후속 사용자 결정: `AGENTS.md` 생성 제안은 철회했다. 프로젝트 정보는 README와 해당 작업 문서에서 관리한다. 이 계획을 실행하면서 파일을 재생성하지 않는다.

> **For agentic workers:** 사용자가 이전 실행을 요청한 뒤 `superpowers:executing-plans`로 순차 진행한다. 이 문서는 계획이며 clone/import/push, 기존 checkout 이동, 배포를 실행한 기록이 아니다. 각 담당의 진행 중 작업을 먼저 인계받는다.

**Goal:** `donnieyu/v-sideout`에서 운영 코드·기획 SSOT·참가 목업·검증 근거를 함께 관리하고 기존 Git 이력과 미완료 인증 작업을 보존한다.  
**Architecture:** 하나의 Git 저장소 아래 `web/`과 `docs/`를 유지한다. 기존 `web` 이력은 새 checkout의 `web/` 하위로 subtree 방식으로 가져오고, Git 밖 문서·목업은 선별된 스냅샷으로 추가한다. 진행 중 인증 코드는 별도 기능 브랜치로 이관한다.  
**Tech Stack:** Git/GitHub, 기존 npm 프로젝트 2개(vinext 운영 앱·Vite 목업). 첫 이전에 npm workspace/Turborepo/새 배포 플랫폼은 도입하지 않는다.  
**Spec:** 사용자 요청(기존 GitHub 저장소에 올릴 폴더·관리 방식 계획), [통합 계획](../../INTEGRATION_PLAN.md), [회원 SSOT](../../ACCESS_AND_DEPLOYMENT_SSOT.md).

작성: 2026-09-29 KST · 상태: **검토 가능한 계획 / 이전·push 미실행**.

## 1. 확인한 현재 상태

| 항목 | 이번 읽기 확인 |
| --- | --- |
| 원본 프로젝트 | `/Users/donnieyu/DevSource/Personal/v-team-builder`, 루트/docs는 Git 밖 |
| 기존 코드 저장소 | `web/`만 Git 저장소. `main` HEAD `bfb15977027c71135d8b1d0311b8ca19d8c2a3a2`, 변경 없음 |
| 기존 remote | `web/origin`은 Sites의 Git 서버. GitHub가 아니며 이번에 변경하지 않음 |
| 예전 통합 worktree | `web/work/member-roster-integration`, `feat/member-roster-integration`, HEAD `bfa0af18652ca116362c6e5f7aaeae6d9bf1acf0`. 기존 미커밋/미추적 인증·스키마 작업 보존 필요 |
| 현재 인증 worktree | `web/work/member-auth-foundation`, `feat/member-auth-foundation`, HEAD `cf391c2800ba58df8220843cecedb26390f43d95`, 조회 시 변경 없음. `7205c2b` 확정 정책 연결, `cf391c2` 인증 저장 오류 응답 수정 커밋 존재 |
| 목표 GitHub | `https://github.com/donnieyu/v-sideout.git`에 `git ls-remote --symref` 성공. 이미 `main` 및 HEAD `a9c1bb389c33f4280ecec903dbf4bb2ad9ae1cc6` 존재 |
| 미확인 원격 조건 | 원격 커밋의 내용·저장소 공개/비공개·보호 규칙은 이번에 확인하지 않음. 빈 저장소로 가정하거나 기존 main을 덮어쓰지 않음 |
| 도구 | 현재 셸에서 `gh` 명령 없음. Git 원격 조회는 성공했으므로 일반 `git clone`으로도 이후 작업 가능. 이번 설치/clone 없음 |
| 목업 | `docs/design-review/shadcn-prototype`는 독립 npm 프로젝트. 소스·테스트·lockfile이 있고 빌드 출력은 형제 `ideation-2026-09-23/weekend/` 아래 생성 |

기존 통합 문서보다 인증 브랜치가 진척되었다. 첫 이전 직전 다시 확인하고, 과거 ‘인증 미착수’ 문구를 현재 상태로 복사하지 않는다. 커밋의 존재와 기능 완료·운영 검증은 별개다.

## 2. 권장 구성: 한 저장소, 기존 경로 유지

```text
v-sideout/                         # 새 Git 루트, .git 하나
├── README.md                      # 프로젝트 개요·현재 상태·실행 진입
├── .gitignore                     # 전체 공통 제외 규칙
├── .github/
│   ├── workflows/ci.yml           # web와 prototype 검사(신규 제안)
│   └── pull_request_template.md   # 변경 범위·검증·미완료(신규 제안)
├── web/                           # 운영 앱 소스, 별도 .git 없음
│   ├── app/ components/ lib/ hooks/
│   ├── db/ drizzle/               # 스키마·migration 원본
│   ├── tests/ scripts/ public/ vendor/ build/
│   ├── package.json
│   └── package-lock.json
└── docs/
    ├── ACCESS_AND_DEPLOYMENT_SSOT.md
    ├── INTEGRATION_PLAN.md
    ├── MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md
    ├── PRODUCT_PLAN.md
    ├── reviews/                   # 검토·인계·기준 해시
    ├── superpowers/plans/         # 계획과 단계별 진척
    └── design-review/
        ├── shadcn-prototype/      # 지금 개발 중인 목업 소스·테스트
        │   ├── src/ scripts/ evidence/
        │   ├── package.json
        │   └── package-lock.json
        └── …                     # 설계 문서·수작업 시안·선별 증거
```

`web/`에만 원격을 추가하면 중요한 SSOT와 최신 참가 목업이 계속 Git 밖에 남는다. 반대로 코드·문서를 각각 다른 저장소로 나누면 계약·UI 변경을 한 PR에서 검토하기 어렵다. 따라서 **프로젝트 전체를 한 저장소로 관리**하는 편이 현재 세 담당 구조에 맞다.

첫 이전에서는 `apps/web`, `packages/*`, `prototypes/*`로 재배치하지 않는다. 기존 import·문서 링크·Vite 상대 출력·검증 명령을 유지해 이전과 기능 변경을 분리한다. 목업을 나중에 운영 앱으로 이식한 뒤 별도 구조 개선에서 정리할 수 있다.

## 3. 무엇을 Git에 넣을지

| 현재 경로/종류 | 방침 | 구체 처리 |
| --- | --- | --- |
| root `README.md`, 제품/회원/통합 SSOT·로드맵 | 추적 | 새 루트에서 현재 상태와 실행 위치를 안내. 문서 책임은 A/R/I 기존 분담 유지 |
| `web/app`, `components`, `lib`, `hooks`, `public` | 추적 | 소스·정적 자산. 기능별 브랜치로 관리 |
| `web/db`, `web/drizzle` | 추적 | SQL, journal, snapshot까지 포함. DB 데이터 파일은 제외. A 단독 스키마 작성 경계 유지 |
| `web/build`, `web/vendor`, 라이선스 | 추적 | `build/`는 이 프로젝트에서 Sites Vite 플러그인 소스가 있으므로 빌드 출력으로 오인해 무시하지 않음 |
| 양쪽 `package.json`, `package-lock.json`, tsconfig/Vite/ESLint 설정, `.npmrc` | 추적 | 독립 npm 프로젝트 그대로. 현재 `.npmrc`는 정적 npm 옵션이며 인증정보 없음 |
| `docs/design-review/shadcn-prototype/src`, `scripts`, 설정, preview HTML | 추적 | 최신 참가·팀편성 구현의 원본. `web/`에 아직 없는 기능이라 반드시 함께 관리 |
| 검증 보고서·기준 해시 JSON·주요 스크린샷 | 추적 | 테스트 입력은 합성 자료, 이미지에 실회원·자격정보 없는지 확인. 현재 조사한 대상에 1 MiB 초과 개별 파일 없음; 당장 LFS 도입 불필요 |
| `docs/design-review/ideation-2026-09-23` 등 시안 | 선별 추적 | 직접 작성한 HTML/CSS/JS·의사결정에 사용된 스크린샷 유지. 아래 자동 생성 디렉터리는 제외 |
| `…/weekend/a-shadcn`, `…/weekend/allocation-ab`, `…/weekend/position-slots` | 제외 | 세 Vite 설정의 실제 build outDir. `npm run build*`로 재생성. `weekend/` 전체를 제외하면 수작업 mock까지 빠지므로 정확한 3개 디렉터리만 무시 |
| 도구 조사·에이전트 연구 문서 | 프로젝트에 필요한 문서만 추적 | 제품/개발 결정 근거는 유지. 개인 도구 실험·무관한 연구는 최초 추가 목록에서 제외하거나 별도 관리. 기존 로컬 파일 삭제는 하지 않음 |
| `.impeccable/` | 기본 제외 | 도구 실행 기록. 필요한 결론·증거만 검토 문서에 남김 |
| `web/.openai/hosting.json` | 배포 연결 메타데이터로 검토 후 유지 | 현재 D1 바인딩명/프로젝트 ID. 비밀키로 단정하지 않으며 기존 Sites 연결을 이전 작업에서 제거하지 않음. GitHub 업로드가 배포 대상 변경을 뜻하지 않음 |
| `node_modules`, `.next`, `.vinext`, `dist`, coverage, 캐시·로그 | 제외 | 설치/빌드로 재생성 |
| `.wrangler`, `.sites-runtime`, SQLite/DB dump, 실회원 파일, 자격·세션 자료 | 제외 | 로컬/운영 상태와 비밀정보는 Git에 넣지 않음. 빈 값의 `.env.example` 등 설정 설명만 추적 |
| `web/work/**`, 다른 checkout, `.git`, 사용자 `.codex/.agents` 런타임 기록 | 제외 | worktree 디렉터리를 파일로 복사하지 않음. 코드 변경은 브랜치/커밋으로 가져옴 |

기준 해시 문서에 절대 경로·과거 commit이 있으면 역사 증거로 보존한다. 현재 사용 지침에는 새 저장소 상대 링크와 실행 위치를 추가하고, 과거 해시를 새로운 파일의 해시인 것처럼 바꾸지 않는다.

### 신규 루트 `.gitignore` 초안

기존 `web/.gitignore`는 유지하고 새 루트에 아래 범위를 추가한다. 이는 **제안 텍스트**이며 아직 파일을 생성하지 않았다.

```gitignore
**/node_modules/
**/.next/
**/.vinext/
**/dist/
**/out/
**/coverage/
**/.wrangler/
**/.sites-runtime/
**/.env*
!**/.env.example
!**/.env.*.example
**/.dev.vars*
!**/.dev.vars.example
*.pem
*.key
*.sqlite
*.sqlite3
*.db
*.tsbuildinfo
*.log
.DS_Store
/.codex/
/.agents/
/.impeccable/
/web/work/
/.worktrees/
/outputs/
/docs/design-review/ideation-2026-09-23/weekend/a-shadcn/
/docs/design-review/ideation-2026-09-23/weekend/allocation-ab/
/docs/design-review/ideation-2026-09-23/weekend/position-slots/
```

이름만으로 모든 비밀값/개인정보를 걸러낼 수 없으므로 최초 staging 목록은 직접 검토한다. `.gitignore`는 이미 추적된 파일이나 과거 이력에서 자료를 제거하지 않는다. 이력 보존 import 전에 해당 이력도 검사하며, 실제 비밀값이 발견되면 원본에서 삭제만 하고 그대로 업로드하지 말고 별도 정화 방안을 결정한다.

## 4. 이력 이전 방식

권장 대상 경로는 기존 프로젝트의 형제인 `/Users/donnieyu/DevSource/Personal/v-sideout`이다. 기존 `v-team-builder`는 당장 변경하지 않아 현재 세션·미리보기가 계속 사용할 수 있다.

**GitHub의 기존 main 위에 이전 브랜치를 만들고 기존 web/main을 `web/` subtree로 가져오는 방식**을 권장한다. `--squash` 없이 import하면 기존 코드 커밋과 GitHub의 초기 커밋을 모두 보존할 수 있다. 과거 커밋에서는 소스가 저장소 루트에 보이고, import 이후부터 `web/`에 보이는 이력 형태임을 README에 설명한다.

다음은 이후 실행할 명령 예시다. 대상 디렉터리 부재·원격 내용·기존 이력 업로드 적합성·담당 인계 확인이 먼저다.

```sh
# 새 형제 checkout을 만들 때만 실행. 원본 폴더에서 git init 하지 않는다.
git clone https://github.com/donnieyu/v-sideout.git /Users/donnieyu/DevSource/Personal/v-sideout
cd /Users/donnieyu/DevSource/Personal/v-sideout
git switch -c chore/import-project
git remote add legacy-web /Users/donnieyu/DevSource/Personal/v-team-builder/web
git fetch legacy-web
git subtree add --prefix=web legacy-web/main
```

- 현재 셸에는 `gh`가 없지만 Git 대안으로 충분하다. 사용자가 제시한 `gh repo clone donnieyu/v-sideout`도 이후 CLI가 사용 가능한 환경에서 동일 clone 목적으로 쓸 수 있다.
- `git subtree` 사용 가능 여부를 실행 전에 확인한다. 없다면 임시 clone에서 검증된 대안을 선택한다. 원본 `.git`을 이동/삭제하거나 임의의 이력 재작성을 하지 않는다.
- GitHub의 기존 main 내용을 먼저 읽는다. `web/` 또는 동명 문서가 이미 있으면 자동 덮어쓰기 대신 충돌/병합 목록을 작성한다. 위 명령은 prefix가 비어 있는 경우의 제안이다.
- 새 저장소 `origin`은 GitHub다. 기존 `web/origin`의 Sites 연결은 그대로 둔다. subtree로 만든 저장소 전체를 Sites의 기존 코드 remote에 그대로 push하지 않는다.
- `git push --mirror`, `--force`, `--all`을 사용하지 않는다. 검토한 이전/기능 브랜치만 명시적으로 올린다.

### 인증 브랜치 처리

`feat/member-auth-foundation`의 HEAD는 운영 main보다 앞서 있다. 인증 미완성 부분까지 최초 안정 기준에 섞지 않고, 코드 import 이후 **별도 `feat/member-auth-foundation` 브랜치/PR**로 이관한다.

1. A가 짧은 인계 시점의 최종 HEAD·상태·파일 목록을 확정한다. 지금 확인한 `cf391c2`는 스냅샷이지 고정된 최종값이 아니다.
2. 새 저장소의 import된 기준에서 기능 브랜치를 만든다. `git subtree merge --prefix=web legacy-web/feat/member-auth-foundation` 방식으로 기존 web 기준에 대한 차이를 `web/` 아래 반영하고 검증한다. import PR 병합 전이면 의존 관계를 표시하고, 가능하면 import PR을 먼저 병합한다.
3. 기존 커밋을 평범한 `cherry-pick`으로 적용하면 새 저장소 루트에 `lib/`, `app/`가 생길 수 있으므로 경로 변환 없이 사용하지 않는다.
4. `member-roster-integration`의 미커밋/미추적 인증 파일은 A 브랜치에 같은 내용이 이미 포함됐는지 파일별로 비교한다. 포함된 이전 사본은 중복 이관하지 않는다. 유일한 변경은 작성자 확인 후 별도 보존 커밋/암호 없는 로컬 백업으로 확보한다.
5. `lib/model.ts`·`operations.ts`·identity 검사 등 I/R 공동 검토 대상도 인증 브랜치 diff에 포함되므로 담당별 검토를 나눠 기록한다. 인증 브랜치라는 이름만 보고 전부 A 전용 변경으로 승인하지 않는다.

미커밋 파일은 Git fetch/subtree로 따라오지 않는다. 따라서 이 단계의 비교·보존이 끝나기 전 기존 worktree를 정리하면 안 된다.

## 5. 실행 단계와 완료 조건

### 단계 1 — 담당별 기준과 파일 목록 고정

**담당:** I 조율, A 인증·스키마, R 참가 목업. **수정 대상:** 담당 인계/이전 기록만.

- [ ] 이전 실행 요청 후 A/R에게 최종 HEAD/수정 파일/진행 프로세스/산출물 경로를 확인한다. 계획 작성만으로 현재 개발을 중단시키지 않는다.
- [ ] 목업·root/docs는 Git 밖이므로 snapshot 시각과 선택 파일 SHA-256 목록을 만든다. 복사 전후 변경이 생기면 해당 파일을 다시 인계한다.
- [ ] 기존 Git 이력·선정 파일에서 실회원/비밀값/불필요한 대형 생성물이 포함되는지 확인한다. 저장소 가시성은 초기 비공개를 권장하되 실제 설정을 확인한다.
- [ ] GitHub 기존 main의 파일/README/라이선스/설정 및 접근 권한을 확인한다. 원격 내용 확인 전 빈 저장소로 취급하지 않는다.

**완료:** 원본 3개 checkout과 문서/목업의 기준이 기록되고, 빠뜨릴 미커밋 파일이 없다.

### 단계 2 — 새 checkout에 기본 코드·문서 import

**신규/수정:** 새 저장소 `web/`, root `README.md`, `.gitignore`, 선별한 `docs/`.

- [ ] §4 방식으로 GitHub 초기 이력과 web/main 이력을 연결한다.
- [ ] root README는 기존 GitHub README와 병합하고, SSOT·목업·운영 앱 실행 진입을 설명한다.
- [ ] 허용 목록으로 root/docs·목업 원본·선별 증거를 복사한다. 기존 프로젝트 폴더 전체를 재귀 복사하지 않는다.
- [ ] 기능 브랜치 내부 `web/docs/superpowers/plans/...`는 역사 문서로 유지하고 현재 기준은 root/docs임을 안내한다. 같은 SSOT를 두 군데에서 갱신하지 않는다.
- [ ] 실행·설치 정보는 루트 README에, 담당 분담·진척은 관련 작업 문서에 연결한다. 별도의 에이전트 지침 파일을 추가하지 않는다.
- [ ] 명시한 파일/폴더만 stage하고 아래 검사를 수행한다. `git add .`로 worktree나 로컬 상태를 일괄 추가하지 않는다.

```sh
git status --short
git diff --cached --name-status
git diff --cached --stat
git diff --cached --check
git ls-files --stage
```

**완료:** 새 저장소에서 `web/`이 일반 디렉터리이며 gitlink(모드 160000)가 없다. 소스/문서/증거가 있고 생성물·worktree·DB·비밀파일은 빠져 있다. 현재 코드 내용은 import 기준과 일치한다.

### 단계 3 — 브랜치 이관·CI 구성·재현 검증

**대상:** 인증 기능 브랜치, `.github/workflows/ci.yml`, `.github/pull_request_template.md`.

- [ ] A 기준 인증 브랜치를 §4에 따라 별도 이관하고 source/destination의 파일 내용·미완료 항목을 대조한다.
- [ ] CI는 `web/**`와 `docs/design-review/shadcn-prototype/**` 경로별로 npm 설치/검사를 수행하도록 구성한다. 스키마·테스트·workflow 변경도 경로 필터에 포함한다. 작은 문서 수정은 링크 검사만 수행할 수 있다.
- [ ] Node 버전은 이전 시 확인한 실제 검사 환경과 일치시켜 고정한다. A 검토의 Node 26.7.0과 각 `package.json` engines·`node:sqlite` 사용을 함께 확인한다. 외부 인증정보 없이 합성 데이터만으로 실행한다.
- [ ] 현재 명령을 새 checkout에서 검증한다. 인증 스크립트는 해당 기능 브랜치에 실제 존재하는 목록을 실행하며 이전 main에 없는 검사를 억지로 성공 처리하지 않는다.

```sh
# 새 저장소 루트에서
npm --prefix web ci
npm --prefix web run build
npm --prefix web run lint
# 아래 도메인 스크립트는 cwd를 web로 두고 실행
cd web
node tests/domain.mjs
./node_modules/.bin/tsc --noEmit --incremental false

# 별도 셸: 새 저장소의 docs/design-review/shadcn-prototype에서
npm ci
npm run check:allocation
npm run build
```

- [ ] Git 밖 목업을 복사한 기준과 동일한 모바일/데스크톱 화면·주요 URL·내비게이션을 비교한다. 기능 변경이 목적이 아니므로 의도하지 않은 화면 차이는 이전 오류로 처리한다.
- [ ] 빌드 후 `git status --short`가 생성물 때문에 더러워지지 않는지 확인한다. 위 세 outDir이 정확히 ignore되는지 검사한다.
- [ ] 문서 상대 링크·소스 import·스크립트 cwd를 확인한다. 개인 절대 경로가 과거 기록인지 현재 실행 의존성인지 구별해 후자만 새 경로로 수정한다.

**완료:** 새 clone으로 코드/목업 재현 가능, 관련 검사 통과, 인증의 기존 결함·미완료 범위가 그대로 명시된다. 빌드가 외부 runtime/env 없이는 안 되면 구체 원인과 로컬 구성 계약을 기록하고 CI 통과로 표시하지 않는다.

### 단계 4 — GitHub PR과 작업 기준 전환

- [ ] `chore/import-project`만 명시적으로 push하고 import PR을 만든다. 원격 main을 force push하지 않는다.
- [ ] PR에서 폴더 목록·이력 보존·검증·제외 파일·미완료 인증 분리를 확인한 뒤 병합한다. 인증 PR은 별도 검토한다.
- [ ] A/R/I의 작업 위치를 새 저장소 기반으로 전환한다. 프로젝트 루트/문서 주소/preview 포트를 인계하고 각 담당이 새 기준 사용을 확인한다.
- [ ] worktree는 새 저장소 **바깥**의 형제 경로나 앱 관리 경로에 만든다. 예: `/Users/donnieyu/DevSource/Personal/v-sideout-worktrees/auth/`. 저장소 내부 `web/work/` 구조는 새로 반복하지 않는다.
- [ ] GitHub clone/PR/백업 검증과 모든 미커밋 보존을 확인할 때까지 원본 프로젝트와 worktree를 남겨 둔다. 앱 관리 worktree 정리는 적절한 archive 도구로 처리하며 임의 폴더 삭제 금지.

**완료:** 개발 기준이 GitHub `v-sideout`으로 바뀌고 각 담당의 변경이 브랜치/PR로 추적된다. 공개 배포나 운영 DB 이전은 이 완료 조건에 포함하지 않는다.

## 6. 이후 브랜치·문서 운영

| 대상 | 운영 규칙 |
| --- | --- |
| `main` | 검증·리뷰한 기준. 미완료 인증을 완성 기능처럼 넣지 않음 |
| `feat/member-auth-*` | A: 인증·회원 관리. 공통 schema/migration은 한 작성자만 |
| `feat/roster-*` | R: 신청·편성·후보 UI/도메인. 로그인·세션 구현 제외 |
| `feat/integration-*` | I: 셸·API/신원 연결·통합 테스트. 양쪽 내부 구현을 중복 작성하지 않음 |
| `chore/repo-*` | 저장소 구성·CI·개발 도구 변경. 기능 PR과 분리 |
| 문서 | 기능 변경 PR에서 관련 계약·진척·검증 근거도 갱신. 회원 정책 A, 참가 정책 R, 통합 계획 I 책임 |
| 공유 파일 | 역할별 브랜치라도 동일 파일 변경이 자동 안전해지는 것은 아님. schema·migration·app 진입·공통 스타일·lockfile은 단독 편집 구간을 정함 |

규모상 상시 `develop` 브랜치나 장기 통합 브랜치를 추가하지 않는다. 기능별 짧은 브랜치와 PR로 관리한다. 팀 기능이 여건상 지원되면 main 직접 push 제한/필수 CI 검사를 설정하고, 실제 저장소 권한·플랜에서 가능한 설정을 확인한다. `CODEOWNERS`는 A/R/I 채팅을 GitHub 사용자로 등록하는 도구가 아니므로 담당표를 대신하지 않는다.

운영 앱과 목업을 함께 보관해도 배포 대상은 `web/`만 명시한다. GitHub에 저장하는 행위가 Sites·Workers의 배포 설정이나 공개 URL을 바꾸지 않는다. 배포 자동화는 인증·권한·운영 전환 준비가 끝난 뒤 별도 계획으로 도입한다.

## 7. Review Focus와 완료 판정

1. **인증 미커밋 누락:** fetch에 포함되지 않는 파일을 A 커밋/기준 해시와 비교 — 단계 1·3.
2. **이중 Git/경로 오류:** `web/.git`·`web/work` 복사나 root에 `lib`가 잘못 생기는 문제 — 단계 2·3의 index/경로 검사.
3. **목업 출력의 소스 오인:** 실제 3개 outDir만 제외하고 source/mock/증거는 보존 — 단계 2·3.
4. **기존 GitHub 이력 덮어쓰기:** 원격 main 커밋을 부모 이력으로 보존, 명시 브랜치 PR — 단계 1·4.
5. **플랫폼 연결·과거 비밀자료:** 기존 Sites remote 변경 없이 새 GitHub 관리, import 이력과 현재 선정 파일 모두 점검 — 단계 1·4.

계획 자체 확인: 현재 경로·Git branch/HEAD·원격 main 존재·Vite outDir를 읽기 확인했다. GitHub 원격 내용/가시성/보호 규칙, 이력 전체 검사, 새 clone의 빌드/CI는 **이후 실행 단계**다. 이번에는 본 계획 문서만 작성했으며 Git 초기화·clone·checkout 이동·import·commit·push·배포는 하지 않았다.
