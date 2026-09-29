# 회원 인증 기반 보완 구현 계획

> **For agentic workers:** 이 세션에서 직접 진행하는 경우 `superpowers:executing-plans`를 사용한다. 별도 에이전트 방식은 사용자가 선택한 경우 `superpowers:subagent-driven-development`를 사용한다. 아래 체크는 구현과 검증을 실제 수행한 뒤 표시한다.

**Goal:** 기존 인증 코드를 재사용하여 확정 비밀번호 정책, 저장 실패 시 일관된 계정/세션 상태, 통합용 최소 신원 계약을 제공한다.

**Architecture:** 계정 규칙·세션 서비스·D1 저장소·HTTP 경계를 유지한다. 비밀번호 변경의 세 저장 동작을 저장소의 원자적 명령으로 합치고 브라우저 응답과 서버 전용 검증 결과를 분리한다. 참가 업무 어댑터는 I가 이 결과를 소비한다.

**Tech Stack:** 기존 TypeScript, Web Crypto, vinext/React, Cloudflare D1/Drizzle, Node `.mjs` 검사와 로컬 SQLite. 이번 단계는 UI/새 의존성을 추가하지 않는다.

**Spec:** [회원 SSOT v0.5](../../ACCESS_AND_DEPLOYMENT_SSOT.md), [회원 개발 로드맵 M1](../../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md), [재사용 검토 F01/F02](../../reviews/MEMBER_AUTH_REUSE_REVIEW_2026-09-29.md), [Task 1·2 인계](../../reviews/MEMBER_AUTH_TASK1_2_HANDOFF_2026-09-29.md), [Task 3 인계](../../reviews/MEMBER_AUTH_TASK3_HANDOFF_2026-09-30.md).

상태: **M0 인계·Task 1~3 완료 / Task 4 미실행**. 현재 기준 저장소는 `/Users/donnieyu/DevSource/Personal/v-sideout`, Task 3 작업 트리는 `.worktrees/auth-rotation` (`feat/auth-rotation`)이다. 이전 `v-team-builder` 작업 트리들은 보존용이며 A가 변경하지 않았다. 실행 증거는 [Task 1·2](../../reviews/MEMBER_AUTH_TASK1_2_HANDOFF_2026-09-29.md)와 [Task 3](../../reviews/MEMBER_AUTH_TASK3_HANDOFF_2026-09-30.md) 인계에 기록했다.

## Global Constraints

- 비밀번호 최소 **8자**, 영문 1자 이상·숫자 1자 이상. 생일/이름 의미 검사, 특수문자 필수, 대소문자 혼합 필수 없음.
- 임시 비밀번호 **7일** 유효. 최초 변경 필수이며 동일 임시 비밀번호로 변경 불가. 만료 정각부터 사용 불가.
- 미활성 계정도 만료만으로 로그인 아이디를 자동 반환하지 않는다. 비활성 계정의 내부 ID·로그인 ID 매핑과 전체 고유성 유지.
- 아이디 내부 공백 거절. 기존 NFC/소문자 비교키·앞뒤 공백 정리는 구현 제안으로 재사용하며 비밀번호에는 적용하지 않는다.
- 무소속은 `homeClubId=null`. 일반 회원 무소속을 오류로 취급하지 않는다. 이 단계는 회원 소속 변경 정책을 바꾸지 않는다.
- 실제 회원·비밀값·운영 DB를 사용하지 않는다. 현재 `v-sideout/docs/`의 A 소유 진척 문서와 인증 소스만 수정하고 R/I 소유 소스를 변경하지 않는다.
- 기본 세션 수명은 기존 12시간을 설정값으로 분리해 유지하는 구현 제안. 제한 세션 유효기간은 임시 자격 만료를 넘지 않는다.
- 요청 제한·회원 관리·신청·메일·화면·배포는 로드맵의 후속 단계다. 이 단계 통과만으로 공개하지 않는다.

## Review Focus

