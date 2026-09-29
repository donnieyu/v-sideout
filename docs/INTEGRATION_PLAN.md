# 회원·인증 × 참가·팀편성 통합 계획

> **For agentic workers:** 후속 구현을 요청받은 경우 `superpowers:executing-plans`로 합의된 단계부터 순차 실행한다. 이 문서는 계획·개발 채팅 조율의 결과이며 기능 구현이나 파일 인계를 승인하지 않는다. 체크되지 않은 항목은 완료가 아니다.

**Goal:** 기존 참가 정책과 UI를 보존하면서 실제 회원 신원·세션·모임별 권한·영속 참가 기록을 연결할 책임, 계약, 검증 조건을 정한다.  
**Architecture:** 회원·인증 원본과 참가·편성 원본을 분리한다. 통합 담당은 서버에서 현재 세션을 검증하고 대상 모임 권한을 검사한 뒤 참가 명령을 호출하며, 앱은 권한에 맞게 제한된 응답만 소비한다.  
**Tech Stack:** 현행 목업 React/TypeScript/Vite/Vitest, 운영 기반 `web/` vinext/Workers/D1/Drizzle. 인증 라이브러리·최종 호스팅·실서비스 테스트 도구는 미선정.  
**Spec:** [회원 SSOT](ACCESS_AND_DEPLOYMENT_SSOT.md), [참가 구현 인계](design-review/shadcn-prototype/ROSTER_SSOT_IMPLEMENTATION_HANDOFF.md), [후속 모바일 UX 검토](design-review/shadcn-prototype/ALLOCATION_MOBILE_UX_REVIEW_2026-09-29.md). 회원 정책은 SSOT를 참조하며 여기서 대체 정의하지 않는다.

작성·갱신: 2026-09-29 KST · 계획 v0.3 · 통합 담당 채팅 `01a0ea7f-c288-7e23-91b2-dfe7c87ebb20`  
상태: **M0 인계 조율 / A의 스키마 단독 작성에 I 동의 / 기준 26개 해시 일치 / R 중단·A 파일 인수 별도 확인 / I 공유 소스 편집 없음**

**현재 담당 경계와 진척은 10절 → 9절 순으로 우선한다.** 2절·3절의 최초 관찰/수정 중 없음과 7절의 미착수 표기는 v0.1 작성 시점 기록이다. 이후 R이 만든 격리 인증 코드와 참가 UI 변경은 9절, 회원 SSOT v0.3·M0 인계 확인은 10절에 구분한다. 구현 계획을 참조한 사실만으로 실행 승인·파일 인계가 성립하지 않는다.

## 1. 범위와 상태 표기

- 이번 작업은 새 문서 작성과 기존 두 개발 채팅의 인계 확인이다. 기존 소스·SSOT 수정, 계정 발급, 이메일 발송, 실회원 자료 업로드, 공개 배포는 실행하지 않는다.
- 회원 정책은 SSOT U01–U15, P01–P09 및 6절을 따른다. 무소속, 로그인 아이디 공백 금지·전체 고유성·비활성 보존, 내부 ID에 연결된 이력, 마스터의 최종 아이디 채택·단일 유효 임시 자격, 최초 비밀번호 변경 전 업무 차단을 연결 과정에서 바꾸지 않는다.
- 참가·취소·배정·공개의 정책 결정은 참가 담당과 사용자에게 남긴다. 닉네임 일치만으로 자동 병합하지 않는다. 클라이언트의 `role/memberId/managedClubIds`는 인증 근거가 아니다.
- **관찰**은 이번 읽기 확인, **담당 보고**는 다른 채팅/문서의 검증 주장, **제안**은 미합의 설계, **합의**는 명시적 응답, **인계**는 파일별 편집권 양도를 뜻한다. idle·침묵·검사 통과는 인계가 아니다.
- 하위/상위 프로젝트 경로를 확인했으며 적용 가능한 `AGENTS.md`는 발견되지 않았다. 루트 Git 초기화·미커밋 이동·checkout 재구성은 하지 않는다.

## 2. 출발점과 증거

아래는 v0.1의 출발점 스냅샷이며, v0.2 현재 확인은 9절을 따른다.

| 대상 | 최신 확인 | 증거와 한계 |
| --- | --- | --- |
| 회원·인증 | SSOT v0.2, 실제 인증·관리 개발 미착수 | SSOT 상태/5·7·9절, 회원 채팅 직전 완료 턴 `01a0ea5c-280b-7613-9daa-b521c35e2432`. 독립 `member-access-prototype/`도 아직 없음 |
| 참가 원본 | 로컬 `SessionRoster` 명령·조회 통합 구현 | 구현 인계: 8개 파일/37개 검사 및 빌드 통과 **보고**. 실계정·서버 영속 저장·기기 간 동기화 증거 아님 |
| 참가 최신 후속 | 코트 기본 보기/토글, 소속 표기, 넓힌 동작 버튼, 반복 안내 제거 | 모바일 UX 문서와 완료 턴 `01a0ea6e-ec4c-7b02-b497-68b42fd20884`: 38개 검사/빌드, 320·390px 확인 **보고**. 선수 교체·신청자 우선 후보 구조는 검토안 |
| Git | 루트/docs는 Git 밖, `web/`만 별도 Git | 이번 `git rev-parse` 실패, `git -C web rev-parse` 성공. `main`, HEAD `bfb15977027c71135d8b1d0311b8ca19d8c2a3a2`, 상태 출력 없음 |
| 운영 기반 | `web/app/api/workspace/route.ts`는 query `role`과 `DEMO_MEMBER` 사용 | D1 payload/revision CAS 코드가 있지만 실제 로그인 근거가 아님. 목업 모델과 운영 모델은 서로 다름. 현재 운영 환경 동작/배포 설정은 이번에 확인하지 않음 |
| 현재 타입 | `Player.id`가 샘플 이름, `Access`는 `master/managedClubIds` | `team-model.ts`, `registration-model.ts`. 이 타입을 실서비스 인증/회원 계약으로 고정할 수 없음 |
| 조회 경계 | `RosterView`에는 전체 applicants/waiters와 제한된 visibleRoster가 함께 존재 | `roster-state.ts`. 객체 전체를 일반 회원 API로 직렬화하면 안 됨. 서버 전용 원본과 응답 DTO 분리 필요 |

후속 의존성: 실제 인증 제공자, 계정/권한 원본 API, 승인·자격 재발급 원자성, ID 변환, 서버 시간, 참가 저장 트랜잭션, 실제 권한표, 프런트 운영 이식 범위, 테스트용 DB 및 실행 도구. 목업 `revision`과 `web/` workspace `revision`은 단위가 다르므로 같은 값처럼 전달하지 않는다.

### 현재 요청한 인계

| 역할 | 채팅(고유 이름) | 요청 턴/상태 |
| --- | --- | --- |
| A 회원·인증 | 배포 및 운영 전략 세우기 · `01a0e806-3863-76d1-bfa3-f34e3016e9ae` · local | `01a0ea80-c2db-71a3-a8fa-0b510d3816be` · 최종 인계 수신, 책임 분담 명시 동의 |
| R 참가·팀편성 | Plan Seoul volleyball club site · `01a0c686-ac70-7ca0-84b9-fddd9c11af09` · local | `01a0ea80-c3da-7ca1-8256-c26bbd7f7b21` · 1차 인계; `01a0ea88-0afe-7232-9429-a1724ae5ef77` · 2차 검토/책임 경계 명시 동의 |
| I 통합 | 현재 채팅 · `01a0ea7f-c288-7e23-91b2-dfe7c87ebb20` | 본 문서만 작성 |

두 첫 메시지에 사용자 요청에 따른 조율과 I의 채팅 ID를 명시했다. 범위/완료·미완료/정확한 파일/소유권/타입·API/의존성/검증 근거를 요청했으며 구현 재개나 파일 양도를 요청하지 않았다. 답신은 원래 채팅에서 읽는다.

