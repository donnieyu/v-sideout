# P2 실제 저장 연결 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 승인 목업의 일정 등록/수정, 즐겨찾기, 참가 신청/대기/운영진 명단 변경을 실제 서버 원본에 연결한다.
**Architecture:** 기존 `sideout:*` 회차 집계와 인증 신원을 재사용한다. 변경마다 서버 유효성 검사, 동일 출처 검사, 예상 버전 및 인증 버전을 확인하고 D1 batch로 변경·중복 요청 기록을 함께 저장한다. UI는 저장 완료 응답 후 읽기 자료를 새로 조회한다.
**Tech Stack:** React, TypeScript, Zod, D1/SQLite, Vitest, Playwright. 새 의존성/인증 테이블/마이그레이션 없음.
**Spec:** `docs/superpowers/specs/2026-09-30-mockup-promotion-design.md`, `docs/reviews/MOCKUP_PROMOTION_PARITY.md`, 현재 대화의 P2 착수 요청.

## Global Constraints

- 사용자 확정 ‘현재 P1’ 명단 타일 크기 유지. 목업 역할/고정시각/이름 ID를 제품으로 가져오지 않는다.
- `lib/auth/`, 인증 API, DB schema/migration, 가입/발송/요청 제한기는 다른 담당의 경계. 기존 검증 신원/회원 조회 계약만 소비한다.
- 일정/명단 저장과 팀 초안/공개는 분리. 팀편성/경기 편집은 P3.
- 모든 시각 조건 KST, 서버 now. 저장 실패/충돌/응답 유실을 성공으로 표시하지 않는다.
- 공개 이후 누구도 참가 취소 불가. 참가 취소와 배정 해제를 혼동하지 않는다.
- GAP-04 확정(2026-10-02 사용자 답변): 다른 모임 회원도 우선 기간 중 대기 등록 가능. 기간 종료 후 빈자리에 등록 순서대로 승격. 공개 후/시작 후 승격 금지; 마감 후 등록자는 대기 유지.

## Review Focus

- 저장 중 권한 회수/로그아웃: DB 커밋 조건에서 계정 버전·활성·제한 세션·세션 존재/만료 재확인.
- 다른 운영자의 변경/같은 날짜 동시 생성: 예상 revision 및 모임+날짜 중복을 원자 조건으로 검사.
- 응답 유실 후 재시도: 동일 commandId/payload 결과를 재생하고 다른 payload 재사용은 거부.
- 모바일 이탈: 별도 일정 편집 화면에서 변경 시 링크·취소·브라우저 이탈 보호, 성공 후 기준 갱신.
- 잘못된 정원/시각/임의 필드·CSRF: 서비스 함수뿐 아니라 실제 HTTP 테스트로 거부를 확인.

## Task 1: 원자 저장 경계와 일정/즐겨찾기 서버 연결

**Files:** create `web/lib/sideout/write-model.ts`, `web/lib/server/sideout-write-store.ts`, `sideout-write.ts`, `web/tests/sideout-write.test.ts`; modify read-model/store/query/dependencies/API route wrappers.
**Interfaces:** `handleSideoutWrite(request, resource, deps, id?)`; `makeSideoutWriteStore(db).commit({actor,tokenHash,now,commandId,hash,guards,writes,result,uniqueSession?})`; 반환 `{resourceId,revision}`. 원본 JSON과 보안정보는 성공 영수증에 포함하지 않는다.
- [x] RED: 권한 없는 등록, 같은 날짜 중복 생성, 이전 버전 수정, 동일 명령 재시도/변형 재사용, 외부 Origin, 저장 직전 권한 회수·세션 삭제, batch 실패 롤백.
- [x] 구현: 기존 `workspaces` 테이블에 네임스페이스가 다른 명령 영수증. 첫 조건부 영수증 insert와 변경을 동일 batch로 실행하며 커밋 nonce로 기존 영수증이 변경을 다시 수행하지 않게 한다.
- [x] 일정 입력: 입장≤시작<종료, 시작은 미래, 기존 값 그대로인 지난 마감만 허용, 우선 종료≤마감, 장소1~100/공지≤2000/정원1~200. 수정에서 모임·날짜 불변, 공개→준비 역행 불가.
- [x] 타입/서버 검사 통과 기록.

## Task 2: 일정 편집과 즐겨찾기 화면 연결

**Files:** create `web/components/sideout/schedule-editor.tsx`, `favorite-editor.tsx`, `use-edit-guard.ts`; add `/session/new`, `/session/[id]/schedule/edit`; modify client/home/detail/shell/navigation.
**Interfaces:** new `client.saveSchedule` / `savePreferences`; 신규/수정은 같은 폼. 기존 DTO `canEditSchedule` 서버 산출, 미등록 카드의 서버 계산 권한 소비.
- [x] 폼 실패/성공/충돌·입력 유지, 신규/준비/모집 상태 버튼, dirty 이탈을 React 테스트로 확인.
- [x] 날짜·시간·장소·공지·상한·우선기간을 별도 자식 화면에 제공, 상단 취소/저장. 반복 토글해도 버튼이 늘어나지 않음.
- [x] 즐겨찾기 복수 선택·빈 목록·취소·재로그인 후 유지. 계정별 저장.
- [x] 실제 로컬 합성 DB + 320/390/1280 화면 및 새로고침 재확인.

