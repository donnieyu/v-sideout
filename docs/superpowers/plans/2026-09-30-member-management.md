# 기존 회원 사전 등록·관리 API 구현 계획

> M2는 승인된 [회원 SSOT](../../ACCESS_AND_DEPLOYMENT_SSOT.md)와 [로드맵](../../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md)을 따른다. 테스트 선행 검증을 적용한다.

**Goal:** 마스터가 기존 회원을 고유 아이디와 개별 임시 비밀번호로 미리 등록하고, 계정 상태·소속·권한을 안전하게 관리한다.

**Architecture:** A 소유 `auth_members`를 원본으로 유지한다. 관리 서비스는 입력과 비밀값을 검증·생성하고, D1 저장소는 행위자 재검증·버전 CAS·감사 기록·기존 세션 회수를 한 배치에서 확정한다. HTTP는 마스터의 정상 세션만 허용한다. 최초 마스터 생성 함수는 공개 라우트에 연결하지 않는다.

**Tech Stack:** 기존 vinext/TypeScript, Web Crypto, Cloudflare D1/Drizzle, Node 24.16.0의 SQLite 기반 검사. 새 외부 의존성 없음.

**Spec:** [회원 SSOT](../../ACCESS_AND_DEPLOYMENT_SSOT.md) U03–U05·U11–U15/P01–P09/4·6절, [M2 로드맵](../../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md).

## Global Constraints

- 회원 ID는 불변 UUID, 로그인 비교키는 NFC·소문자 정규화 후 전체 계정에서 고유하다. 비활성 계정도 키를 점유한다. M2에서는 로그인 아이디 변경을 허용하지 않는다. 이전 아이디의 재사용 정책이 정해지지 않았기 때문이다.
- 사전 등록 시 8자 이상 영문·숫자 임시 비밀번호를 회원마다 새로 생성하고 발급 시각부터 7일간 유효하게 한다. 첫 로그인 뒤 변경 필수다. 평문은 등록·재발급·재활성화의 성공 응답에 한 번만 포함하고 DB·감사 로그·일반 목록에는 저장하지 않는다. 응답 유실 시 명시적 재발급이 필요하다.
- 마스터 초기 생성은 서버 내부 함수만 제공하고 공개 API에서 호출하지 않는다. 첫 계정이 이미 있으면 초기화는 거절한다. 실회원 정보/자격은 이번 개발과 검사에 사용하지 않는다.
- 관리 HTTP는 현재 정상·마스터 세션과 동일 출처의 쓰기 요청을 요구한다. DB 쓰기는 행위자 `authVersion`과 활성 마스터 상태를 다시 검사한다. 제한·만료·비활성·버전 불일치 세션은 관리 명령을 할 수 없다.
- 생성·수정·재발급·비활성화·재활성화는 감사 행위와 원자적으로 확정한다. 변경 시 `authVersion`을 높이고 기존 세션을 폐기한다. 마지막 활성 마스터를 강등·비활성화할 수 없다. 계정이 비활성화되어도 ID와 로그인 아이디를 유지한다.
- 무소속 일반 회원은 `homeClubId=null`을 허용한다. 마스터는 소속 없음. 운영자의 `homeRole`은 소속이 있을 때만 허용한다. 모임 ID 검증의 정본은 I와 확인한다.
- 회원 목록·상세 응답은 필요한 관리 정보만 내고 passwordHash, session token, 이메일, 과거 임시 비밀번호를 포함하지 않는다. `kind`는 M2 사전 등록에서 `regular`이다.
- 가입 신청 승인·메일 발송·실자료 가져오기·UI·공개 배포는 M3–M6 경계다. I의 업무 API·앱 셸과 R의 참가 모델을 수정하지 않는다.

## Review Focus