1차 응답: A는 현재 수정 중 파일 없음, SSOT 담당 유지, 본 계획 미편집, 파일 인계 없음과 책임 분담 동의를 명시했다. 함수/HTTP/오류 이름은 후속 회원 구현 계획에서 제공한다고 답했다. R은 이 인계 턴에 기능 파일을 수정하지 않았고 **8개 파일/38개 검사와 빌드를 재실행해 통과**했다고 보고했다. I가 검사를 직접 재실행한 증거와 구분한다.

2차 검토: A는 C03 어댑터 소유권을 보완해 책임 경계에 동의했다. R도 현재 수정 중인 소스가 없으며 역할 분담에 명시 동의했다. R은 누락 보호 경로, 일반/운영자 조회 구분, 미배정 대기자의 공개 팀 열람 거부, 미합의 동작별 권한표를 지적했고 아래 반영했다. 두 담당 모두 기능 파일 수정/편집권 양도는 하지 않았다. R 직전 UI 수정 파일은 `session-allocation.tsx`, `continuous-allocation.tsx`, `session-allocation.css`, `allocation-ab.test.tsx`이며 완료 상태다.

## 3. 파일 담당표와 단독 편집 인계

모든 경로는 프로젝트 루트 `/Users/donnieyu/DevSource/Personal/v-team-builder` 기준의 실제 상대 경로다. `P`는 `docs/design-review/shadcn-prototype`의 경로 별칭이며 각 행의 경로에 그대로 치환한다. 미래 경로는 **신규 제안**이라고 표시한다. v0.1 인계 당시 A/R 모두 수정 중 소스 없음이라고 명시했지만 담당 소유권은 유지한다. R 보호 범위는 2차 검토 답변을 근거로 보완했다. 이후 편집 상태·격리 브랜치는 9절의 갱신 표를 우선한다.

| 경로 | 현재 담당/수정 상태 | 통합 때 담당 | 명시적 인계/조건·근거 |
| --- | --- | --- | --- |
| `docs/INTEGRATION_PLAN.md` | I, 신규 작성 | I | 사용자 지정 산출물. 생성 전 부재 확인 |
| `docs/ACCESS_AND_DEPLOYMENT_SSOT.md` | A, v0.2, 현재 수정 중 없음 명시 | A 유지 | A 1차 인계로 담당 확인. 인계 없음, 변경 요청은 A에 전달 |
| `README.md`, `docs/PRODUCT_PLAN.md`, `docs/MEMBER_ADMIN_PLAN.md`, `docs/design-review/DESIGN_HANDOFF.md` | A의 SSOT 연결 수정 이력, 다른 기존 변경 가능 | 문서별 확인 후 단독 담당 | 보호, 인계 없음; A 직전 완료 보고. 본 턴 수정 안 함 |
| `P/ROSTER_SSOT_IMPLEMENTATION_HANDOFF.md`, `P/ROSTER_SSOT_REVIEW_2026-09-29.md`, `P/ROSTER_CANCELLATION_REVIEW_HANDOFF.md`, `P/ALLOCATION_MOBILE_UX_REVIEW_2026-09-29.md`, `docs/superpowers/plans/2026-09-29-roster-ssot-implementation.md` | R, 구현/검토 기록 | R 유지 | 인계 없음; 참가 문서·최신 턴 |
| `P/src/main.tsx` | R, 참가 상태·셸 결합 | I 제안, 도메인은 R | 통째 파일의 단독 편집권 필요. 역할만 분담해 동시 수정 금지 |
| `P/src/navigation.ts`, `P/src/navigation.test.ts` | R, 내비게이션/회귀 | I 제안 | R 확인·해시·편집 중단 응답 후 인계 |
| `P/src/styles.css`, `P/src/session-allocation.css`, `P/src/allocation-ab.css`, `P/src/allocation-layout.css` | R, 공통/편성 스타일 | R 유지; 셸 수정 시 한 파일씩 I | 최신 모바일 수정 포함. 잠금 없는 동시 CSS 수정 금지 |
| `P/vitest.allocation.config.ts`, `P/package.json`, `P/package-lock.json`, `P/tsconfig.json`, `P/vite.config.ts` | R 보호, 테스트/빌드 공유 | 변경 필요 시 단일 담당 합의 | 설정 한 줄·테스트 include도 사전 파일 인계 대상 |
| `P/index.html`, `P/allocation-preview/index.html`, `P/position-preview/index.html`, `P/vite.allocation.config.ts`, `P/vite.positions.config.ts`, `P/postcss.config.js`, `P/components.json`, `P/README.md` | R 보호, 현재 편집 없음 | 단독 담당 합의 후 | R 2차 검토의 진입점/빌드 보호 요청, 실제 경로 확인 |
| `P/scripts/check-allocation-ab.mjs`, `P/scripts/check-position-board.mjs`, `P/scripts/check-registration.mjs`, `P/scripts/check-teams.mjs` | R 보호, 현재 편집 없음 | R 유지 | 검사 스크립트도 인계 전 수정 금지 |
| `P/src/roster-state.ts`, `P/src/roster-fixtures.ts`, `P/src/team-model.ts`, `P/src/model.ts`, `P/src/registration-model.ts` | R, 도메인/샘플/권한 예시 | R 유지 | 실회원 ID·도메인 권한 어댑터 변경도 R 수행, I는 계약 제공 |
| `P/src/roster-dialog.tsx`, `P/src/inline-teams.tsx`, `P/src/session-allocation.tsx`, `P/src/session-allocation-model.ts`, `P/src/continuous-allocation.tsx`, `P/src/position-board-model.ts`, `P/src/allocation-ab-model.ts` | R, 참가·편성 UI/명령 | R 유지 | 교체·후보 후속 작업과 충돌 가능, I 편집 금지 |
| `P/src/session-editor.tsx`, `P/src/registration.tsx`, `P/src/match-order.tsx`, `P/src/position-board.tsx`, `P/src/position-board.css`, `P/src/allocation-ab.tsx`, `P/src/lib/utils.ts`, `P/src/components/ui/`의 모든 파일 | R, 현재 편집 없음·보호 | R 유지, 공통 UI는 변경 필요 시 별도 인계 | R 2차 검토에서 누락 보호 경로로 명시 |
| `P/src/roster-state.test.ts`, `P/src/roster-fixtures.test.ts`, `P/src/roster.test.tsx`, `P/src/roster-transitions.test.tsx`, `P/src/roster-ssot.integration.test.tsx`, `P/src/session-editor.test.tsx`, `P/src/allocation-ab.test.tsx` | R, 현행 회귀 | R 유지 | I의 통합 검사는 별도 신규 파일로 제안 |
| `web/app/court-app.tsx`, `web/app/page.tsx`, `web/app/layout.tsx`, `web/app/globals.css` | 기존 운영 기반, 현재 편집자 확인 필요 | I 제안 | 참가 담당의 운영 UI 이식 범위 합의 전 변경 불가 |
| `web/app/api/workspace/route.ts` | 기존 API, 현재 편집자 확인 필요 | I 제안 | 회원 등록 분기/업무 분기 혼재. A/R와 분리 경계 합의 후 단독 수정 |
| `web/lib/model.ts`, `web/lib/operations.ts` | 기존 운영 도메인, R 확인 필요 | R 제안 | 최신 참가 정책 이식 책임과 기존 기능 보존 목록부터 확정 |
| `web/db/schema.ts`, `web/db/index.ts`, `web/drizzle.config.ts`, `web/drizzle/0000_windy_omega_red.sql`, `web/drizzle/meta/_journal.json`, `web/drizzle/meta/0000_snapshot.json` | 공유 DB·마이그레이션, 편집자 미확정 | 단일 작성자 A 제안, R 스키마 요구/I 연결 검토 | 번호·snapshot·journal 포함 묶음 잠금. 기존 migration 덮어쓰기 금지, 새 파일 생성도 예약 후 |
| `web/package.json`, `web/package-lock.json`, `web/tsconfig.json`, `web/vite.config.ts` | 운영 공통 설정, 편집자 미확정 | 단일 담당 지정 후 | lockfile/테스트 설정/DB 생성 명령 동시 실행 금지 |
| `docs/design-review/member-access-prototype/` | A 예정, 경로 미생성 | A | 신규 제안, 기존 목업과 포트·빌드 출력 분리 |
| `web/lib/auth/session.ts`, `web/lib/auth/member-directory.ts`, `web/lib/auth/contracts.ts`, `web/app/api/auth/session/route.ts`, `web/app/api/auth/login/route.ts`, `web/app/api/auth/password/route.ts`, `web/app/api/auth/logout/route.ts` | 미생성 | A 제안 | 인증 내부 구조·도구 선정 후 A가 확정 |
| `web/lib/integration/business-principal.ts`, `web/lib/integration/member-id-map.ts`, `web/lib/integration/authorize-roster.ts`, `web/lib/integration/roster-projection.ts`, `web/lib/integration/roster-client.ts` | 미생성 | I 제안 | 타입 확정·구현 착수 요청 후 생성 |
| `web/tests/integration/auth-roster.test.ts`, `web/tests/integration/member-id-map.test.ts`, `web/tests/integration/roster-concurrency.test.ts`, `web/tests/e2e/access-roster.spec.ts`, `web/vitest.integration.config.ts`, `web/playwright.config.ts` | 미생성·테스트 도구 미선정 | I 제안 | G0에서 도구·파일명/명령 확정 후; 현행 설정을 몰래 덮어쓰지 않음 |

