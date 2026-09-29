# 참가 명단 SSOT 구현 계획

> **For agentic workers:** Use `superpowers:executing-plans` for sequential native execution after implementation is requested. Steps use checkbox syntax. This document is a plan, not implementation approval. Independent review is a separate completion gate.

**Goal:** 신청·대기·취소 및 팀 공개의 상태를 회차별 원본에서 처리하여 홈·명단·팀편성·본인 버튼이 같은 결과를 보여주게 한다.

**Architecture:** 참가 기록과 초안/공개 편성을 한 회차 상태의 명령으로 변경하고, 화면은 공통 조회 함수를 사용한다. 일정·마감·관리 권한은 기존 원본에서 명령 실행 시 읽으며 별도 복제하지 않는다. 로컬 목업의 구조 개선이며 서버 저장·인증·기기간 동기화 구현은 아니다.

**Tech Stack:** 현재 React 19 / TypeScript / Vitest / Testing Library / shadcn·Radix 유지. 새 의존성 불필요.

**Spec:** [직전 SSOT 검토서](/Users/donnieyu/DevSource/Personal/v-team-builder/docs/design-review/shadcn-prototype/ROSTER_SSOT_REVIEW_2026-09-29.md), [독립 검토](/Users/donnieyu/.codex/review-runs/2026-09-29-roster-ssot-plan-review/report.md). 아래 확정/미결정 구분을 원문보다 우선한다.

## Global Constraints

- 작업 루트: `/Users/donnieyu/DevSource/Personal/v-team-builder/docs/design-review/shadcn-prototype`. 이하 파일은 이 루트를 기준으로 명시한다.
- `web/`, A 비교안, 편성 알고리즘, 확정된 모바일 배치·내비게이션 디자인은 변경 범위 밖이다.
- **공개 후 본인·운영진·마스터의 신청 취소는 모두 불가.** 화면뿐 아니라 공통 명령에서 거부한다.
- 최초 공개 여부는 초안 저장·일정 수정으로 되돌리지 않는다. 재공개 전에도 잠금 유지.
- 마감 후 본인 신청 취소 불가. 공개 후 또는 마감 후 새 신청은 운동 시작 전까지 대기 접수.
- 미배정 수는 신청자 중 미배정인 사람만 센다. 대기자·미신청 회원은 별도 집계한다.
- 일반 회원의 소속별 명단 공개 범위와 대기자의 공개 편성 열람 조건을 유지한다. 실력·주/부 포지션은 운영용 정보다.
- 참가 기록과 배정 상태는 별개다. 초안 저장만으로 대기자를 신청자로 승격하지 않는다.
- 기존 제품 파일은 이번 기획 턴에서 수정하지 않았다. 다음 실행 시 최신 파일과 정책을 재확인한다.

## Review Focus

1. 취소 이력이 있는 회원의 대기 등록→재공개: 이름·인원·버튼·열람 권한이 함께 바뀌어야 한다. 작업 1·3에서 검사.
2. 편집 중 참가 취소·권한·일정 변경: 오래된 편성 저장이 취소된 선수를 되살리면 안 된다. 작업 1·3에서 검사.
3. 권한 미리보기와 대표 샘플 전환: 전자는 참가 상태 유지, 후자는 정해진 범위 재초기화. 작업 2에서 검사.
4. 등록·공개 거부: 일부 인원만 반영되거나 편집을 닫고 성공으로 표시하면 안 된다. 작업 1·3에서 검사.
5. 회차·사용자별 조회: 다른 회차 오염, 일반 회원에게 게스트 이름 또는 미공개 초안 노출이 없어야 한다. 작업 2·4에서 검사.

## 1. 검토 결론과 범위

기획 방향은 맞지만 단순한 버튼 수정이 아니다. `main.tsx`의 `applied`, `waiting`, `manualEntries`, `excludedApplicants`, `teamRecords` 및 fixture 추론을 함께 교체하는 **중상 난이도 상태 리팩터링**이다. 핵심 위험은 코드 양보다 조회·변경 경로 일부가 옛 원본을 계속 사용하는 데 있다.