1. 저장소 삭제 실패 때 성공한 로그아웃으로 표시하거나 기존 토큰이 폐기되었다고 가정하지 않음 → Task 2.
2. 비밀번호 변경 중간 실패·동시 변경·비활성화 경합 때 비밀번호만 바뀌거나 세션만 사라지지 않음 → Task 3.
3. 정확히 8자인 영문/숫자 비밀번호와 생일 포함 문자열을 허용하고 현재 임시 비밀번호는 거절 → Task 1.
4. 제한 세션과 임시 자격의 서로 다른 만료, 만료 정각, 누락/잘못된 쿠키를 일관되게 처리 → Task 4.
5. 소속 기본 역할·추가 역할과 브라우저 노출 범위를 혼동하지 않고 무소속도 유지 → Task 4.

## 파일 지도와 착수 조건

| 파일 | 책임 |
| --- | --- |
| `lib/auth/policy.ts` (신규) | 확정 규칙과 세션 설정 |
| `lib/auth/errors.ts` (신규) | 입력/인증/충돌/저장 실패의 내부 오류 코드 |
| `lib/auth/contracts.ts` (신규) | 브라우저 DTO와 서버 전용 신원 결과 |
| `lib/auth/identity.ts` (신규) | 검증된 세션을 최소 신원/유효 권한으로 투영 |
| `lib/auth/accounts.ts`, `credentials.ts`, `session-token.ts` | 기존 규칙·토큰 유지, 필요한 인터페이스만 보완 |
| `lib/auth/auth-service.ts`, `auth-http.ts`, `d1-repository.ts` | 장애 처리·원자적 회전·계약 연결 |
| `tests/auth-policy.mjs`, `auth-failures.mjs`, `auth-rotation.mjs`, `auth-contract.mjs` (신규) | 이 계획의 회귀 검사 |
| 기존 `tests/account-state.mjs`, `auth-service.mjs`, `auth-http.mjs`, `auth-repository.mjs` | 저장소 인터페이스/확정 정책 변경에 맞춘 회귀 유지 |
| `db/schema.ts`, `drizzle/*` | 저장소 구현이 요구할 때만 단독 작성자가 변경. 인수 전 생성/적용 금지 |

- [x] R의 인증 파일 편집 중단과 A 인수를 기록하고 기준 해시를 다시 대조한다. 원본 W의 인증 파일 20개를 A 격리 트리로 복사하고 기준 해시와 대조했다. 첫 정책 커밋에 원본 보존과 정책 보완을 함께 담아 [인계](../../reviews/MEMBER_AUTH_TASK1_2_HANDOFF_2026-09-29.md)에서 귀속을 구분한다.
- [x] 스키마·migration 단독 작성자를 A로 I와 확인했다. 합성 로컬 SQLite 기반 검사 경로를 사용했으며 실제 Workers/D1 시험은 미실행이다.
- [ ] I에 Task 4 계약을 제공해 C01–C04의 필드/유효 grant 의미를 확정한다. A의 원본 계정과 I의 `requireBusinessPrincipal` 소유권은 유지한다.

## Task 1: 확정 정책을 단일 모듈로 연결

**Files:** Create `lib/auth/policy.ts`, `tests/auth-policy.mjs`; Modify `lib/auth/auth-http.ts`, `tests/account-state.mjs`, `tests/auth-http.mjs`.

**Interfaces:** 기존 `AuthPolicy`, `validatePassword(password,minLength)`, `prepareAccount`, `changePassword` 소비. `AUTH_POLICY: Readonly<AuthPolicy> = {minPasswordLength:8, temporaryCredentialDays:7}`, `SESSION_SECONDS = 43200`을 policy 모듈에서 제공한다. HTTP의 중복 상수를 제거한다.

- [x] 실패 검사 작성: 최소 경계·의미값·만료·ID 보존을 아래 값으로 고정한다. 기존 `.mjs`의 TS 임시 변환/정리 패턴을 따른다.

```ts
assert.equal(AUTH_POLICY.minPasswordLength, 8);
assert.equal(AUTH_POLICY.temporaryCredentialDays, 7);
assert.equal(validatePassword('abc12345', 8), true);
assert.equal(validatePassword('a19900101', 8), true);
assert.equal(validatePassword('abc1234', 8), false);
assert.equal(validatePassword('abcdefgh', 8), false);
assert.equal(validatePassword('12345678', 8), false);
// 합성 account를 발급한 now를 고정하여 expiry === now + 7 * 86400000,
// 만료 정각 authenticate 결과 expired, ID/key 불변, 동일 임시값 changePassword 거절.
```