표 밖의 파일도 자유 편집 대상으로 간주하지 않는다. 신규 파일의 위치와 import 경로 역시 각 담당에게 통지하고 공유 설정 변경 여부를 확인한다.

### 인계 절차

1. 넘기는 담당이 **정확한 파일 목록·완료/수정 중 상태·남은 작업·현재 실행 프로세스/빌드 출력**을 제시한다.
2. 양쪽이 기준을 읽는다. `web/`은 HEAD/브랜치/`git status --short`/필요 diff를, Git 밖 파일은 전체 SHA-256과 보존 위치를 기록한다. 관찰 해시는 잠금이 아니다.
3. 넘기는 담당이 “지정 파일 편집 중단, I 단독 편집 동의”와 적용 시점을 남기고 I가 수락한다. 그때만 해당 행을 **인계 완료**로 바꾼다. 일부 파일이면 나머지는 그대로 보호한다.
4. 인계 뒤 다시 해시를 대조한다. 다르면 원인을 확인하여 새 기준에 재합의한다. 무단 checkout/revert·변경 덮어쓰기는 하지 않는다.
5. I 완료 후 변경 목록/해시/검증을 전달하고 단독 편집권 반환을 확인한다. 리뷰 중 파일 변경은 중단한다.

기록 형식: `시각 | 경로 | from/to 채팅 ID | 기준 HEAD 또는 SHA-256 | 미완료 변경 | 중단·수락 메시지/turn ID | 반환 조건`. 현재 **인계 완료 0건**.

## 4. 책임 경계와 통합 계약 제안

### 4.1 책임

| 경계 | 제공 담당 | 소비/연결 담당 | 구체 계약 |
| --- | --- | --- | --- |
| 로그인·제한 세션·정상 세션·회전·로그아웃·회수 | A | I 앱 셸/서버 | A가 쿠키/세션 생성·검증·폐기 담당. I는 토큰을 자체 발급하거나 브라우저 role로 대체하지 않음 |
| 회원 ID/고유 로그인 ID·계정 상태·소속·모임별 역할 원본 | A | I/R | 현재 값 조회 및 권한 버전 제공. I는 레거시 ID 참조 매핑만 소유하고 회원 원본 복제 금지 |
| 참가·대기·취소·초안·공개 상태와 도메인 검사 | R | I 업무 API | 인증 검사가 끝난 서버 내부 actor만 입력. R은 정책 명령과 원자적 저장 요구 제공 |
| 업무 API 신원/모임별 권한 검사·응답 투영·오류 매핑 | I | 앱 및 R 서버 실행 | 요청마다 A의 최신 계정/권한 검증 → 대상 회차의 실제 club 조회 → 동작별 검사 → R 명령 → 저장/제한 DTO |
| DB migration 작성·적용/트랜잭션 구현 | A/R/I 협의 필요 | 각 서버 모듈 | 단일 migration 작성자와 참가 저장 구현자를 G0에서 지정. 책임 미정이면 G3 착수 불가 |

### 4.2 타입/API 목록

아래는 **미구현·미합의 제안 v0.1**이다. 구현된 것은 목업의 `RosterCommand`, `SessionRoster`, `executeRosterCommand`, `selectRosterView`뿐이며 API 엔드포인트가 아니다. `sessionId`는 참가 회차 ID로 유지하고 인증 세션은 `authSession`이라고 구분한다.

```ts
type MemberId = string; // 불변 내부 ID. displayName/loginId/샘플 이름과 구별
type ClubId = string;
type MemberIdentity = {
  memberId: MemberId; loginId: string; displayName: string;
  homeClubId: ClubId | null;
};
type ClubGrant = { clubId: ClubId; role: 'chair' | 'staff' };
type BusinessPrincipal = {
  memberId: MemberId; homeClubId: ClubId | null; isMaster: boolean;
  grants: ClubGrant[]; authorizationVersion: number;
}; // 서버 검증 결과만 생성. 클라이언트 응답을 이 타입으로 cast해 신뢰하지 않음
type SessionView =
  | { state: 'anonymous' }
  | { state: 'password_change_required'; expiresAt: string }
  | { state: 'active'; me: MemberIdentity; authorizationVersion: number };
type MemberPublicProjection = {
  memberId: MemberId; displayName: string; homeClubId: ClubId | null;
}; // 허용된 조회 대상에만 사용. 전체 디렉터리 공개를 뜻하지 않음
```

| ID | 제공 → 소비 | 제안 함수/HTTP | 데이터·실패 경계 |
| --- | --- | --- | --- |
| C01 | A → I | `GET /api/auth/session → SessionView` | 세션 토큰/비밀번호/이메일/전체 회원 권한 원본 제외. 만료·폐기는 anonymous. 비활성 계정은 업무 접근 거부 |
| C02 | A → I | `POST /api/auth/login {loginId,password}`, `POST /api/auth/password {currentPassword,newPassword}`, `POST /api/auth/logout` | 임시 로그인은 제한 세션만. 변경 성공 뒤 정상 세션 회전. 오류 코드·상태코드 및 재발급/회수 원자성은 A 확인 |
| C03 | I 소유 서버 어댑터 → A 인증 검증 결과 소비 | `requireBusinessPrincipal(request: Request): Promise<BusinessPrincipal>` | A가 세션 진위/만료/폐기·비활성·임시 자격 만료·최초 변경 상태와 현재 권한을 제공. I는 정상 업무 상태만 통과시키며 제한 세션 거부, 토큰 검증/상태 판정 재구현 금지. `business-principal.ts` 제안, 인증 오류는 401/403 제안 |
| C04 | A → I/R 서버 | `getMemberIdentity(memberId: MemberId): Promise<MemberIdentity | null>`; 모임별 grant 조회 | 회원 DB 원본 조회. 운영자 homeClub 기본 권한과 추가 모임 권한, chair/staff 차이를 유지. isAdmin 단일 값 금지 |
| C05 | I → R | `resolveLegacyMember(source, legacyId): MemberId` | 명시적으로 검토한 1:1 매핑만. 모호/미매핑/중복 참조는 실패하여 이식 중지, 닉네임 비교 자동 채택 없음 |
| C06 | R → I 서버 | `executeRosterCommand(state, command, context) → RosterCommandResult` | 현행 명령은 §4.3. context.actorId/access/now/members는 서버가 생성. 네트워크 DTO와 분리 |
| C07 | R/I → 앱 | `GET /api/sessions/:sessionId/roster` | 인증·조회 권한 적용 후 revision/인원/selfStatus/허용 명단·공개 팀 응답. 일반 회원 응답에는 비허용 이름·초안·평가·신청 시각 제외; 권한 있는 운영자용 초안/후보 투영은 별도로 정의 |
| C08 | 앱 → I/R 서버 | `POST /api/sessions/:sessionId/commands` | `commandId`, `expectedRevision`, 타입별 payload. 본인 신청 actorId는 body에서 받지 않음. 대상 memberId는 조작 대상일 뿐 인증 정보 아님 |
| C09 | I/R → 앱 | `ApiResult<T>` (§4.4) | 충돌/입력/권한/일시 실패를 구별. 허용 범위 내 최신 revision과 requestId만, 원본·자격·다른 모임 정보는 제외 |

