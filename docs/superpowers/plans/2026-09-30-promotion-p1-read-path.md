# SIDEOUT P1 인증·조회 화면 승격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for sequential implementation in this session, or superpowers:subagent-driven-development only if the user selects that method. Execute task-by-task; do not edit another active worktree. Steps use checkbox syntax for tracking.

**Goal:** 합성 계정이 실제 로컬 인증·D1을 통해 로그인하고 첫 비밀번호 변경 후 확정한 SIDEOUT 홈·일정 상세를 조회한다.

**Architecture:** 완료된 인증 커밋을 별도 통합 작업 트리에 인수한다. 회차별 저장 원본에서 서버 권한별 DTO를 만들고, 확정 목업의 조회 UI만 소비자로 이식한다. 인증 원본과 업무 원본을 분리하며 데모 역할 API는 폐쇄한다.

**Tech Stack:** 저장소 `.nvmrc`의 Node 24.16.0, 기존 vinext/React/TypeScript/shadcn, Workers 로컬 D1, 기존 Drizzle migration, Vitest/Testing Library. 런타임 패키지 업그레이드는 하지 않는다.

**Spec:** [승격 기준과 통합 설계](../specs/2026-09-30-mockup-promotion-design.md). 사용자 ‘확인했어’로 명세 검토 완료. 이 계획은 P1 실행 전 검토본이며 체크되지 않은 단계는 미완료다.

## Global Constraints

- 정본: `/Users/donnieyu/DevSource/Personal/v-sideout`. 현재 목업·진행 중 인증 작업 트리는 변경하지 않는다.
- 원본 UI는 [보존본](../../design-review/baselines/2026-09-30-approved-ui/README.md)의 72개 소스 파일. 새 구현에서도 보존본을 수정하지 않는다.
- 로그인 → 최초 비밀번호 변경 → 모임 홈 → 일정 상세 조회까지만 구현한다. 신청·일정 수정·팀편성 저장·경기 순서 변경·즐겨찾기 쓰기는 P2/P3다.
- P1에서는 UI를 새로 디자인하지 않는다. 새 로딩·오류·권한 제한 상태만 기존 컴포넌트 체계에 맞춘다.
- 서버는 `active` 신원만 업무에 허용하고 `grants`를 재합산하지 않는다. query/body의 role/memberId는 신원이 아니다.
- 마스터는 소속 없이 전체 모임 관리, 운영자는 최종 유효 모임 권한으로 관리. 일반 회원은 운영 초안·전체 후보·대기자 명단을 받지 않는다.
- 공개본은 해당 신청자 또는 공개 편성 배정자와 권한 있는 운영진만 조회한다. 미신청·미배정 대기자는 열람 불가.
- 임시 비밀번호·비밀번호 정책은 인수한 AUTH_POLICY를 사용한다. 현재 인수 커밋은 최소 8자 영문/숫자·임시 자격 7일이며 이 단계에서 변경하지 않는다.
- 실회원 반입·실제 자격 발급/전달·메일·원격 DB·배포는 하지 않는다. 시험 계정은 명백한 합성 데이터이며 로컬 격리 DB만 사용한다.
- 최초 진입/미리보기 스크롤 등 확정된 팀편성 동작을 수정하지 않는다. P1에서 편집 기능을 완성했다고 보고하지 않는다.

## Review Focus

1. 느린 계정 A 조회 응답이 로그아웃/계정 B 로그인 뒤 도착할 때 A의 데이터가 노출되지 않아야 한다 → Task 5.
2. 숨긴 준비 회차의 ID를 추측하거나 잘못 인코딩한 직접 URL로 접속해도 자료·서버 오류가 새지 않아야 한다 → Task 4/5.
3. 한국 시각 일요일→월요일 경계와 연말에서 ‘이번 주’·날짜·뒤로가기 필터가 어긋나지 않아야 한다 → Task 2/5.
4. 이름이 같은 회원, 이름 변경, 비활성 회원의 과거 참가 참조가 다른 사람에게 연결되지 않아야 한다 → Task 3/4.
5. 실제 모바일에서는 로컬 HTTP 쿠키·첫 변경·새로고침과 가상 DOM 시험 결과가 다를 수 있다 → Task 6.

## 0. 인수와 파일 지도