| 접근 | 이점 | 한계 | 판단 |
|---|---|---|---|
| 조건문으로 개별 문제만 수정 | 공개 후 취소 경로를 빠르게 닫을 수 있음 | 과거 취소 이력·공개 승격 문제와 중복 원본은 남음 | 긴급 차단만 필요할 때 별도 작은 패치 |
| 로컬 참가 원본·공통 명령으로 통합 | 등록 주체와 화면에 관계없이 같은 상태 전이를 검사 가능 | 초기화와 기존 UI 연결을 함께 정리해야 함 | 이번 권고 |
| 서버·이벤트 이력·동시성까지 한 번에 구축 | 실제 여러 사용자의 일관성을 설계 가능 | 인증·DB·API까지 범위 확대, 목업 검토 지연 | 후속 서비스화 단계 |

이번 완료 표현은 **“로컬 목업 내 명단 일관성 확보”**로 한정한다. “모든 사용자·기기에서 실시간 SSOT 보장”은 서버 작업 후에만 가능하다.

## 2. 정책 결정표

| 항목 | 구분 | 실행 기준 / 권고 |
|---|---|---|
| 공개 후 신청 취소 | 확정 | 역할과 등록 출처에 관계없이 거부, 상태 불변 |
| 공개 전 취소된 회원의 초안 배정 | 정합성 조건 | 참가 취소와 초안 제거를 하나의 변경으로 처리 |
| 대기자를 공개 팀에 포함 | 정합성 조건 | 공개 성공 때만 신청자로 승격. 공개본·인원·열람 권한 함께 변경 |
| 공개된 선수의 배정 해제 | **결정 필요** | 신청 취소와 다른 행동. 이동만 허용할지, 팀 밖에 남아도 신청자 자격은 유지할지 선택 필요. 기존 질문 답변 전 새 제한을 확정하지 않음 |
| 마감 후·첫 공개 전 운영진 취소 | 기존 동작, 정책 미확정 | 현재 허용을 유지하는 방향 권고. 새 제한은 별도 결정 |
| 공개 후 대기 철회 | **해석 확인 필요** | 신청 취소 금지와 동일하게 잠글지 별도 철회를 둘지 확인. 이번 기획에서 허용 기능을 신설하지 않음 |
| 미신청 선수를 편성 화면에서 선택 | **등록 확정 시점 결정 필요** | 권고: 편집 중 선택은 임시 상태, 저장/공개 때 참가자 추가를 명시하고 편성과 함께 반영. 편집 취소 시 등록도 발생하지 않음 |
| 명단 모달의 직접 복수 추가 | 이미 승인된 경로 | 추가 버튼 확정 시 즉시 등록. 이후 팀편성 편집을 취소해도 이 등록은 유지 |
| 재신청의 순번·우선 자격 | 후속 정책 | 취소 전 순번을 복구할지 새 시각을 쓸지 확인. 이력/시각은 보존하되 이번 단계에서 새로운 우선권 알고리즘을 만들지 않음 |

미신청 선수 처리의 대안은 “명단 모달에서 먼저 등록한 뒤 배정”이다. 구현은 단순하지만 기존의 편성 중 직접 선택 흐름을 좁힌다. 따라서 임시 선택→명시적 저장을 권고하되 사용자 결정 전 UI에서 기존 경로를 제거하지 않는다. 미결정 정책은 작업 1의 확정 전이 구현을 막지 않지만 **관련 동작을 화면에 연결하는 작업 3의 완료 조건**이다.

## 3. 데이터와 명령 계약

`SessionRoster`는 `sessionId`, `revision`, `participants: Record<MemberId, Participation>`, `teams: TeamRecord`, `firstPublishedAt: string | null`을 소유한다. `Participation`은 `status: 'applied' | 'waiting' | 'cancelled'`, 등록 출처·처리자·등록/변경 시각을 갖는다. 기존 fixture ID는 어댑터로 유지하고 실제 계정 ID 전환은 서비스화 단계에서 한다.

일정 정보는 `RegistrationRecord`와 기존 회차 조회가 계속 소유한다. 명령 실행 컨텍스트는 최신 회차의 시작/마감, 실행자와 관리 권한, 주입된 `now`를 받는다. `SessionRoster`에 마감·권한을 다시 저장하지 않는다. 목업의 `REVIEW_NOW`는 테스트 가능한 시계로 주입하고 서버 시각이라고 표현하지 않는다.