쿠키 속성/CSRF·Origin 검사/요청 제한/해시/세션 수명과 세션 회수 방식은 인증 도구 선택 뒤 A가 명세한다. C03는 현재 상태를 요청마다 확인하고, 변경 직전 회수·권한 변경 경합까지 막는 저장 경계가 필요하다. 기술 선택 검증 전 구현 완료로 표시하지 않는다.

A의 2차 검토 턴 `01a0ea88-09ae-7f10-9a21-c210e4addd56`에서 C03 어댑터 소유권과 위 책임 경계에 동의했다. 제한 세션도 최초 비밀번호 변경·로그아웃 등 허용된 인증 동작은 가능하다. `BusinessPrincipal.grants`가 homeClub 기본 권한을 포함하는 최종 목록인지 C04에서 A가 명시하며, A/I가 각각 기본 권한을 계산하지 않는다. 이는 C01–C09 명세 전체 승인 또는 파일 인계가 아니다.

### 4.3 참가 명령과 ID/권한 어댑터

현행 명령은 `REGISTER_SELF`, `ADD_MEMBERS {playerIds}`, `CANCEL_PARTICIPATION {playerId}`, `SAVE_DRAFT/PUBLISH_TEAMS {lineup,confirmUnregisteredIds}`이며 공통 `sessionId/expectedRevision`을 가진다. 서버 DTO 제안은 `playerIds → memberIds`, `playerId → targetMemberId`, Lineup 선수 객체 → `{memberId, position, slotId?}` 참조로 바꾼다. name/club/프로필을 body에서 받아 원본으로 저장하지 않는다. 팀 ID/팀 이름/자리 규칙은 R 소유 타입을 따른다.

I는 DTO를 검증해 R 타입으로 어댑트하고 R이 전달받는 모든 선수 ID는 불변 회원 ID여야 한다. `nb` 등 샘플 club ID와 `seoul-demo` 등 운영 club ID도 명시적 모임 매핑을 준비한다. 변환 전후 회원·회차·참가·공개 배정 참조 수와 고아 참조를 비교하고, 매핑 재실행은 중복을 만들지 않아야 한다. 실제 자료 수집/변환 실행은 이번 범위 밖이며 합성 데이터만으로 계약 검사한다.

I의 레거시 매핑은 참조 연결만 관리한다. 계정 생성·자동 병합·로그인 아이디 소유권 변경을 하지 않으며 최종 회원 ID·로그인 아이디·소속·권한 원본은 A에 유지한다.

권한 합의용 동작은 `read_roster/read_published_teams/register_self/add_members/cancel_participation/save_draft/publish_teams/register_session/edit_session`이다. **각 동작 × 본인/일반회원/무소속/소속 회장/추가 운영진/타 모임 운영진/마스터** 허용표를 R이 제시하고 A의 grant 모델로 표현 가능한지 검토한다. 현재 목업의 `canManage`는 회장/추가 운영진 구분을 모두 표현하지 않으므로 현행 코드만으로 실서비스 권한표를 확정하지 않는다. SSOT와 다르면 정책 변경 없이 출시 통합을 보류하고 합의한다.

조회 투영은 일반 소속 회원의 소속 신청자 이름·게스트 합계, 타 모임 회원의 허용 인원수, 운영진의 허용 명단을 나눈다. `MemberPublicProjection`이라도 조회 자격 없는 회원을 포함할 수 없다. 내부 주/부 포지션·실력과 공개된 배정 포지션은 별도 필드다. 회원별 열람 규칙은 R 인계/최신 확정 정책을 따른다.

운영자용 투영은 권한 있는 편성 화면에 필요한 초안·신청자·대기자·허용 프로필을 명시적으로 반환한다. 일반 회원용 공개 팀 투영에서 미배정 대기자는 실제 배정 후 재공개되기 전까지 팀 응답을 받지 못한다. 운영 권한이 있는 사용자의 운영자 조회와 이를 혼동하지 않는다. `ADD_MEMBERS`/미신청 회원 편성의 chair/staff 차이는 이전 제품 계획 및 이후 사용자 요청을 R이 대조해 확정한다. R의 2차 검토는 C06–C09 방향에 충돌이 없다는 확인이며 상세 타입/HTTP/권한표 승인까지 뜻하지 않는다.

### 4.4 버전, 중복 요청, 실패

```ts
type ApiResult<T> =
  | { ok: true; data: T; revision: number; requestId: string }
  | { ok: false; code: string; retryable: boolean;
      requestId: string; currentRevision?: number };
// 인증 전 실패에는 revision·존재 여부를 노출하지 않는다.
```

- 성공 시 명단·인원·공개본은 같은 참가 revision에서 투영한다. 별도 `authorizationVersion`은 참가 revision과 혼용하지 않는다.
- `commandId`의 범위는 서버 actor+회차+요청 ID, payload 동일 재시도는 같은 처리 결과를 돌려주며 revision을 다시 증가시키지 않는다. 같은 ID/다른 payload는 거부한다. 재시도도 최신 접근 권한을 먼저 검사하며 저장된 비공개 응답을 무조건 재생하지 않는다.
- 버전 불일치 `stale_revision → HTTP 409`: 입력 유지, 최신 허용 조회, 차이 확인 뒤 새 명령. 자동 덮어쓰기/자동 공개 재시도 금지.
- `forbidden → 403`, 세션 부재/회수 `401`, 최초 변경 필요 `403 password_change_required`, 입력 오류 `400/422`, 정책 잠금 `409` 제안. `published_locked/deadline_locked/not_open/past/already_registered/not_participant/unknown_member/nothing_to_add/invalid_lineup/unregistered_confirmation_required/wrong_session`의 최종 HTTP 매핑은 R/I 합의 항목이다.
- 저장/연결 실패 `503` 및 응답 유실은 성공으로 표시하지 않는다. 같은 commandId로 처리 여부를 확인하고, 초안·현재 화면을 유지한다. raw 서버 오류·회원 비밀값은 내보내지 않는다.
- 서버 현재 시각으로 접수/공개/취소를 검사한다. 비교 형식은 UTC instant와 모임 시간대 `Asia/Seoul` 변환으로 명세하고 목업 고정 `REVIEW_NOW`를 이식하지 않는다.
- 공개 시 대기 승격+공개본+최초 공개 시각+revision, 취소 시 참가 상태+초안 배정 제거는 각각 한 원자적 커밋이다. 동시 공개/취소는 하나의 순서로만 성공한다. 저장 구현과 DB 보장 방식을 합성 DB 경쟁 검사로 입증해야 한다.
- 공개 후에는 본인·운영진·마스터 모두 취소를 거부하며 실패는 기존 상태와 편집 입력을 보존한다. `commandId` 멱등 처리와 서버 트랜잭션은 실서비스 신규 계약으로서 현재 로컬 `SessionRoster`에 구현돼 있지 않다.

## 5. 의존성에 따른 통합 순서

두 독립 목업을 계속 병행하는 방식은 화면 검토에 유효하지만 실계정 통합을 검증하지 못한다. 목업을 즉시 운영 코드로 합치는 방식은 신원·권한·모델 차이를 숨긴다. **계약과 ID를 먼저 고정하고 서버 연결 후 셸을 이식하는 순서**를 제안한다. 공통 파일의 동시 편집을 피하고 단계마다 실패 원인을 분리할 수 있다.

