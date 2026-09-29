# SIDEOUT · v-sideout

배구 모임의 참가 신청, 대기 명단, 팀편성을 관리하는 웹 프로젝트입니다. 운영 앱 기반과 별도로 발전시킨 UI 목업, 제품 정책과 검증 기록을 한 저장소에서 관리합니다.

## 현재 상태

이 프로젝트의 소스 관리 저장소는 [donnieyu/v-sideout](https://github.com/donnieyu/v-sideout)입니다. 기존 개발 이력을 보존하고 운영 앱·인증 기반·참가 및 팀편성 목업·문서를 함께 관리합니다. 아래 구현 상태는 2026-09-29 초기 이관 기준이며, 코드 보관과 기능 통합 완료는 구분합니다.

- `web/`: vinext·React·Cloudflare Workers/D1 기반 앱. 기존 샘플 신청·편성 화면과 인증 기반 Task 1·2가 포함됩니다.
- 인증: 비밀번호 정책·저장 실패 처리는 구현됐지만, 비밀번호 회전의 원자성(Task 3), 최종 신원/권한 계약(Task 4), 로그인·회원 관리 화면 등은 남아 있습니다.
- `docs/design-review/shadcn-prototype/`: 최신 참가·팀편성 React 목업. 아직 운영 앱에 이식되지 않았고, 로컬 샘플 상태로 동작합니다. 360px·3팀 배정판의 이름/해제 버튼 터치 영역 겹침(P2)이 남아 있습니다.
- 실제 회원 데이터, 이메일 발송, 공개 운영 배포는 이번 설정에 포함되지 않습니다.

현재 진척은 [회원 로드맵](docs/MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md), [팀편성 확정 기획](docs/design-review/TEAM_ALLOCATION_FINAL.md), [저장소 준비 기록](docs/reviews/REPOSITORY_SETUP_2026-09-29.md)을 확인하세요. 과거 검증 횟수와 절대 경로는 당시 기록입니다.

## 폴더

```text
v-sideout/
├── .github/                    # CI·PR 양식
├── web/                        # 앱·DB 스키마·migration·테스트
│   ├── app/ components/ lib/
│   ├── db/ drizzle/ tests/
│   └── build/ vendor/          # 플러그인 소스·배포 라이선스, 추적 필요
└── docs/
    ├── ACCESS_AND_DEPLOYMENT_SSOT.md
    ├── INTEGRATION_PLAN.md
    ├── reviews/                # 검증·인계·이전 근거
    ├── superpowers/plans/      # 구현 계획
    └── design-review/shadcn-prototype/
        ├── src/ scripts/
        └── package.json
```

Git 루트는 이 폴더 하나입니다. `web/`은 별도 저장소나 submodule이 아닙니다. npm 프로젝트는 두 개이며, 루트에서 `npm install`을 실행하지 않습니다.

## 설치와 실행

검증 기준은 `.nvmrc`의 Node.js 24.16.0입니다. Node 버전 관리자에서 이 버전을 선택하세요(`nvm` 사용자는 `nvm use`, `fnm` 사용자는 `fnm use`). 셸 초기화가 안 된 환경에서는 `fnm exec --using=24.16.0 -- npm --prefix web run build`처럼 버전을 명시할 수 있습니다. npm과 Python 3(목업 정적 서버용)가 필요합니다. 인증 저장소 테스트는 `node:sqlite`를 사용합니다.

### 운영 앱

저장소 루트에서:

```sh
npm --prefix web ci
npm --prefix web run dev
```

개발 기본 포트는 5173입니다. 기존 세션의 서버와 겹치면 다음처럼 다른 포트로 실행합니다.

```sh
cd web
./node_modules/.bin/vinext dev --port 5180
```

D1을 쓰는 화면/API에는 로컬 DB 준비가 필요합니다. 원본 DB 파일은 복사하지 않습니다. 새 로컬 DB를 만들 때만, `web/`에서 아래 명령을 실행합니다.

```sh
npm run build
./node_modules/.bin/wrangler d1 execute DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/0000_windy_omega_red.sql
./node_modules/.bin/wrangler d1 execute DB --config dist/server/wrangler.json --local --persist-to .wrangler/state --file drizzle/0001_glamorous_iron_lad.sql
```

위 명령에 필요한 Wrangler 구성은 [web 실행 안내](web/README.md#새-checkout의-로컬-db)에 설명합니다. 기존 DB에 SQL을 재적용하거나 `--remote`로 실행하지 않습니다. `.openai/hosting.json`은 기존 Sites 바인딩 메타데이터이며, GitHub 저장소 생성이 배포 플랫폼 전환을 뜻하지 않습니다.

### UI 목업

저장소 루트에서:

```sh
npm --prefix docs/design-review/shadcn-prototype ci
npm --prefix docs/design-review/shadcn-prototype run build
python3 -m http.server 4174 --bind 127.0.0.1 --directory docs/design-review/ideation-2026-09-23
```

브라우저에서 <http://127.0.0.1:4174/weekend/a-shadcn/>을 엽니다. 팀편성 비교용 화면은 `npm --prefix docs/design-review/shadcn-prototype run build:allocation` 후 `/weekend/allocation-ab/?variant=b`에서 봅니다. A안은 비교 자료이며 현재 개선 대상은 B안입니다. `build:positions`는 포지션 시안을 재생성합니다.

의존성은 각각 `npm ci`로 설치합니다. 원본 폴더의 `node_modules`를 가리키는 심볼릭 링크는 사용하지 않습니다. 생성된 세 목업 폴더는 Git에서 제외합니다.

## 검증

운영 앱 (`web/`에서):

```sh
for test in tests/*.mjs; do node "$test" || exit 1; done
./node_modules/.bin/tsc --noEmit --incremental false
npm run build
npm run lint
```

목업 (`docs/design-review/shadcn-prototype/`에서):

```sh
npm run check:allocation
npm run build
npm run build:allocation
npm run build:positions
```

GitHub Actions에는 앱의 테스트·타입·빌드와 목업 검사·세 빌드를 설정했습니다. 최신 CI 결과는 [Actions](https://github.com/donnieyu/v-sideout/actions), 초기 이관의 로컬 검사 결과와 기존 lint 문제는 [준비 기록](docs/reviews/REPOSITORY_SETUP_2026-09-29.md#검증)을 확인하세요. 브라우저 확인이나 실제 Workers/D1 검증을 단위 테스트 통과로 대체하지 않습니다.

## Codex에서 이어서 작업

Codex에서 **이 저장소 폴더**를 프로젝트로 열고 원하는 작업을 요청하면 됩니다. 실행 방법과 프로젝트 구조는 이 README에서, 담당 분담과 진척은 관련 작업 문서에서 확인할 수 있습니다. 병행 작업을 이어갈 때는 해당 담당(A/R/I)을 함께 알려주면 도움이 됩니다. 진입 요청 예시:

> 참가·팀편성 작업을 이어가려고 해. 현재 소스와 관련 계획에서 진행 상태를 확인하고, 남은 작업을 진행해줘.

기존 채팅의 작업 위치·히스토리는 자동 이전되지 않습니다. 이 컴퓨터의 새 작업 경로는 `/Users/donnieyu/DevSource/Personal/v-sideout`입니다. 기존 세션을 이어갈 때 해당 경로를 작업 대상으로 지정하면 됩니다. 원본 `v-team-builder`는 이전 이력과 미커밋 자료 확인용으로 보존합니다.

## Git으로 작업하기

- 개발 기준은 이 저장소의 `main`입니다. 새 작업은 이 기준에서 작업 브랜치를 만들고, 변경 파일과 관련 문서를 함께 커밋합니다.
- 앱은 `web/`, 목업은 `docs/design-review/shadcn-prototype/`에서 수정하되 Git 명령은 같은 저장소를 사용합니다.
- 병행 작업 시 같은 파일 변경을 조율하고, 필요하면 서로 다른 checkout을 사용합니다. 원본 폴더의 변경이 새 저장소로 자동 동기화되지는 않습니다.
- 공개 저장소이므로 실회원 자료·DB·비밀값·개인 도구 설정은 올리지 않습니다. 커밋 전 변경 파일 목록을 확인합니다.
- GitHub 소스 반영과 서비스 배포는 별개입니다. 현재 workflow는 검사만 수행합니다.

다른 컴퓨터에서는 다음으로 시작합니다.

```sh
git clone https://github.com/donnieyu/v-sideout.git
cd v-sideout
```

위 설치·실행 안내에 따라 앱과 목업의 의존성을 각각 설치합니다. 이전 기준·인계·미완료 사항은 [이전 기록](docs/reviews/REPOSITORY_SETUP_2026-09-29.md)에 있습니다.