시작 커밋: `37159008d51907f7259d7020c8b2667ee5466f1c` (승격 명세·보존본). 계획 문서 커밋까지 포함한 최신 main을 통합 시작점으로 사용하되, 시작 시 SHA를 인계 보고서에 기록한다.

인증 고정점: `a1ed4300efb10df54cafc2a98587a9da6eafda5e`. 이 커밋에는 M1 원자적 비밀번호 회전/신원 계약, M2 관리 API, M3 화면, 후속 회원 입력 보호, 로컬 최초 마스터 명령이 포함된다. 이후 `dbb76fc`, `1563f39` 및 현재 미커밋 M4는 인수하지 않는다. 인증 전체 브랜치 HEAD를 merge하거나 dirty 파일을 복사하지 않는다.

| 파일군 | 역할 |
| --- | --- |
| 인수: `web/lib/auth/`, `web/components/member-access/`, `web/lib/member-access-client.ts`, 관련 API/tests/migration | 고정 커밋 병합으로 재사용. 불필요한 재작성 없음 |
| 생성: `web/lib/sideout/read-model.ts`, `calendar.ts`, `errors.ts` | 서버 원본·공개 DTO·달력 입력·업무 오류 타입 |
| 생성: `web/lib/server/sideout-store.ts`, `business-principal.ts`, `sideout-query.ts`, `sideout-http.ts`, `sideout-dependencies.ts` | D1 조회·검증 신원·권한별 투영·HTTP·런타임 바인딩 |
| 생성: `web/app/api/clubs/route.ts`, `api/sessions/route.ts`, `api/sessions/[id]/route.ts`, `api/me/preferences/route.ts` | 실제 읽기 API. 생성/수정 명령 없음 |
| 수정: `web/app/api/workspace/route.ts` | 이전 데모 데이터 우회 API 폐쇄 |
| 생성: `web/lib/sideout-client.ts`, `web/lib/sideout/navigation.ts` | 응답·실패 처리와 URL/복귀 경로 |
| 생성: `web/components/sideout/{access,shell,home,session-detail,published-teams,match-list,account}.tsx`, `sideout.module.css` | 확정 조회 UI 및 인증/실패 상태 |
| 수정/생성: `web/app/layout.tsx`, `page.tsx`, `home/page.tsx`, `session/[id]/page.tsx`, `account/page.tsx` | 공통 인증 gate와 정식 URL |
| 생성: `web/vitest.sideout.config.ts`, `web/tests/sideout-*.test.ts(x)`, `web/tests/fixtures/sideout.ts`, `web/tests/helpers/sideout-d1.ts` | P1 회귀 검사·합성 자료·SQLite D1 어댑터 |
| 생성: `web/scripts/seed-sideout-p1-local.mjs` | 로컬 전용 DB 준비. 제품 서버는 샘플을 자동 생성하지 않음 |
| 수정: `web/package.json`, `.github/workflows/ci.yml` | `test:sideout`와 기존 검사 실행 연결 |

공유 UI 컴포넌트는 `web/components/ui/*` 하나를 사용하며 목업의 변형 크기는 Sideout CSS 범위 안에서 구현한다. 과거 `court-app.tsx`·게시판 소스는 삭제하지 않고 기본 진입점에서만 분리한다.

## Task 1: 인증 고정점 인수와 로컬 기준 확보

**Files:** 인수 커밋 전체의 변경 목록, `docs/reviews/PROMOTION_P1_HANDOFF.md`. 기존 `web/tests/auth-contract.mjs`, `auth-rotation.mjs`, `member-access-client.mjs`, `member-admin.test.tsx`로 인수 계약을 검증한다.

**Interfaces:** Consumes `resolveVerifiedIdentity(repo, token, now)`, `parseSessionCookie(header)`, `MemberAccessGate({renderActive})`, `memberAccessClient`; produces 변경하지 않은 인증 계약과 인수 검증 기록. `ClubDirectory.exists(clubId)`는 Task 3에서 운영 원본으로 연결한다.