| 단계 | 담당/정확한 대상 | 착수 조건 | 산출물·완료 조건 |
| --- | --- | --- | --- |
| G0 계약·기준 고정 | I 본 문서, A SSOT/인증 설계, R 도메인 인계 | 양쪽 인계 답변 | C01–C09 및 권한표 서명/미결정 분리, 파일 인계 표, 저장 담당/운영 UI 이식 경로/테스트 runner 확정. 사용자 정책 결정이 필요한 항목은 제외해서 진행 가능 범위 표시 |
| G1 인증 제공 | A 신규 auth 파일·독립 회원 UI·승인된 migration | 최소 길이/임시 자격 유효기간 등 해당 동작 의존 정책 결정, 도구 및 단독 편집 합의 | 제한/정상 세션·회수·회원 원본·grant API와 합성 계정 검사. 실제 메일은 stub, 실회원 없음 |
| G2 ID·공개 투영 어댑터 | I `member-id-map.ts`, `roster-projection.ts`, R Player 내부 ID 대응 | C04/C05와 모임 매핑 합의 | 동명이인 별개·소속/표시/아이디 변경에도 이력 유지·고아 참조 0·비공개 필드 누출 0 검사 |
| G3 업무 서버·영속 저장 | I `business-principal.ts`, `authorize-roster.ts`, 승인 후 `api/workspace/route.ts`; R 참가 명령/저장; 단독 DB 작성자 | G1/G2 통과, 역할표/시간/원자 저장 설계 확정 | 위조 입력 거부, 회수 즉시 차단, 회차 버전 CAS/중복 명령·공개/취소 경쟁·저장 실패 불변. 기존 데모 API 우회 접근 폐쇄 |
| G4 셸·라우팅 연결 | I 승인받은 `main.tsx/navigation.ts` 또는 합의된 `web/app/` 대상, `roster-client.ts`; R 도메인 화면 | G3 계약 서버, 파일별 명시 인계, 원본 UI 기준 고정 | 로그인→최초 변경→업무, 로그아웃·만료 시 캐시/민감 화면 제거. 직접 URL/갱신/뒤로·앞으로/dirty 이탈/실패 입력 유지 |
| G5 통합 인수 | I 신규 integration/e2e 검사, A/R 결과 검토 | G1–G4 완료, 독립 합성 DB·두 계정·두 브라우저 | 아래 행렬 통과, 회귀/권한/동시성/재시작·모바일 증거, 잔여 결함 및 미검증 표. 테스트용 계정/DB는 로컬 합성 환경에서만 생성 |
| G6 제한 시험·배포 준비 | 별도 사용자 요청 후 담당 지정 | G5 및 호스팅/운영 정책 선택 | 실제 배포·메일·실회원 반입·CPU/운영 복구 검증은 별도 실행 범위. 본 계획 완료로 실행 권한이 생기지 않음 |

실행 시 각 단계는 해당 실패 테스트 작성 → 실패 확인 → 소유 파일 구현 → 해당 검사 통과 → 인계 증거 기록 순이다. 실패 테스트를 위해 정책을 임의 확정하지 않는다. `web/` 격리 checkout이 필요하면 네이티브 도구로 실제 Git 루트부터 확인하며, 루트/docs를 옮기지 않는다. docs 버전 보존·백업 방안은 G0에서 정하고 실제 배포 전 완료한다.

## 6. 검증 계획과 실행 계약

### 6.1 지금 실행 가능한 기존 목업 명령

작업 디렉터리: `/Users/donnieyu/DevSource/Personal/v-team-builder/docs/design-review/shadcn-prototype`

```sh
npx vitest run --config vitest.allocation.config.ts
npm run build
```

예상 기준: 최신 담당 보고 8개 파일/38개 검사, TypeScript+Vite 성공. 실행 시 숫자를 고정 성공 조건으로만 삼지 말고 실패 0 및 include 누락을 함께 확인한다. 담당의 build 출력 사용 여부 확인 후 실행하고 로그에 기준 SHA를 남긴다. 본 통합 계획 작성에서 이 명령을 재실행했다고 주장하지 않는다.

### 6.2 후속 실서비스 검사 명령(미구현 제안)

작업 디렉터리: 인계받은 `web/` 격리 checkout. 아래 설정/테스트 파일과 의존성은 **현재 없다**. G0에서 A/R/I가 runner를 합의하고 설정 담당이 생성한 뒤에만 실행한다. 테스트 DB는 로컬 합성 전용이며 운영 바인딩을 쓰지 않는다.

```sh
npx vitest run --config vitest.integration.config.ts tests/integration/auth-roster.test.ts tests/integration/member-id-map.test.ts tests/integration/roster-concurrency.test.ts
npx playwright test --config playwright.config.ts tests/e2e/access-roster.spec.ts
npm run build
npm run lint
```

Playwright 채택 시 Chromium 두 독립 context와 WebKit 조건을 구성한다. 채택 전 CUA 수동 확인은 보완 증거로만 남긴다. DB 초기화/마이그레이션/서버 기동의 정확한 명령은 도구·checkout 결정 후 G0 실행 부록에 넣어야 하며, 현재 `npm start`가 기존 `.wrangler/state`를 쓰므로 합성 DB 격리 없이 실행하지 않는다. 이 부록과 도구 설치가 없으면 실서비스 검사 착수 조건 미충족이다.

### 6.3 검사 행렬

| 검사 | 담당/단계·대상 | 반드시 확인할 결과 | 증거 |
| --- | --- | --- | --- |
| 기존 참가 회귀 | R+I, G2–G5 · 현행 8개 파일 | 공개 후 전 역할 취소 거부, 취소 시 초안 정리, 초안 대기 유지/공개 승격, 실패 불변·dirty 유지, 내비게이션·모바일 표시 보존 | `mock-regression.log`, `mock-build.log` |
| 로그인·첫 변경 | A+I G1/G4 · auth-roster | 임시 비밀번호 동일 변경 거부, 미변경의 직접 GET/POST 차단, 만료 정각/직전/직후, 변경 완료 세션 회전, 모든 역할 동일 제한 | `auth-roster.log`, 비밀값 제거 HTTP 사례 |
| 로그아웃·회수 | A+I G3/G4 · auth-roster/e2e | 로그아웃 후 이전 쿠키 재사용 거부; 재설정/비활성/권한 회수 뒤 열린 탭·진행 중 저장 재검사; 다른 계정 로그인 시 캐시 분리 | 서버 응답+두 context 화면 기록 |
| 모임/역할별 권한 | A/R/I G3 · auth-roster | 소속만 있는 일반회원 운영 거부, 무소속, homeClub+추가 grant, chair/staff 동작 차이, 타 모임·준비 회차·목록/상세/API 접근 | 동작×역할표별 상태코드·응답 필드 |
| 위조 요청 | I G3 · auth-roster | query/body `role=master`, actor `memberId`, managedClubIds, 다른 club/session, 변경된 선수 객체, 폐기 쿠키 모두 신뢰하지 않음. 구 데모 API 우회도 거부 | 부작용 없는 DB 전후·응답 |
| ID·고유성 | A+I G1/G2 · member-id-map | 동명이인 별도 ID, 미매핑 차단, 내부 공백 거부, 비활성 중복 거부, 소속/닉네임/로그인 ID 변경 후 이력 유지 | 매핑 fixture·참조 수·고아 0 |
| 승인·임시 자격 | A G1 · 인증 담당 검사 | 동일 승인 재시도, 두 신청/같은 아이디 경쟁, 한 유효 자격만, 발송 실패 재시도/재발급 분리, 비활성 아이디 반환 없음 | A가 확정할 검사 명령/파일+메일 stub 호출 수 |
| 공개 투영 | I/R G2/G3 · auth-roster | 일반 응답에 전체 RosterView/초안/타 모임 이름/평가/주·부 포지션/등록 순번·시각/이메일/자격 없음, 허용 공개 배정 포지션만 | JSON 필드 allowlist 단언 |
| 경로·이탈 | I G4 · e2e | 직접 URL/갱신/뒤로·앞으로에서 매번 접근 판정, 인증 전 정보 깜빡임 없음, 내부/브라우저 이동 dirty 확인, refresh/close 경고, 저장 거부 입력 유지 | URL·화면·이벤트 trace |
| 동시 변경·충돌 | I/R G3/G5 · roster-concurrency | 두 실제 테스트 로그인/두 context가 같은 revision으로 수정하면 하나만 성공, 공개↔취소 직렬 결과, 동일 commandId 한 번, 유실 후 중복 부작용 0 | 경쟁 요청 로그+DB 최종 한 revision |
| 영속·동기화 | I/R G5 · e2e+로컬 DB | 다른 context 갱신 반영, 새로고침/서버 재시작 후 같은 참가/공개 기록; 실패 롤백·복구 확인 | DB 전후·재시작 명령/로그 |
| 모바일 | I G4/G5 · e2e+수동 | 320×700/390×844·데스크톱; 로그인 키보드/자동완성/비밀번호 관리자, scroll/focus/dirty, 편성 후보 영역·버튼/이름 가독성 | viewport 스크린샷·기기/브라우저 버전 |
| 실제 인증·저장·배포 | G6 별도 범위 | 실제 제공자/해시·운영 호환·CPU·세션 쿠키·복구·메일 전달·공개 접근 경계 | 미실행. 목업/로컬 DB 증거로 대체 금지 |