- [x] `node tests/auth-policy.mjs` 실행, policy 모듈 부재 또는 값 차이로 FAIL인지 확인한다.
- [x] policy 모듈을 만들고 HTTP와 검사가 같은 값을 소비하게 한다. 계정 삭제/아이디 반환 작업은 추가하지 않는다.
- [x] `node tests/auth-policy.mjs`, `node tests/account-state.mjs`, `node tests/auth-http.mjs`를 각각 실행하여 PASS 확인.
- [x] 관련 파일을 선택하여 `7205c2b` (`fix: apply approved member password policy`)로 커밋했다. 원본 보존 파일도 포함되므로 위 인계의 귀속 설명을 함께 확인한다.

## Task 2: 로그아웃·HTTP 오류를 실제 결과와 맞춤

**Files:** Create `lib/auth/errors.ts`, `tests/auth-failures.mjs`; Modify `lib/auth/auth-service.ts`, `lib/auth/auth-http.ts`.

**Interfaces:** `AuthErrorCode = 'INVALID_INPUT' | 'INVALID_CREDENTIALS' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'CONFLICT' | 'STORAGE_UNAVAILABLE'`; `AuthError extends Error`의 읽기 전용 `code`. `logout(repo,token):Promise<void>` 서명 유지. 실패 응답 `{error:{code,message}}`, 상태 400/401/401/403/409/503 대응. 서버 내부 예외 내용은 응답에 넣지 않는다.

- [x] `auth-failures.mjs`에 활성/제한 토큰 각각의 삭제 장애, 정상 삭제, 잘못된 토큰, 세션 조회 저장 장애를 검사한다.

```ts
// 합성 repo의 deleteSession을 실패시키고 기존 HTTP 진입점으로 호출.
assert.equal(failedLogout.status, 503);
assert.equal((await failedLogout.json()).error.code, 'STORAGE_UNAVAILABLE');
assert.equal(failedLogout.headers.get('set-cookie'), null);
assert.notEqual((await resolveSession(repo, oldToken)).state, 'anonymous');
assert.equal(successfulLogout.status, 200);
assert.equal((await resolveSession(repo, oldToken)).state, 'anonymous');
assert.equal(sessionLookupDuringOutage.status, 503);
```

- [x] `node tests/auth-failures.mjs` 실행, 기존 200 응답과 예상 503 응답 차이로 FAIL 확인.
- [x] 잘못된 토큰 파싱 실패만 무시하고 DB 삭제 오류는 전파한다. 세션 GET도 HTTP 오류 경계 안에서 처리한다. 성공 확인 전 쿠키 삭제/로그아웃 완료 응답을 내지 않는다. 인증 실패는 계정 존재·비활성·만료 여부를 구별하지 않는 문구를 유지한다.
- [x] `node tests/auth-failures.mjs`, `node tests/auth-service.mjs`, `node tests/auth-http.mjs`를 각각 실행하여 PASS 확인. 기존 HTTP 검사도 새 오류 계약을 검증하게 갱신한다.
- [x] 관련 파일을 선택하여 `cf391c2` (`fix: report authentication storage failures accurately`)로 커밋했다.

## Task 3: 비밀번호·세션 변경을 원자적 명령으로 만듦

**Files:** Create `tests/auth-rotation.mjs`; Modify `lib/auth/auth-service.ts`, `lib/auth/d1-repository.ts`, `tests/auth-service.mjs`, `tests/auth-repository.mjs`, `tests/auth-http.mjs`. 스키마 변경이 필요하면 인수한 `db/schema.ts`와 새 migration을 같은 담당자가 작성한다.

**Interfaces:** `AuthRepository`에 `commitPasswordChange(input:{expectedVersion:number;nextAccount:AccountRecord;nextSession:SessionRow}):Promise<'committed'|'conflict'>` 추가. 서비스는 새 토큰/해시를 준비한 뒤 이 명령 **한 번**으로 CAS·회원의 이전 세션 폐기·신규 세션 저장을 확정한다. 저장 오류는 reject하며 부분 성공을 반환하지 않는다.