- [ ] **Step 1 — 격리 작업 공간 확보:** 네이티브 `list_artifacts`로 적합한 작업 트리를 확인하고 없으면 `create_worktree`를 사용한다. 명시적인 최신 main SHA에서 시작한다. 인증 작성 중 작업 트리와 현재 목업 checkout은 재사용하지 않는다. 실행 시작 SHA·dirty 상태를 인계 문서에 기록한다.
- [ ] **Step 2 — 인수 대상 확인:** `git diff --name-status HEAD a1ed4300efb10df54cafc2a98587a9da6eafda5e -- web`와 해당 커밋의 migration journal을 대조한다. 인수 SQL은 `web/drizzle/0000_windy_omega_red.sql`, `0001_glamorous_iron_lad.sql`, `0002_modern_triathlon.sql`이다. 기존 계약 검사를 읽고 익명·최초 변경·유효 grants·비밀번호 회전 사례의 존재를 확인한다. 이미 구현된 기능을 인수하는 단계이므로 인위적인 실패 테스트를 만들지 않는다.
- [ ] **Step 3 — 커밋 인수:** 고정점 `a1ed4300efb10df54cafc2a98587a9da6eafda5e`를 통합 브랜치에 `git merge --no-ff --no-commit`으로 인수한다. 충돌은 파일별 검토하고 문서·lockfile을 일괄 theirs/ours로 덮어쓰지 않는다. M4 진행 파일이 포함되지 않았는지 비교한다.
- [ ] **Step 4 — 검증:** web 디렉터리, Node 24.16.0에서 `npm ci --no-audit --no-fund`, `for test in tests/*.mjs; do node "$test" || exit 1; done`, `npm run test:member-ui`, `./node_modules/.bin/tsc --noEmit --incremental false`, `npm run build`. 각 명령 종료 코드 0과 테스트 통과를 확인한다. 기존 실패는 원인과 범위를 기록하고 통과한 것처럼 진행하지 않는다. 로컬 잠금·설치 장애는 제품 결함과 구분한다.
- [ ] **Step 5 — 커밋:** 인수 목록과 검사 결과를 확인한 뒤 merge를 완료한다. 인수 SHA·명령·결과를 인계 기록으로 남긴다. 시험 자격과 `.wrangler`는 stage하지 않는다.

## Task 2: 조회 데이터 계약과 실제 날짜 기준

**Files:** Create `web/lib/sideout/read-model.ts`, `calendar.ts`, `errors.ts`, `web/tests/sideout-calendar.test.ts`, `web/tests/fixtures/sideout.ts`, `web/vitest.sideout.config.ts`; modify `web/package.json`.

**Interfaces:** 아래 타입 이름을 이후 단계에서 그대로 사용한다. ID는 불투명 문자열이며 이름이나 날짜를 ID로 해석하지 않는다.

```ts
type Position = 'OH'|'OP'|'MB'|'S'
type ClubRecord = {id:string; name:string; mark:string; weekday:number;
  entry:string; start:string; end:string; place:string}
type SessionRecord = {id:string; clubId:string; date:string; entry:string;
  start:string; end:string; place:string; notice:string; phase:'draft'|'open';
  deadline:string; priorityUntil:string|null; cap:number|null}
type Placement = {memberId:string; slotId:string; assignedPosition:Position}
type LineupRecord = {teams:{id:string; title:string; players:Placement[]}[]}
type MatchPlanRecord = {teamCount:number; rookieTeamCount:number; matches:{id:string; kind:'regular'|'rookie'; home:string; away:string}[]}
type RosterRecord = {sessionId:string;
  participants:Record<string,{status:'applied'|'waiting'|'cancelled'; source:'self'|'manager'}>;
  draft:LineupRecord; published:LineupRecord|null; firstPublishedAt:string|null;
  draftMatches:MatchPlanRecord|null; publishedMatches:MatchPlanRecord|null}
type Versioned<T> = {value:T; revision:number}
type Preferences = {favoriteClubIds:string[]}
type ReadSelection = {weekStart:string; filter:'all'|'favorites'|string}
```

`SessionRecord.date`는 KST 날짜, entry/start/end는 HH:mm, deadline/priorityUntil은 UTC ISO다. weekday는 ISO 1(월)~7(일)이다. `RosterRecord`는 P1 읽기 저장 형식이며 P2 명령 원본과 전환할 때 버전 변환을 명시한다. 빈 roster도 저장된 원본으로 제공하며 조회 중 자동 seed하지 않는다. MatchPlanRecord의 일반 경기 home/away는 실제 teamId, 신입 경기는 별도 R1~R4 식별자다. 조회 화면은 저장된 순서를 사용하고 경기당 20분으로 시각을 표시한다. 새 대진 생성은 P3 범위다.