증거 제안 위치: `docs/integration-evidence/<YYYY-MM-DD>-<stage>/`. 아직 생성하지 않았다. 각 실행의 `README.md`에 시각(KST/UTC), 실행자/채팅, 소스 HEAD·SHA 목록, 명령/cwd, 환경·합성 DB 식별자, 종료 코드/검사 수, 실패/미검증, 로그·화면 경로를 남긴다. 비밀번호/쿠키/토큰/실회원 자료는 기록하지 않는다. 실물 iPhone/Safari는 에뮬레이션 통과와 별도 항목이다.

## 7. Review Focus와 준비 현황

이 절의 구현 진척은 v0.1 기준이다. v0.2에서는 R의 격리 인증 일부 구현이 발견됐으며, 검토·인수·운영 반영 완료와 구별한다(9절).

1. **닉네임/로그인 ID 변경·동명이인:** 잘못된 사람의 신청 이력에 붙지 않음 — G2 ID 검사.
2. **첫 변경 전 여러 탭/만료된 제한 세션:** 업무 UI 진입과 업무 API 직접 호출 모두 차단, 유효한 제한 세션의 비밀번호 변경·로그아웃은 허용 — G1/G3 auth 검사.
3. **운영진 편집 중 권한 회수:** 화면이 열려 있어도 저장 시 실패, 다른 권한의 캐시 재사용 없음 — G3/G4.
4. **동시 공개/취소와 응답 유실:** 한 원자적 결과, 잠금 불변, 실패 후 입력 보존 — G3/G5.
5. **권한 있는 응답과 샘플 원본의 혼합:** 숨긴 명단이 JSON에 남거나 앞으로가기로 노출되지 않음 — G2 투영/G4 경로 검사.

| 구분 | 현재 항목 |
| --- | --- |
| 사용자 지시로 확정 | I 책임 범위, 기존 담당 책임 유지, 이번 계획·조율 범위, 공유 파일 인계 전 수정 금지, 회원/참가 SSOT 준수 |
| 합의 완료 | A 세션 생명주기·회원/권한 원본·인증/회원 관리 API 검사, R 참가·편성 정책/상태 전이, I 셸/라우팅·인증 결과 소비·ID 어댑터·업무 서버 권한 검사·통합 테스트. A/R 2차 검토의 명시 동의. 양쪽 현재 수정 중 소스 없음, 파일 인계 0건 |
| 확인 대기 | C01–C09 상세 함수/HTTP/오류·grant 의미, 모임별 동작 권한표, 스키마 단독 작성자/참가 저장자, 운영 UI 이식 방식/파일, 테스트 도구·DB 명령, 공유 파일 인계. 역할 분담 합의만으로 이 항목을 완료하지 않음 |
| 사용자 결정 필요 | 비밀번호 최소 길이, 임시 자격 유효기간, 활성화 전 만료 아이디 반환 여부·절차. 숫자/자동 반환을 가정하지 않음 |
| 설계 선택 후 확인 필요 | 아이디 정규화/허용 문자·길이, 인증 도구/해시/세션 수명·회수, 이메일/호스팅 선택, 자료 반입 방식. SSOT의 제안 상태 유지 |
| 참가 담당의 별도 정책/UX 의존성 | 신청 상한·우선 보장, 공개 후 팀 밖 신청자 운영, 재신청 순번/우선권, 선수 교체/맞교환·신청자 우선 후보안. 통합을 이유로 확정/구현하지 않음 |
| 구현/실서비스 검증 | 모두 미착수. 이번 문서 작성 완료와 서비스 통합 완료를 구분 |

### 이 계획 턴의 완료 체크

- [x] 최신 SSOT/참가 인계/모바일 후속/로컬 코드·Git 구조 확인.
- [x] 양쪽에 사용자 요청 및 통합 채팅 ID를 명시한 인계 요청 발송.
- [x] 양쪽 인계와 2차 문서 검토 답변 읽기 및 명시 합의/확인 대기 갱신.
- [x] 파일 담당표·인계 절차·계약 제안·순서·검증 대상/명령/증거 경로 작성.
- [x] 문서 링크·파일 존재·소스 변경 없음·최신 SSOT 해시 재검사.
- [x] 계획 파일의 Codex 패널 열기 요청 및 사용자 보고용 준비 현황 정리.

문서 검증: 내부 링크 및 담당표의 현존 경로 확인. 작성 전 수집한 docs/web 텍스트 소스·설정·문서 234개 SHA-256 대조에서 기존 파일 변경은 없었다. 이번 I가 생성한 파일은 본 문서 하나다. 같은 시간대 별도 문서 `docs/LAUREN_TAN_AGENT_ENGINEERING_SYSTEM_2026-09-29.md`가 추가된 것을 관찰했으며 본 작업에서 생성·수정하지 않았다. 루트/docs는 Git 밖이므로 이 계획은 `web/` 커밋에 포함되지 않는다.

## 8. 기준 해시(관찰, 편집권 인계 아님)

2026-09-29 작성 중 읽은 SHA-256. 최종 인계 시점에 다시 계산한다.

| 파일 | SHA-256 |
| --- | --- |
| `docs/ACCESS_AND_DEPLOYMENT_SSOT.md` | `f22445d9849569506994ce06a7a4e80325e84d5a76a14dd6cb73b73a197c4e8a` |
| `P/ROSTER_SSOT_IMPLEMENTATION_HANDOFF.md` | `0982010c0a0d039e2df9293a3b7816ed983a4fe5d572845afad05b28b4775126` |
| `P/src/main.tsx` | `44890987e2297e9ee17806a03f75e428d732cdd6d2471503fdbf6da081aaafa8` |
| `P/src/navigation.ts` | `ae98b563d9f9ab0ad37b5f37c583ef7055ac75dd5541cdd2d3be7232487d462f` |
| `P/src/styles.css` | `490c22211c52754289804abc09e229bb81dd1f46cee7cacd69b08644c0b91373` |
| `P/vitest.allocation.config.ts` | `241d293f1b4314f844acc6bec7a32de4e81813d28a85192019eafcba811745bc` |

## 9. 담당 범위 재확정과 중복 작업 정리 · v0.2

### 사용자 최신 지시

사용자는 참가 채팅 `01a0c686-ac70-7ca0-84b9-fddd9c11af09`가 **로그인 화면이나 인증을 진행하지 않고 내부 팀편성과 신청 로직을 담당**하도록 명시했다. 통합 담당은 이를 해당 채팅과 기존 회원·인증 담당에 전달했다. 인증 구현을 I로 자동 이전하라는 지시는 아니므로 기존 A/I 경계는 유지한다.