공통 인터페이스:

```ts
executeRosterCommand(state: SessionRoster, command: RosterCommand,
  context: RosterCommandContext): RosterCommandResult
// 성공: { ok: true, next: SessionRoster }
// 거부: { ok: false, code: RosterErrorCode } — 입력 state는 변경하지 않음

selectRosterView(state: SessionRoster, viewer: RosterViewer,
  members: MemberDirectory): RosterView
// applicants, waiters, counts, unassignedApplicants, visibleRoster,
// selfStatus, canViewPublishedTeams, canCancelSelf, canCancelMembers
```

명령: `REGISTER_SELF`, `ADD_MEMBERS`, `CANCEL_PARTICIPATION`, `SAVE_DRAFT`, `PUBLISH_TEAMS`. 모든 명령은 회차·실행자와 `expectedRevision`을 포함한다. 실제 실행 경계에서 최신 상태를 읽어 검사·반영하며 읽기와 반영 사이에 다른 명령이 끼지 않게 한다. 로컬 버전 검사는 서버 동시성 구현의 대체가 아니다.

- `ADD_MEMBERS`: 목록 중복 제거, 기존 참가자는 중복 생성하지 않음. 유효하지 않은 ID·권한·버전 오류가 있으면 전체 거부. 결과 오류를 사용자에게 표시.
- `CANCEL_PARTICIPATION`: 권한·마감·최초 공개 검증 후 참가 상태와 초안에서의 제거를 함께 반영. 공개본을 임의 재생성하지 않음.
- `SAVE_DRAFT`: 구조·중복·참가 자격 검증. 공유본·최초 공개 잠금·대기 상태 유지. 미신청 직접 선택은 위 정책 확정 후 통합.
- `PUBLISH_TEAMS`: 검증 성공 시 초안/공개본과 포함된 대기자의 승격을 하나의 결과로 반환. 처음 성공한 경우만 `firstPublishedAt` 기록. 실패하면 어느 데이터도 변경하지 않음.
- 화면은 `ok: true`일 때만 성공 알림·dirty 해제·화면 이동. 거부 시 입력·현재 경로 유지. 미등록·취소 회원을 조용히 참가자로 복원하지 않음.

취소된 참가 기록을 목록에 노출하지 않되 이력으로 남긴다. 팀 배정 여부로 참가 자격을 역추론하지 않는다. 회차 인원수는 참가 원본에서 계산하며 장식용 숫자를 별도 보존하지 않는다.

## 4. 파일 구성과 작업 순서

### 작업 1 — 상태·명령·조회와 순수 검사 (난이도: 높음)

**파일:** 신규 `src/roster-state.ts`, `src/roster-selectors.ts`, `src/roster-state.test.ts`; 수정 `vitest.allocation.config.ts`의 명시적 테스트 include. `team-model.ts`의 `Lineup/TeamRecord`는 재사용한다.

**입출력:** 위 `executeRosterCommand`, `selectRosterView` 및 모든 연관 타입을 정의한다. `RosterViewer`는 회원 ID·소속·해당 회차 관리 권한을 명시한다. 저장하는 개인정보를 화면 권한과 혼동하지 않는다.

- [ ] 거부 시 원본 불변, 공개 후 모든 역할 취소 거부, 본인/대리 등록의 동일 취소 결과, 취소 시 초안 제거 테스트를 먼저 작성하고 실패를 확인한다.
- [ ] 초안 저장은 대기 유지, 공개 성공은 대기→신청 승격, 중복 등록/배정 거부, 오래된 revision 거부, 여러 명 추가 실패 시 부분 반영 없음 테스트를 작성한다.
- [ ] 확정된 정책의 순수 명령·조회 구현. 미결정 정책은 테스트 통과를 위해 임의 기본값으로 확정하지 않는다.
- [ ] `npx vitest run --config vitest.allocation.config.ts src/roster-state.test.ts` 실행. 새 검사 모두 PASS가 완료 조건.