검사 runner를 이 단계의 테스트와 함께 만든다. `vitest.sideout.config.ts`는 alias `@`를 web 루트로 지정하고 `tests/sideout-*.test.{ts,tsx}`만 포함하며 기본 node 환경을 사용한다. UI 테스트 파일에는 `@vitest-environment jsdom`을 지정한다. package script는 `test:sideout` = `vitest run --config vitest.sideout.config.ts`다. 이하 npm/test 명령은 web 디렉터리에서 실행한다.

- [ ] **Step 1 — 달력·파서 실패 검사:** `kstWeekStart(now:Date):string`, `parseReadSelection(url:URL, now:Date):ReadSelection`, `resolveWeekOffset(week:number, now:Date):string`을 대상으로 다음을 고정한다.
  ```ts
  expect(kstWeekStart(new Date('2026-09-27T14:59:59Z'))).toBe('2026-09-21')
  expect(kstWeekStart(new Date('2026-09-27T15:00:00Z'))).toBe('2026-09-28')
  expect(kstWeekStart(new Date('2027-01-01T00:00:00Z'))).toBe('2026-12-28')
  expect(() => parseReadSelection(new URL('http://local/api/sessions?weekStart=2026-02-30'), now)).toThrow()
  ```
  알 수 없는 모임 필터는 Task 4가 400으로 거부한다. 중복 query, 정수가 아닌 week, 범위 밖 week(-999~999)는 다음과 같이 처리한다: API는 400, 레거시 UI 호환은 `/home`으로 이동한다.
- [ ] **Step 2 — 실패 확인:** `npm run test:sideout -- tests/sideout-calendar.test.ts` → export 부재 또는 기대값 불일치.
- [ ] **Step 3 — 구현:** 순수 날짜 함수와 위 원본 타입, `SideoutError(code,status,message)`를 작성한다. 코드 집합은 `INVALID_INPUT/UNAUTHENTICATED/PASSWORD_CHANGE_REQUIRED/FORBIDDEN/NOT_FOUND/STORAGE_UNAVAILABLE`. 고정 REVIEW_NOW·클라이언트 현재 시각으로 권한을 결정하지 않는다. 합성 fixtures에는 UUID 회원 ID 6종(마스터·소속 운영자·추가모임 운영자·신청자·대기자·미신청자), 동일 이름의 서로 다른 회원, 공개/준비 일정과 취소 참가를 포함한다.
- [ ] **Step 4 — 통과 확인:** 달력 테스트와 타입 검사. 9시간 오프셋으로 날짜를 계산하는 함수와 UTC instant 비교를 혼용하지 않았는지 검토한다.
- [ ] **Step 5 — 커밋:** 계약·달력·합성 fixtures만 포함한다.

## Task 3: D1 읽기 원본·모임 directory·로컬 시험 자료

**Files:** Create `web/lib/server/sideout-store.ts`, `web/tests/sideout-store.test.ts`, `web/tests/helpers/sideout-d1.ts`, `web/scripts/seed-sideout-p1-local.mjs`; modify pinned `web/lib/auth/server.ts`의 directory 연결.

**Interfaces:** `SideoutStore`는 `listClubs():Promise<ClubRecord[]>`, `getClub(id):Promise<ClubRecord|null>`, `listSessions(from,to):Promise<Versioned<SessionRecord>[]>`, `getSession(id):Promise<Versioned<SessionRecord>|null>`, `getRoster(sessionId):Promise<Versioned<RosterRecord>|null>`, `getPreferences(memberId):Promise<Preferences>`를 제공한다. 생성 함수 `makeSideoutStore(db:D1Database):SideoutStore`. `makeClubDirectory(store):ClubDirectory`는 저장된 모임 존재만 판단한다.

P1은 기존 `workspaces(id,payload,revision)` 테이블을 재사용한다. 키는 `sideout:club:<id>`, `sideout:session:<id>`, `sideout:roster:<id>`, `sideout:preferences:<memberId>`. payload는 `{schemaVersion:1,data:T}`로 검증한다. 과거 `*-v1` 데모 namespace는 읽지 않는다. 새 migration 번호를 점유하지 않아 진행 중 M4와 충돌을 줄인다. P2의 쓰기 원자성 설계는 별도이며 여기서 보장됐다고 표시하지 않는다.