| 담당 | 맡는 작업 | 맡지 않는 작업 / 연결 경계 |
| --- | --- | --- |
| R · Plan Seoul volleyball club site | 참가 신청·대기·취소·명단, 팀 배정·교체·후보 정렬·초안/공개, 해당 내부 UI·도메인 검사 | 로그인/가입/첫 비밀번호 변경 UI, 계정 발급, 비밀번호·세션·인증 API, 인증 설계 확장 제외. 전달받은 신원/권한 계약을 도메인에 소비하는 데 필요한 질의는 가능 |
| A · 배포 및 운영 전략 세우기 | 로그인·가입 신청·첫 변경·회원 관리 화면, 계정/회원 원본·비밀번호·인증 세션, 회원/인증 API | 참가 정책·편성 알고리즘을 변경하지 않음. 발견된 인증 코드 인계 검토 전 같은 기능을 새로 중복 구현하지 않음 |
| I · 현재 통합 채팅 | 계약 조율·ID 참조 어댑터·앱 셸/라우팅·로그인 화면 연결·업무 API 서버 권한 검사·통합 검증 | 인증 내부 구현과 참가 도메인을 별도로 재작성하지 않음. 기존 작업을 검토하고 명시적 단독 편집 인계 후 연결 |

R의 도메인 권한 규칙(어떤 역할이 어떤 참가 동작을 할 수 있는가)과 A의 신원 검증(누구인가), I의 업무 API 강제 검사(현재 요청이 허용되는가)를 구별한다. 참가 검사를 위해 가짜 로그인이나 별도 세션 발급 경로를 새로 만들지 않는다. 합성 `actor` fixture는 인증 완료 증거가 아니다.

### 확인된 실제 작업

- R 최신 완료 턴 `01a0ea8a-82c9-72c0-b39c-e7d5ec8383d7`에는 별도 계정·세션 코드를 격리 브랜치에 남긴 뒤 팀편성으로 돌아왔다는 보고가 있다. [최신 편성 보고서](design-review/shadcn-prototype/ALLOCATION_IMPLEMENTATION_REVIEW_2026-09-29.md)는 교체/신청자 우선 UI와 모델 검사 69개·화면 검사 42개·빌드 통과를 보고했다.
- R 턴 `01a0eb15-3055-7c60-bee1-567634127640`은 ‘신청자’에 미배정 전원이 나오도록 포지션을 제외 조건이 아닌 정렬로 바꾸는 작업이다. 이후 완료 응답에서 인원수/목록 21명 일치, 배정 점검 69개·화면 검사 42개·빌드 통과를 보고했다. 이 작업은 R의 확정 범위 안이다. 현재 파일 편집 상태는 인계 답변으로 갱신한다.
- 이번 I의 읽기 확인에서 `web/work/member-roster-integration` checkout과 `feat/member-roster-integration` 브랜치가 실제 존재한다. HEAD는 `bfa0af18652ca116362c6e5f7aaeae6d9bf1acf0`이다.
- `web/main`은 `bfb15977027c71135d8b1d0311b8ca19d8c2a3a2`이고 작업 트리 변경 없음. 격리 인증 작업을 `main` 통합 완료로 보고하지 않는다. I는 해당 checkout을 수정·삭제·이동·병합·커밋하지 않았다.
- 회원 SSOT는 디스크상 v0.2/미착수 표기를 유지하고 SHA-256도 `f22445d9849569506994ce06a7a4e80325e84d5a76a14dd6cb73b73a197c4e8a`이다. A가 원래 담당으로 구현 미착수인 것과 R의 별도 코드 존재를 구별한다. SSOT 갱신은 A에게 근거를 인계한 뒤 담당이 수행한다.

### 격리 브랜치 파일 목록과 처리

이 표의 `W`는 `/Users/donnieyu/DevSource/Personal/v-team-builder/web/work/member-roster-integration`이다. **현재 생성·수정 출처는 R**, 미래 담당은 아래 제안과 기존 역할 경계를 따른다. 아직 코드 인수·품질 승인·재사용 결정이 아니다.

| 실제 경로(W 기준) | 이번 Git 관찰 상태 | 향후 검토/담당 | 현재 조치 |
| --- | --- | --- | --- |
| `lib/auth/credentials.ts`, `tests/credentials.mjs` | 커밋 `bfa0af1`에 추가 | A 인증 내부 | R 추가 작업 중단 요청, 보존·인계 검토 |
| `lib/model.ts`, `lib/operations.ts`, `tests/domain.mjs`, `tests/identity-roster.mjs`, `docs/superpowers/plans/2026-09-29-identity-roster-bridge.md` | 커밋 `5cb326d`의 actor 경계/투영 변경 | I 연결 계약 검토 + R 도메인 검토 | 통합 작업과 겹침. 파일 단위 단독 편집 인계 전 추가 확장/병합 금지 |
| `lib/auth/accounts.ts`, `lib/auth/auth-http.ts`, `lib/auth/auth-service.ts`, `lib/auth/d1-repository.ts`, `lib/auth/server.ts`, `lib/auth/session-token.ts` | untracked | A 인증 내부 | 삭제하지 않고 보존, 재사용 검토 전 A도 중복 작성 보류 |
| `app/api/auth/login/route.ts`, `app/api/auth/session/route.ts`, `app/api/auth/password/route.ts`, `app/api/auth/logout/route.ts` | untracked 디렉터리 내 파일 | A 인증 API | 기존 웹/목업에 연결하지 않음, 향후 인수는 해시와 미완료 근거 필요 |
| `db/schema.ts`, `drizzle/meta/_journal.json` | modified | A 단일 스키마 작성자 제안, 실제 인계 필요 | 생성 migration까지 함께 보존. 추가 migration 생성/적용 보류 |
| `drizzle/0001_glamorous_iron_lad.sql`, `drizzle/meta/0001_snapshot.json` | untracked | 동일 DB 담당 | 운영 DB 적용·번호 재생성·덮어쓰기 금지 |
| `tests/account-state.mjs`, `tests/auth-http.mjs`, `tests/auth-repository.mjs`, `tests/auth-schema.mjs`, `tests/auth-service.mjs`, `tests/session-token.mjs` | untracked | A 검증 + I 통합 검토 | 존재는 확인, I가 실행/정확성 승인한 것은 아님 |

`W/docs/superpowers/plans/2026-09-29-identity-roster-bridge.md`는 C03–C09를 참조하며 신원 연결·서버·로그인 UI 작업을 포함한다. 이 경로는 root/docs의 통합 계획과 별도 파일이다. 그 계획의 후속 서버·인증·셸 작업을 R이 계속 실행하지 않도록 담당 정정을 전달했으며, 새 지시가 기존 계획의 R 실행 범위를 제한한다. 기록은 삭제하지 않는다.

### 중복 방지 절차와 확인 상태

1. R은 기존 인증/계정 코드를 보존하고 인증 추가 작업을 중단한다. 참가 UI·도메인은 사용자 요청 범위에서 계속 담당한다.
2. A/I는 R의 인증/actor 코드 목록·HEAD·미커밋 SHA·검증·미완료를 받아 재사용/보완/보류를 결정한다. 이번 턴에는 인수나 코드 검토를 실행하지 않는다.
3. 인증 코드 인수는 R의 편집 중단 명시 + A 수락 + 파일별 기준 해시 기록 후 성립한다. I 영역의 actor/API/셸 코드도 같은 방식으로 I에게 별도 인계한다. 필요하면 혼합 파일을 한 사람이 순차 수정한다.
4. 인수 전 A의 같은 모듈 신규 구현, R의 인증 확장, I의 임의 병합을 모두 피한다. root/docs와 격리 checkout의 문서·마이그레이션이 서로 다른 위치임을 기록한다.