**검토 지점:** 화면 변경 없이 상태 전이 계약을 검토할 수 있다. 다음 작업 하나로 권고하는 범위다.

### 작업 2 — 샘플·신규 회차 초기화 (난이도: 중간)

**파일:** 신규 `src/roster-fixtures.ts`, `src/roster-fixtures.test.ts`; 입력 참고 `src/model.ts`, `src/registration-model.ts`, `src/team-model.ts`; 테스트 include 추가.

**입출력:** `createRosterSeed(sessions: Session[], scenario: PreviewState, now: string): Record<string, SessionRoster>`와 신규 회차용 `createEmptyRoster(sessionId: string): SessionRoster`. 작업 1 타입을 사용한다.

- [ ] 공개/미공개/미신청 대표 상태별 ID 중복 없음·공개 선수와 참가 기록 일치·count 실제 합계 테스트를 먼저 작성한다.
- [ ] 과거 참석 기록과 공개본 보존, 신규 회차 빈 상태, 다른 회차 수정의 비간섭 테스트를 작성한다.
- [ ] fixture fallback을 매번 조회하지 않고 초기화 때만 사용하도록 어댑터를 구현한다. 공개 샘플은 최초 공개 이력을 명시적으로 seed한다.
- [ ] 대표 상태 선택은 “데모 초기화”로 명확히 취급해 참가·편성 상태 전체를 해당 시나리오로 재생성한다. 권한 전환·일정 수정·주간 이동은 이를 실행하지 않는다. dirty 이탈 확인은 기존 공통 경로를 사용한다.
- [ ] `npx vitest run --config vitest.allocation.config.ts src/roster-fixtures.test.ts src/roster-state.test.ts` PASS 확인.

### 작업 3 — 화면 연결과 옛 상태 제거 (난이도: 높음)

**파일:** `src/main.tsx`, `src/roster-model.ts`, `src/team-model.ts`, `src/inline-teams.tsx`, `src/session-allocation.tsx`, `src/session-allocation-model.ts`; 기존 `src/roster.test.tsx`, `src/roster-transitions.test.tsx`, `src/session-editor.test.tsx` 수정.

**입출력:** 실제 명령 처리 함수 `dispatchRosterCommand(command: RosterCommand): RosterCommandResult`. `InlineTeams`/`SessionAllocation`의 `onSave(lineup: Lineup, publish: boolean)`는 위 성공/거부 결과를 반환하도록 변경한다. 편집 시작 revision을 보존하며 마감·권한은 실행 시 최신 값을 사용한다.

- [ ] 정책 결정표의 미결정 항목 중 화면 연결에 필요한 사항을 확인하고 문서에 확정 내용을 기록한다. 기존 회원 접근 권한을 확대하거나 축소하지 않는다.
- [ ] 취소→첫 공개→대기→운영진 배정·재공개의 합법적 경로에서 신청/대기 명단·총원·본인 버튼·공개 열람을 함께 검증하는 실패 테스트를 작성한다.
- [ ] 공개 후 운영진 취소 UI 부재와 직접 명령 거부, 편집 중 취소된 선수의 오래된 저장 거부, 거부 후 입력과 경로 유지 테스트를 작성한다.
- [ ] `main.tsx`에서 회차 원본을 보유하고 모든 참가/편성 변경을 공통 명령으로 연결한다. 명령 검증은 클릭 시점의 오래된 closure가 아닌 최신 상태를 사용한다.
- [ ] 홈 인원·명단·후보·버튼·공개 권한을 공통 조회로 교체한다. 기존 `applied/waiting/manualEntries/excludedApplicants` 상태와 실시간 fixture 추론 경로를 한 번의 연결 변경에서 제거한다. 새 원본과 옛 원본을 동시에 쓰는 중간 상태를 배포하지 않는다.
- [ ] `onSave` 거부 시 성공 표시·화면 이탈·dirty 해제가 일어나지 않도록 연결한다. 명단 직접 추가와 편집 임시 선택의 저장 경계를 확정 정책대로 반영한다.
- [ ] `npx vitest run --config vitest.allocation.config.ts src/roster.test.tsx src/roster-transitions.test.tsx src/session-editor.test.tsx src/roster-state.test.ts src/roster-fixtures.test.ts` PASS 확인.