- [ ] **Step 1 — 저장소 실패 검사:** SQLite를 실제로 실행하는 D1 adapter로 ID별 읽기·정렬·버전, 준비 회차 포함 원본, 서로 다른 회원 즐겨찾기, 알 수 없는 schemaVersion/깨진 JSON은 저장 오류, 없는 session은 null을 검사한다. `SELECT` 경로가 INSERT하지 않는 것을 SQL 호출로 확인한다. 동일 이름 회원의 참가 참조가 ID별로 유지되는 fixture를 사용한다.
- [ ] **Step 2 — 실패 확인:** `npm run test:sideout -- tests/sideout-store.test.ts`.
- [ ] **Step 3 — 구현:** 바인딩 SQL 사용, 날짜 범위는 저장된 session date로 비교, club/member 선택지는 같은 directory 원본을 사용한다. schemaVersion·필드·ID 일치·참조 오류는 조용히 무시하지 않는다. preferences 부재만 빈 집합으로 반환; session이 있는데 roster가 없으면 데이터 오류로 처리한다.
- [ ] **Step 4 — 로컬 seed 도구 구현:** `node scripts/seed-sideout-p1-local.mjs --state-path .wrangler/sideout-p1`을 제공한다. 기존 auth 로컬 도구의 `getPlatformProxy` 패턴과 인수된 migration SQL을 사용하되 `remoteBindings:false`, `envFiles:[]`, 지정 경로가 checkout 내부 `.wrangler/sideout-p1`임을 검증한다. 지정 경로가 이미 존재하고 비어 있지 않으면 덮어쓰지 않고 종료한다. 인수한 journal 순서대로 0000~0002 SQL을 로컬 바인딩에 적용한다. DB 전체 초기화 금지. 현재 KST 주 기준의 합성 자료와 실제 해시를 가진 합성 계정을 생성하고, 로컬 자격은 같은 ignored 경로의 0600 파일에만 기록한다. 로그에는 비밀번호·세션 토큰을 출력하지 않는다. 정상 계정 및 첫 변경 필요한 계정을 모두 준비한다.
- [ ] **Step 5 — 통과·커밋:** store 검사, auth member repository/HTTP 기존 검사, 타입 검사 통과. 로컬 DB에 준비된 ID·건수·참조 일치만 인계 문서에 기록한다. 도구 소스·테스트만 커밋한다.

## Task 4: 서버 신원과 권한별 조회 API

**Files:** Create `web/lib/server/{business-principal,sideout-query,sideout-http,sideout-dependencies}.ts`, 읽기 API route 4종, `web/tests/sideout-query.test.ts`, `web/tests/sideout-http.test.ts`; modify `web/app/api/workspace/route.ts`.

**Interfaces:** `requireBusinessPrincipal(request:Request, authRepo:AuthRepository, now:Date):Promise<VerifiedPrincipal>`는 auth에 `now.getTime()`을 전달한다. `getClubsView(principal:VerifiedPrincipal,store:SideoutStore,now:Date):Promise<ClubsView>`, `getHomeView(principal:VerifiedPrincipal,selection:ReadSelection,deps:SideoutDependencies):Promise<HomeView>`, `getSessionView(principal:VerifiedPrincipal,id:string,deps:SideoutDependencies):Promise<SessionDetailView>`; `handleSideoutRead(request,resource:'clubs'|'preferences'|'sessions'|'session',deps,id?):Promise<Response>`. `SideoutDependencies={authRepo:AuthRepository,store:SideoutStore,now:()=>Date}`. HTTP 외곽만 Cloudflare 바인딩을 읽는다.

읽기 DTO는 `web/lib/sideout/read-model.ts`에 추가한다. `MemberLabel={memberId,displayName,clubName:string|null}`; `PublishedTeam={id,title,players:(MemberLabel&{slotId,assignedPosition})[]}`. 원본 main/sub profile·계정·grants·참가 시각은 포함하지 않는다.