## Task 3: 참가 정책과 명단 변경 연결

**Dependencies:** GAP-04 사용자 답변 수신 완료. P3 주/부포지션 데이터는 여기서 새로 저장하지 않는다.
**Files:** create participant policy/commands and manager candidate projection; modify roster-dialog/home/detail/HTTP client.
- [x] 신청/대기/취소, 정원 마지막 자리 경쟁, 공개/마감/시작 경계, 운영진 범위, 취소된 회원 재추가를 검사.
- [x] 신청/운영진 추가가 같은 정책을 사용. 후보 API는 활성 회원의 ID/이름/소속만 최소 투영. 회원 비밀번호/로그인아이디/권한 원본 금지.
- [x] 참가 취소와 초안 배정 제거를 같은 revision으로 커밋. 공개본/최초 공개 시각 보존.
- [x] 운영진 검색·복수 추가·명시적 취소 UI 연결. 일반 소속 회원에게 게스트/대기자 이름 노출 금지.
- [x] 두 사용자 조회·카운트·후보와 새로고침 일치 검증.

## Task 4: 검증/인계

- [x] 전체 SIDEOUT/member UI 회귀, 타입, 빌드, 실제 D1 재시도·충돌, 브라우저 검증.
- [x] 전체 작업 독립 검토 1회; 중요한 발견 수정 및 재검증.
- [x] 대응표에 연결/미연결을 정확히 기록. 로컬 시험 URL 유지, 원격 배포/merge 없음.


## 실행 기록 / 판정

- 작업 기준 HEAD: `3faaf54b7817e3aaba7dba58b15bf2d59d29a7e3`. 이전 P1 변경은 이미 미커밋 상태였으므로 해당 내용을 되돌리거나 한 작업의 새 변경이라고 취급하지 않았다. 커밋/병합/원격 배포는 수행하지 않았다.
- Ruling: GAP-04 답변 전에는 일정/즐겨찾기만 진행했고, 답변 수신 후 참가 정책을 구현했다.
- Ruling: 자동 승격은 조회/변경에서 시간 도래를 확인해 같은 roster에 원자 반영한다. 별도 백그라운드 스케줄러는 추가하지 않았다. 열린 홈/상세/명단은 15초 갱신, 자신의 변경은 즉시 갱신한다.
- Ruling: 우선/정원 대기는 FIFO 승격 대상. 마감·공개 후 등록 대기 및 사유/순서가 없는 기존 데이터는 임의 승격하지 않는다. 공개 후 또는 시작 후 자동 승격하지 않는다.
- Ruling: 회원 목록은 기존 auth_members의 ID/이름/소속/활성/버전 최소 필드만 내부 조회하며 인증 저장 구조는 수정하지 않았다. 응답에는 ID/이름/소속만 투영한다.
- Ruling: 현 사용자 요청의 저장 후 계속 편집 방식을 일정에도 일관되게 적용했다. 성공 시 baseline/버전 갱신, 다음 수정은 새 명령.
- 독립 검토 1명, 정책 답변으로 넓어진 같은 작업에 대한 후속 검토 포함. 3건 발견: 날짜 오프셋 NaN, 신규 저장 URL 인계, 대량 처리 D1 한도. 모두 수정·회귀 검사.
- 완료 증거: SIDEOUT 125개, 회원 UI 4개, 타입/빌드, 실제 로컬 D1 및 320/390/1280 브라우저. 세 계정의 대기→승격·명단 추가/취소 검증. 자세한 기록은 `docs/reviews/p2-schedule-preferences-20261002/report.md`.

## 2026-10-02 사용자 정책 정정: 공개 후 추가 접수 금지

- 팀편성 최초 공개 후에는 본인 신청과 마스터/운영진 추가를 모두 차단한다. 후보 조회도 차단하며, 기존 명단 열람은 유지한다.
- 공개 전, 일반 마감 후에는 대기 등록한다. 우선 기간 외부 회원과 정원 초과도 대기 등록한다.
- 우선 기간 종료 후 우선/정원 대기 회원을 등록 순서대로 빈자리만큼 자동 승격한다. 공개 후에는 자동 승격하지 않는다.
- 기존 공개 일정의 대기자는 자동 삭제하거나 참가자로 바꾸지 않는다. 이전 정책의 공개 후 대기 접수 설명은 이 정정으로 대체한다.
- 변경 증거: `docs/reviews/registration-policy-20261002/`.