- [x] 실제 SQL을 실행하는 로컬 저장소 검사에 각 저장 단계 실패·동시 같은 버전 변경·비활성화 선행을 추가했다. `tests/auth-rotation.mjs`는 Node SQLite 트랜잭션을 실행한다.

```ts
// 각 SQL 단계에 실패를 주입한 뒤 모두 검사한다.
assert.equal(accountAfter.passwordHash, accountBefore.passwordHash);
assert.equal(accountAfter.authVersion, accountBefore.authVersion);
assert.deepEqual(sessionsAfter, sessionsBefore);
// 같은 expectedVersion으로 병렬 변경: 정확히 하나 성공.
assert.deepEqual(results.sort(), ['committed', 'conflict']);
assert.equal(validSuccessorSessions.length, 1);
assert.equal(oldSessionStillValid, false);
// 먼저 비활성화되어 버전이 바뀌었다면 변경은 conflict, 비활성 상태 유지.
```

- [x] `node tests/auth-rotation.mjs` 실행, 새 명령 부재로 FAIL 확인.
- [x] 설치된 D1 타입·공식 문서의 `batch()` 트랜잭션을 확인해 저장소에 구현했다. `changes()`로 CAS 실패 때 후속 세션 명령을 0행으로 만든다. 로컬 Wrangler D1 바인딩에서도 정상·충돌 동작을 확인했다.
- [x] 서비스에서 새 명령을 사용하고 conflict→409, 저장 장애→503으로 연결했다. 계정 상태 검증 후 CAS 사이의 비활성화/재발급은 expectedVersion으로 거절한다. 커밋 후 응답 유실을 가정한 새 비밀번호 재로그인 검사도 추가했다.
- [x] `auth-rotation`, `auth-repository`, `auth-service`, `auth-http` 등 전체 12개 `.mjs` 검사를 통과했다. 로컬 Wrangler D1의 migration→seed→rotate→inspect→충돌 재호출 결과와 원격 D1 미검증 범위는 [인계](../../reviews/MEMBER_AUTH_TASK3_HANDOFF_2026-09-30.md)에 기록했다.
- [x] 검토 후 관련 파일만 `b13ceb4` (`fix: commit password and session rotation atomically`)로 커밋했다.

## Task 4: 브라우저와 업무 서버의 신원 계약 분리

**Files:** Create `lib/auth/contracts.ts`, `lib/auth/identity.ts`, `tests/auth-contract.mjs`; Modify `lib/auth/auth-service.ts`, `lib/auth/auth-http.ts`, `tests/auth-http.mjs`.

**Interfaces:** 기존 `ResolvedSession`의 active/restricted 결과에 `expiresAt:number`(실제 만료 시각)를 추가한다. A가 제공하는 계약은 아래와 같다. I의 `requireBusinessPrincipal`은 이 계획에서 생성/수정하지 않는다.

```ts
type MemberIdentity = {
  memberId:string; loginId:string; displayName:string; homeClubId:string|null;
};
type SessionView =
  | {state:'anonymous'}
  | {state:'password_change_required';expiresAt:string}
  | {state:'active';me:MemberIdentity;authorizationVersion:number};
type VerifiedPrincipal = {
  memberId:string; homeClubId:string|null; isMaster:boolean;
  grants:ClubGrant[]; authorizationVersion:number;
};
type VerifiedIdentity =
  | {state:'anonymous'}
  | {state:'password_change_required';expiresAt:string}
  | {state:'active';principal:VerifiedPrincipal};
function toSessionView(resolved:ResolvedSession):SessionView;
function effectiveClubGrants(account:AccountRecord):ClubGrant[];
function resolveVerifiedIdentity(
  repo:AuthRepository, token:string|null, now?:number
):Promise<VerifiedIdentity>;
function getMemberIdentity(
  repo:AuthRepository, memberId:string
):Promise<MemberIdentity|null>;
```