- `ClubsView={serverNow,clubs:ClubRecord[],capabilities:{canManageMembers:boolean}}`.
- `SessionCardView={session:SessionRecord,club:ClubRecord,sessionRevision:number,counts:{applicants,waiting},selfStatus:'applied'|'waiting'|'cancelled'|null,teamPublished:boolean,canViewPublishedTeams:boolean,canManage:boolean}`. 초안 정보는 관리 권한이 있을 때만 반환한다.
- `HomeView={serverNow,weekStart,cards:SessionCardView[],registrationOpportunities:{clubId,date}[]}`. 미등록 기회는 미래·관리 가능·같은 날짜 회차 없음 조건으로 서버 계산; P1에서는 비활성 등록 타일로 표현한다. 과거 주도 같은 회차 원본·조회 권한으로 처리하며 샘플 이력을 생성하지 않는다.
- `SessionDetailView={...SessionCardView,rosterRevision,visibleApplicants:MemberLabel[],guestCount:number|null,publishedTeams:PublishedTeam[]|null,publishedMatches:MatchPlanRecord|null,capabilities:{canEditSchedule,canManageRoster,canEditTeams,canEditMatches,canPublish,canCancelSelf}}`. 일반 회원의 waiters 이름·draft는 키 자체를 추가하지 않는다. P1에서 운영자도 draft 편집 조회를 하지 않으며 P3에서 별도 DTO로 확장한다. P1 capabilities의 쓰기 항목은 모두 false로 반환한다. canManage는 관리 권한에 따른 준비 회차 조회에 사용한다. P2/P3에서 각 쓰기 명령을 연결할 때 해당 capability의 도메인 조건과 테스트도 함께 구현한다; P1에 공개 가능성 검증을 중복 구현하지 않는다.

- [ ] **Step 1 — HTTP·투영 실패 검사:** 아래 표를 parameterized test로 추가한다. 홈 카드와 상세를 모두 검사하고 응답 직렬화 문자열에 금지 필드가 없는지 확인한다.
  | 조건 | 응답 |
  | 토큰 없음/만료/비활성 | 401, 데이터 없음 |
  | 첫 변경 필요 | 403 PASSWORD_CHANGE_REQUIRED |
  | 일반회원 `?role=master` | 권한 상승 없음 |
  | 비관리자 준비 상세 / 없는 ID | 같은 404 형식 |
  | 소속 일반 회원 | 소속 신청자 이름과 게스트 수, 대기자 이름 없음 |
  | 타 모임 일반 회원 | 허용된 총인원만, 신청자 이름·게스트 세부 없음 |
  | 미신청·미배정 대기자 | publishedTeams/publishedMatches null |
  | 신청자·공개 배정자·관리자 | 허용된 공개 팀·경기만 |
  | 저장소 장애 | 503, 샘플로 대체하지 않음 |
  동명이인·이름 변경·비활성 과거 회원은 `getMemberIdentity`로 라벨을 조회하되 현재 접근권한 판단과 분리한다. 누락된 참조는 데이터 오류로 처리한다. 조회 도중 principal 버전 변경 테스트도 추가하여 응답 직전 재확인 시 이전 권한 자료를 반환하지 않게 한다.
- [ ] **Step 2 — 실패 확인:** `npm run test:sideout -- tests/sideout-query.test.ts tests/sideout-http.test.ts`.
- [ ] **Step 3 — 서버 구현:** 기존 auth 계약을 소비하고 일반/운영 권한을 대상 clubId로 판단한다. 자기 계정/공개본 열람도 서버에서 계산한다. API는 `{ok:true,data}` 또는 `{ok:false,error:{code,message}}`, no-store를 반환한다. authority·store 오류를 서버 모듈 밖으로 그대로 던지지 않는다. `memberDependencies()`는 Task 3 directory를 사용한다. 빈 grants는 일반 참가 자격 상실을 뜻하지 않는다.
- [ ] **Step 4 — 데모 우회 경로 폐쇄:** `/api/workspace`의 GET/POST는 데이터 없는 410 `LEGACY_API_DISABLED`로 변경하고 테스트한다. 기존 데모 코드 원본은 Git에 보존되어 있으며 새 앱은 이 URL을 호출하지 않는다. 별도 인증 API와 관리 API의 정책은 유지한다. P1에서 쓰기 업무 API를 추가하지 않는다.
- [ ] **Step 5 — 통과·커밋:** 모든 sideout/auth 검사와 타입·빌드. 실제 로컬 D1 API에서도 세션 없는 요청·제한 세션·일반/운영자·마스터를 각각 확인한다. 커밋에 DB/자격은 포함하지 않는다.

## Task 5: 확정 앱 셸·홈·상세 조회 이식

**Files:** Create `web/lib/sideout-client.ts`, `web/lib/sideout/navigation.ts`, `web/components/sideout/{access,shell,home,session-detail,published-teams,match-list,account}.tsx`, `sideout.module.css`, 새 app page 경로들, `web/tests/sideout-navigation.test.ts`, `sideout-client.test.ts`, `sideout-pages.test.tsx`; modify `web/app/layout.tsx`, `page.tsx`. 필요한 경우 통합 작업 트리의 `MemberAccessGate`에 세션 재확인 콜백만 최소 추가한다.