| 항목 | 현재 상태 |
| --- | --- |
| R에서 로그인·인증 제외 | **사용자 확정**, R에 전달. 후속 확인 턴 `01a0eb19-1633-7ee3-8188-f6026be7137e`는 완료 상태지만 조회된 최종 답변이 비어 있어 중단 확인/인계 동의로 간주하지 않음. 명시 응답 대기 |
| A 기존 회원·인증 담당 / I 통합 담당 | A 확인 수신: `01a0eb17-ab9e-7871-bc5c-29ad27c949f8`에서 자체 구현 미착수·인계 검토 전 중복 구현 안 함·파일/SSOT 미수정 명시. `01a0eb18-4543-76c1-b883-4b1d4dcab940`에서 기존 인증 코드 검토와 회원 기능 계획을 다음 담당 작업으로 제시 |
| R 참가 후보 UI 수정 | 범위 안, 완료 보고 수신. 기존 소유권 유지·I 편집 금지 |
| 발견 코드의 인수·재사용·완성도 | 확인 대기, 운영 반영 없음, 자동 폐기/승계 없음 |
| 파일 편집권 인계 | 기존과 같이 0건. 역할 정정이 파일 인수를 대신하지 않음 |

v0.2 검증: 문서 내부 링크 누락 0, 격리 checkout HEAD/변경 목록 재확인, 회원 SSOT 해시 불변. 이번 수정 파일은 root의 `docs/INTEGRATION_PLAN.md`이며 기능 코드·인증 코드·마이그레이션·다른 담당 문서는 수정하지 않았다. 인증 검사는 실행하지 않았으므로 기존 코드의 품질·보안·완성도는 인수 검토 전 상태다.

## 10. 회원·인증 M0 인계 경계 확인 · v0.3

### 입력과 확인 근거

A(`01a0e806-3863-76d1-bfa3-f34e3016e9ae`)의 M0 인계 요청을 받아 [재사용 검토](reviews/MEMBER_AUTH_REUSE_REVIEW_2026-09-29.md), [26개 기준 해시](reviews/MEMBER_AUTH_REUSE_BASELINE_2026-09-29.json), [인증 기반 보완 계획](superpowers/plans/2026-09-29-member-auth-foundation.md), [회원 SSOT v0.3](ACCESS_AND_DEPLOYMENT_SSOT.md)를 읽었다. I가 기준 JSON의 26개 파일을 W 디스크와 대조한 결과 **불일치 0개**다. 이는 파일 기준 확인이며 코드 품질 승인이나 테스트 재실행이 아니다.

- W: `/Users/donnieyu/DevSource/Personal/v-team-builder/web/work/member-roster-integration`
- 브랜치/HEAD: `feat/member-roster-integration` / `bfa0af18652ca116362c6e5f7aaeae6d9bf1acf0`.
- 기존 미커밋/미추적 파일이 있어 HEAD만으로 작업을 재현할 수 없다. 정확한 기준은 위 JSON의 개별 SHA-256을 함께 사용한다.
- SSOT v0.3 SHA-256: `a2f1e6c3375a6a8a776acb58f0b2d38918afe5e5329c88373edeccfc520b05e2`.
- A의 로컬 검사 9개 스크립트/타입 통과 보고와 F01(로그아웃 저장 실패를 성공 처리), F02(비밀번호·세션 회전 중간 실패)의 재현 근거를 확인했다. 두 결함은 보완 전 의존성으로 남긴다. I가 수정/해결을 확인한 상태가 아니다.

### 정책 상태 갱신

SSOT v0.3에서 **최소 8자·영문/숫자 포함**, **임시 자격 7일**, **미활성 계정도 만료만으로 로그인 ID 자동 반환 없음**이 사용자 확정으로 바뀌었다. 이 문서 앞부분의 세 항목 ‘사용자 결정 필요’ 표기는 과거 기록이며 더 이상 진행 차단 사유가 아니다. 명시적 ID 회수 절차·세션 수명·정규화 상세 등 나머지는 SSOT의 개별 상태를 따른다. 회원 정책 원본은 계속 A가 관리한다.

### 단독 작성자와 충돌 확인

| 정확한 범위 | 합의/예약 상태 | I의 현재 작업·의무 | 잔여 조건 |
| --- | --- | --- | --- |
| `W/db/schema.ts`, `W/drizzle/` 전체(SQL, meta journal, snapshot, 새 migration 포함) | A 단독 작성 제안에 **I 명시 동의**, A에게 회신 | 현재 편집 없음·충돌 예정 없음. A 작업 기간 수정/생성/적용 안 함 | R 기존 편집 중단 및 A 인수 확인 후 실제 편집 개시. 다른 checkout으로 바꾸면 절대 경로와 기준 재확인 |
| main의 `web/db/schema.ts`, `web/drizzle/` | 이번 인증 작성 대상 아님 | 같은 스키마를 main에서 병행 수정하지 않음 | A의 W 인수가 main 수정/병합 권한을 뜻하지 않음 |
| `W/lib/auth/`, `W/app/api/auth/`, A 계획에 명시된 인증 테스트 | A 소유·기존 파일 인수 대상 | I는 토큰/세션/회원 원본 구현을 중복 작성하지 않음 | R 중단·A 수락·해시 일치 및 기준 보존 필요 |
| `W/lib/integration/business-principal.ts`(제안), 업무 API/앱 셸 | I 소유 책임 유지 | 현재 편집 없음. A의 검증 결과와 계약을 소비 | 실제 경로/파일 인수와 계약 확정 후 구현 |
| `W/lib/model.ts`, `W/lib/operations.ts`, `W/tests/domain.mjs`, `W/tests/identity-roster.mjs` | I/R 연결·도메인 검토 범위 | 인증 인수 파일과 분리 | 기준 JSON에 포함되었다고 A에게 편집권이 넘어가지 않음 |
| `W/db/index.ts`, `W/drizzle.config.ts`, `W/package.json`, `W/package-lock.json` 등 공용 설정 | 이번 단독 작성 목록 밖 | I 현재 수정 없음 | 필요하면 A가 정확한 추가 파일을 예약하고 단독 작성자 확인 |
| root `docs/INTEGRATION_PLAN.md` | I | 이번 턴의 유일한 I 수정 파일 | A/R은 직접 수정하지 않고 정정 요청 전달 |

A 작업 기간은 **R 중단 + A 인수 확인으로 시작하여 A가 기준/검증을 포함해 반환 또는 다음 구간 인계를 명시할 때까지**다. 그 사이 I/R의 참가 스키마 요구는 A에게 전달하고 각자 migration 번호를 만들지 않는다. I의 동의는 R을 대신한 편집 중단 선언이 아니므로 R에게 별도 확인을 요청했다. 참가 목업의 사용자 승인 UI 변경은 R 담당으로 계속 가능하다.

### 다음 인계 조건

1. R의 인증·스키마 파일 편집 중단과 보존 범위를 확인하고, A가 정확한 목록을 인수한다. 다른 담당 변경을 `git add .`로 일괄 커밋하지 않는다.
2. A는 M1 Task 1·2 범위와 계획의 착수 조건에 따라 확정 정책/F01을 보완한다. I는 이번 메시지로 계획 실행 범위나 사용자 승인 단계를 확대하지 않는다.
3. Task 3의 원자적 회전/F02, Task 4의 신원 DTO·유효 grant 의미는 후속 제공 대상으로 남긴다. C01–C04를 구현 완료로 표시하지 않는다.
4. A의 `effectiveClubGrants`가 소속 기본 역할과 명시 역할을 한 곳에서 합성하는 방향은 기존 경계와 맞는다. 동일 모임 명시 역할 우선 등 세부 의미는 C04 확정 때 확인하고 I에서 다시 계산하지 않는다.
5. I는 A가 제공하는 `resolveVerifiedIdentity` 결과를 `requireBusinessPrincipal`에서 소비하고 업무 접근·대상 모임 권한을 검사한다. A는 세션 진위/상태를 담당한다. F01/F02가 남은 상태에서 실제 로그인 연결 완료나 운영 준비 완료를 선언하지 않는다.

**현재 결론:** I 측 충돌 없음·스키마 A 단독 작성에 동의 완료. 전체 M0 인수 완료는 R의 명시 중단과 A 수락 기록까지 확인한 뒤 판정한다. 스키마 적용·인증 코드 수정·외부 실행은 이번에 수행하지 않았다.