`ClubGrant`는 기존 accounts 타입을 재사용한다. `getMemberIdentity`는 인증·열람권한을 대체하지 않는 서버 내부 조회이며 공개 라우트를 만들지 않는다. 비활성 회원도 역사 참조에 필요한 최소 신원 조회는 가능하지만 `resolveVerifiedIdentity`에서는 anonymous다. 유효 grants는 소속 기본 역할에 명시적 추가 역할을 합치며 같은 모임이면 명시 역할 우선이라는 기존 `clubRole()` 동작을 따른다. master는 `isMaster`로 표현하며 모든 모임 목록을 가짜 grant로 생성하지 않는다.

- [ ] `auth-contract.mjs`에 DTO 정확한 키, 권한 합성, 제한/활성/무소속/비활성/만료 경계를 검사한다.

```ts
assert.deepEqual(Object.keys(view.me).sort(),
  ['displayName','homeClubId','loginId','memberId']);
assert.equal(view.me.homeClubId, null); // 무소속 합성 회원
assert.equal(restrictedView.expiresAt,
  new Date(Math.min(sessionExpiry, temporaryExpiry)).toISOString());
assert.equal(atExactExpiry.state, 'anonymous');
assert.equal(afterAccountDeactivation.state, 'anonymous');
assert.deepEqual(effectiveClubGrants(homeChairWithOtherStaff),
  [{clubId:'club-a',role:'chair'},{clubId:'club-b',role:'staff'}]);
// 동일 모임 명시 역할 우선, 중복 없는 결과, 일반 회원 소속만으로 운영 grant 없음.
// Serialized SessionView/VerifiedIdentity에 passwordHash, token, email 없음.
```

- [ ] `node tests/auth-contract.mjs` 실행, 새 계약 부재/기존 DTO 차이로 FAIL 확인.
- [ ] 순수 투영 함수와 서버 검증 진입점을 구현한다. 원본 계정을 JSON으로 보내지 않는다. 유효 만료를 `min`으로 계산하고 만료 정각부터 anonymous 처리한다. 권한 합성은 A 한 곳에서만 수행한다.
- [ ] `node tests/auth-contract.mjs`, `node tests/auth-http.mjs`, `node tests/auth-service.mjs`를 각각 실행하여 PASS 확인.
- [ ] 해당 파일만 커밋: `feat: expose verified member identity contracts`.

## 최종 검증과 인계

- [ ] 신규 4개 스크립트와 기존 9개 스크립트를 실행한다. 명령 목록은 재사용 검토 문서와 각 Task를 기준으로 하고 성공/실패를 파일별 기록한다.
- [ ] `./node_modules/.bin/tsc --noEmit --incremental false` 실행, 종료 코드 0 확인.
- [ ] `git diff --check` 및 파일별 diff를 확인한다. 다른 담당의 참가 모델/셸/API 수정이 없는지 확인한다.
- [ ] A 문서에 커밋·변경 파일·검사 결과·실제 D1 검증 유무를 기록하고 I가 읽을 인계를 작성한다. 스키마/쿠키/HTTP 계약과 응답 유실 복구 한계를 포함한다.
- [ ] M1 완료를 기록하고 M2(사전 등록·회원 관리) 상세 계획으로 이동한다. 이 단계에 없는 요청 제한/화면/메일/공개 배포를 완료로 보고하지 않는다.

## 계획 자체 검토

- 확정 8자/7일/만료 ID 보존을 Task 1에 연결했다. 저장 오류 두 건은 Task 2/3, 통합 DTO/유효 권한은 Task 4에 연결했다.
- UI·신규 신청·중복 발급·메일·배포 요구는 [로드맵](../../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md)에 모두 남겼다. 첫 단계가 전체 회원 기능 완료를 뜻하지 않는다.
- 입력 타입은 기존 AccountRecord/AuthRepository를 확장하며 후속 작업이 소비하는 신규 이름을 Interfaces에 정의했다.
- 공유 파일 인계와 목표 런타임 검증은 로컬 검사 통과와 분리했다. 기존 미커밋 코드는 임의로 덮어쓰거나 일괄 커밋하지 않는다.