**Interfaces:** `sideoutClient.clubs(signal?)`, `.preferences(signal?)`, `.home(selection,signal?)`, `.session(id,signal?)` → Task 4 DTO. `SideoutAccess`는 MemberAccessGate를 소비하고 active 세션·로그아웃·비밀번호 변경을 context로 제공한다. `SideoutShell`, `HomeScreen`, `SessionDetailScreen`, `AccountScreen`은 DTO/context만 소비하며 서버 원본을 import하지 않는다.

`safeReturnPath(raw:string):string`은 `/home`, `/account`, `/session/<opaque-id>`와 허용된 주·필터만 통과시킨다. `legacyHashToPath(hash,now):string`은 기존 `#/home?week=0&filter=favorites`와 상세 링크를 정식 경로로 변환한다. editor legacy 링크는 P1에서 해당 상세로 보내며 내부 시험 안내를 제공한다. 존재하지 않는 ID를 날짜 정규식으로 유효하다고 간주하지 않는다.

- [ ] **Step 1 — 실패 검사:** jsdom UI 테스트에서 익명→로그인, restricted→첫 변경, active→home, 계정에서 비밀번호 변경/로그아웃을 검사한다. 위조 role query는 표시 권한을 바꾸지 않는다. `safeReturnPath('https://evil.example')`와 `//evil.example`는 `/home`; 잘못된 `%` 인코딩은 throw 없이 안전한 경로로 이동한다. 오래된 week 링크 변환은 로그인 후 `clubs()`의 serverNow를 받은 다음 수행한다. 서버 응답 전 클라이언트 시계로 week를 확정하지 않는다.
- [ ] **Step 2 — 비동기·탐색 실패 검사:** AbortController와 요청 세대 번호를 사용해 A의 지연 응답이 B 화면에 나타나지 않는지 검사한다. 401/403은 이전 데이터 제거·재인증/권한 안내, 503은 오류·재시도 표시. 브라우저 focus/visibility 복귀 시 세션과 현재 조회를 재검증하고 계정/authorizationVersion 변경 시 캐시를 폐기한다. 테스트에서 이름을 검색해 누출 없음까지 확인한다.
- [ ] **Step 3 — 실패 확인:** `npm run test:sideout -- tests/sideout-navigation.test.ts tests/sideout-client.test.ts tests/sideout-pages.test.tsx`.
- [ ] **Step 4 — 화면 구현:** `main.tsx`의 Navigation/Filters/WeekCalendar/Detail 조회 배치를 작은 컴포넌트로 이식한다. 원본 카드·글자·버튼·여백을 유지하고 선택 데이터만 DTO로 바꾼다. `inline-teams.tsx`와 `match-order.tsx`에서 조회 표현만 재사용하여 별도 published-teams/match-list로 분리한다. 편집 상태·fixture·회원 전체 목록을 옮기지 않는다. 공통 Button에 동일한 크기 규칙을 적용하며 최소 44px 터치 영역을 유지한다.
- [ ] **Step 5 — 라우팅·미연결 기능 표현:** app layout은 SideoutAccess, 각 page는 셸과 조회 화면으로 구성한다. 서버 렌더 중 window/location 접근 금지. `/`의 클라이언트 진입 어댑터가 hash 호환 후 `/home` 또는 상세로 replace한다. 공유 레이아웃의 인증 gate가 활성화되기 전에 업무 children을 렌더/조회하지 않는다. 새로고침/직접 URL은 서버 데이터를 다시 가져온다. week/filter와 홈 스크롤을 유지한다. P1 안내 ‘실제 계정 연결 시험 · 조회만 제공’을 한 곳에 표시하고 신청·등록·수정·즐겨찾기 수정은 비활성 처리한다. 모임 공간 메뉴는 P1에서 노출하지 않고 기존 소스는 보존한다. 계정 화면은 실제 이름·소속·비밀번호 변경·로그아웃만 제공한다.
- [ ] **Step 6 — 통과·커밋:** UI·client·route 검사, member UI 회귀, 타입 검사·빌드. 브라우저에서 DOM뿐 아니라 320/390px 실제 화면으로 원본 대비 레이아웃·터치·내비게이션을 확인한다. P1에서 비활성인 기능을 완료 목록에 넣지 않는다.