1. 서로 다른 요청이 같은 로그인 아이디를 동시에 등록할 때 정확히 한 계정만 생기고 임시 자격이 중복 발급되지 않는다.
2. 다른 두 마스터가 서로를 비활성/강등하려 할 때 마지막 활성 마스터가 남는다.
3. 권한 변경 직전 행위자 권한이 회수되면 관리 쓰기와 감사가 모두 반영되지 않는다.
4. DB 명령의 중간 오류·응답 유실 때 비밀번호만 변경되거나 이전 세션만 폐기되지 않는다.
5. 비활성 계정 재활성은 같은 ID/로그인 아이디를 유지하면서 새 임시 자격 하나만 유효하게 한다.

## Task 1: 관리 입력과 일회성 자격

**Files:** `web/lib/auth/member-management.ts` 신규, `web/tests/member-management.mjs` 신규.

**Interfaces:** `MemberDraft`/`MemberChanges` 검증, `makeTemporaryPassword`, `prepareManagedMember`, `prepareManagedUpdate`를 제공한다. 공개 응답용 `MemberAdminView`는 허용 필드만 투영한다. 로그인 아이디는 생성 때만 입력받는다.

- [x] 실패 검사: 한글/영어 고유 키·내부 공백·무소속·master/운영자 필드 조합·임시 자격의 길이/영문/숫자·최소 관리 DTO 키.
- [x] `node tests/member-management.mjs`에서 새 API 부재의 실패를 확인한다.
- [x] 생성·수정·재발급·재활성의 계정 준비와 일회성 비밀값 생성 함수를 구현하고 검사를 통과시킨다.

## Task 2: D1 관리 저장과 감사·세션 원자성

**Files:** `web/db/schema.ts`, 신규 `web/drizzle/0002_*.sql`과 meta, `web/lib/auth/member-repository.ts`, `web/tests/member-repository.mjs`.

**Interfaces:** `bootstrapFirstMaster`, `createManagedMember`, `listManagedMembers`, `getManagedMember`, `commitManagedUpdate` 저장 메서드. 쓰기는 현재 마스터 행위자 검증, 대상 버전 CAS, 마지막 마스터 검사, 감사 삽입, 이전 세션 삭제를 단일 배치로 수행한다. 감사에는 자격 증명을 기록하지 않는다.

- [x] 실패 검사: 초기 마스터 한 번, 로그인 아이디 경합/비활성 ID, 중간 오류 롤백, 행위자 회수, 마지막 마스터 경합, 감사 및 세션 회수.
- [x] 마이그레이션과 저장 구현을 추가하고 로컬 SQLite/D1 모양 어댑터 검사에 통과시킨다.

## Task 3: 마스터 전용 관리 HTTP

**Files:** `web/lib/auth/member-http.ts`, `web/app/api/members/**/route.ts`, `web/tests/member-http.mjs`.

**Interfaces:** GET 목록/상세, POST 등록·재발급·비활성화·재활성화, PATCH 상세 수정. 생성/재발급/재활성의 성공 응답에만 해당 일회성 임시 비밀번호를 포함한다. 실패는 기존 인증 오류 코드 체계를 따른다.

- [x] 실패 검사: 익명/제한/일반 회원 401/403, 마스터 정상 경로, Origin·입력 오류, 비밀정보 비노출, 충돌 409·저장 오류 503.
- [x] 라우트와 HTTP 어댑터를 구현하고 테스트를 통과시킨다.

## Task 4: 검증·인계

- [x] Node24.16.0에서 `web/tests/*.mjs`, `tsc --noEmit --incremental false`, `npm run build`, 로컬 실제 Wrangler D1의 핵심 관리 명령을 검증한다.
- [x] 스키마·쿠키·계정 변경 경계, 일회성 자격의 응답 유실 복구, 인계 이후 I 담당 연결 범위를 [M2 인계](../../reviews/MEMBER_MANAGEMENT_M2_HANDOFF_2026-09-30.md)에 기록한다.
- [x] 회원 SSOT/로드맵에 M2 실제 완료 범위와 남은 M3–M6 작업을 갱신하고 정확한 파일만 커밋한다. 코드 커밋은 `3558044`다.