### 작업 4 — 회귀 확인·문서·독립 검토 준비 (난이도: 중간)

**파일:** 기존 관련 검사와 `ROSTER_SSOT_REVIEW_2026-09-29.md`, 본 계획의 완료 체크, 새 `ROSTER_SSOT_IMPLEMENTATION_HANDOFF.md`.

- [ ] 권한 전환 시 상태 보존, 샘플 재초기화, 소속별 명단/게스트 수 공개 범위의 통합 검사를 실행한다. 앱 내부 객체 검증뿐 아니라 렌더된 화면 값도 대조한다.
- [ ] `npx vitest run --config vitest.allocation.config.ts` 및 `npm run build` 실행. 공유 참가 모듈과 내비게이션에 영향이 있으므로 설정에 포함된 관련 회귀 묶음을 최종 한 번 실행한다.
- [ ] 로컬 샘플에서 모바일 390px와 데스크톱으로 명단 추가·취소 확인창·공개 잠금·대기 승격·저장 거부 후 편집 유지 확인. 모바일 스크롤·하단 버튼·포커스·브라우저 뒤로가기 확인. 실제 아이폰 검증 여부는 별도 기록한다.
- [ ] 검토 인계 문서에 변경 파일, 재현 경로, 테스트 명령/결과, 화면 증거, 확정/미결정 정책, 서버 미구현 경계를 기록한다. 독립 검토자는 공개 취소 금지와 출처별 동일 동작을 우선 검증한다.

현재 루트는 Git 저장소가 아니므로 위 단계의 산출물·파일 해시·검사 결과로 경계를 남긴다. 실행 전에 Git 상태를 다시 확인하며 커밋 기록을 꾸며내거나 임의로 저장소를 초기화하지 않는다.

## 5. 후속 범위와 모델 권고

신청 상한·소속회원 우선 편성 보장은 원래 요구지만 현재 form 설정만으로 보장되는 기능이 아니다. 이번 로컬 SSOT 전환에서 새 규칙을 추측해 구현하지 않고 별도 정책 명세와 검사로 이어간다. 실제 로그인·회원 발급·서버 권한·DB 트랜잭션·버전 충돌·요청 중복 방지·기기간 갱신은 서비스화 작업으로 분리한다.

**다음 구현 단위:** 작업 1의 정규화 상태·공통 명령/조회와 순수 검사. **권고 모델/노력:** `gpt-6-sol / high`. 명령 경계가 정리되면 중간급 모델로 순차 실행할 수 있다는 판단이며 실제 비교 실험으로 입증한 최적값은 아니다. 작업 3의 통합 검사가 실패하거나 미결정 정책이 얽히면 난이도를 다시 평가한다.

**실행 방식 권고:** 동일 세션에서 순차 구현하고 연결 완료 후 독립 검토. 상태·조회·초기화가 밀접해 여러 작업자가 동시에 수정하는 이점이 작다. 작업별 별도 구현자·검토자를 두는 방식은 중간 검토가 늘지만 문맥 전달과 경계 조율도 늘어난다.

이번 턴에는 기획·독립 검토만 수행했다. 직전의 정책 검사 **5개 중 2개 통과·3개 실패**는 기존 증거이며 이번에 재실행한 결과가 아니다. 위 체크박스는 아직 구현 완료 표시가 아니다.

## 실행 결과 · 2026-09-29

위 문장의 상태는 계획 작성 당시 기록이다. 이후 같은 작업 흐름에서 작업 1→2→3→4 순으로 로컬 목업 구현과 검증을 마쳤다. 세부 변경, 37개 검사와 빌드 결과, 브라우저 확인 범위, 남은 정책은 [구현 인계서](../../design-review/shadcn-prototype/ROSTER_SSOT_IMPLEMENTATION_HANDOFF.md)에 기록했다. 단, 실제 iPhone·서버·다중 기기 검증은 완료 조건에 포함하지 않으며 후속 작업으로 남긴다. 공개된 팀에서 선수를 배정 해제했을 때 참가 자격 유지 등 계획의 미결정 정책은 현행 동작으로 보존했으며 새 제품 규칙으로 확정하지 않았다.