## Task 6: 로컬 통합 인수와 반복 가능한 검사

**Files:** Modify `.github/workflows/ci.yml`, `web/README.md`, `docs/reviews/PROMOTION_P1_HANDOFF.md`; 필요 시 Create `web/tests/sideout-runtime.test.ts`.

**Interfaces:** 앞선 단계의 실제 auth API와 D1-backed query API. UI mock 성공만으로 완료하지 않는다.

- [ ] **Step 1 — 전체 검사:** `for test in tests/*.mjs; do node "$test" || exit 1; done`, `npm run test:member-ui`, `npm run test:sideout`, `./node_modules/.bin/tsc --noEmit --incremental false`, `npm run build`, `git diff --check`. CI에도 새 두 test 스크립트를 기존 검사 뒤에 추가한다. 승인 UI 보존 파일은 변경되지 않았는지 manifest 해시를 확인한다.
- [ ] **Step 2 — 실제 로컬 DB 준비:** Task 3 도구로 별도 `.wrangler/sideout-p1`을 준비한다. 빌드의 로컬 Wrangler 서버도 같은 persist 경로를 사용한다. mock fetch를 해제하고 새 포트에서 실제 auth+read 흐름을 확인한다. 현재 4174 목업 서버는 중단/교체하지 않는다.
- [ ] **Step 3 — 실제 브라우저 검증:** 일반회원 A·운영자 B를 별도 브라우저 세션으로 사용한다. 로그인→첫 변경→홈→상세→새로고침→뒤로/앞으로→로그아웃→다른 계정 로그인, 준비 일정 숨김, 타 모임 권한 거부, 미신청/대기자 공개본 차단, 503·재시도, 세션 만료 후 복귀를 실행한다. 인증 쿠키·해시·임시 비밀번호는 스크린샷/보고서에 포함하지 않는다.
- [ ] **Step 4 — 모바일 인수:** 320/390px 브라우저로 잘림/가로 넘침/키보드/포커스 확인. 실제 iPhone의 같은 Wi-Fi HTTP 접속·로그인 쿠키·첫 변경·페이지 갱신은 사용자 기기에서 확인받는다. 도구로 실행하지 못한 iPhone 항목은 미확인으로 남기고 완료를 추정하지 않는다.
- [ ] **Step 5 — 인계·커밋:** 시작/인수/최종 SHA, migration(인수된 0000~0002), 시험 DB 경로, 명령·결과·화면 증거, 미완료 P2/P3/M4/원격 운영 범위를 기록한다. 제품과 테스트를 명시적 경로로 stage하여 커밋한다. PR/배포는 이 인수 검사와 별개다.

## 실행 전 자체 검토 결과

| 명세 범위 | 대응 |
| --- | --- |
| UI 원본 보존·인증 재사용·진행 중 변경 격리 | Task 1 및 기존 보존본 |
| 실제 시각·불변 ID·모임 directory | Task 2/3 |
| 제한 세션/권한·일반 조회 투영·데모 우회 차단 | Task 4 |
| 인증부터 홈·상세·계정, 직접 URL·history·캐시 제거 | Task 5 |
| 실제 D1·모바일·실패 검증 | Task 6 |
| 쓰기·공개 경쟁·경기 생성·LLM | P1 범위 밖, 승격 명세 P2~P5에 유지 |

Review Focus 1~5의 소유 테스트/검증 단계를 각 Task에 포함했다. 새 SQL migration은 만들지 않고 기존 workspaces를 읽기 저장소로 사용한다. 이 결정은 P2의 쓰기 트랜잭션 구조를 미리 확정하지 않는다. 회원 관리 화면 자체는 재사용 인수하지만 P1 셸에 관리 메뉴를 노출하는 것은 제외한다; 서버의 canManageMembers 계약은 후속 연결용이다.

**권장 실행 방식:** 이 채팅에서 순차 구현. 태스크마다 DTO·인증·저장 인터페이스 의존성이 커서 한 실행자가 연결을 유지하고, 전체 P1 완료 후 독립 검토를 한 번 수행하는 편이 적합하다. 매 태스크에 구현자·검토자를 새로 만드는 방식도 선택 가능하지만 문맥 전달과 검토 비용이 늘어난다. 계획 검토 및 실행 방식 결정 전 제품 코드는 변경하지 않는다.
