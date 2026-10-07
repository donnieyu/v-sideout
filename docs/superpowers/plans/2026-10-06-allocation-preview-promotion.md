# 팀 배정·미리보기 기준안 승격 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. 실행 결과와 미확인 경계는 문서 하단 및 검증 보고서에 기록한다.

**Goal:** 검증된 임시 UI를 실제 팀편성 편집에 반영하고 기존 회원·신청·저장·공개 계약과 모바일 동작을 보존한다.

**Architecture:** 정적 HTML을 복사하지 않고 기존 SessionAllocation, ContinuousAllocation 및 후보 모델에 필요한 동작을 이식한다. 서버가 신청/공개 권한과 원본 상태를 결정하며 UI는 그 상태를 표현한다. 초안과 공개본은 분리한다.

**Tech Stack:** React/TypeScript, 기존 UI Button/Dialog, Vitest, Playwright, 기존 SIDEOUT API/D1.

**Spec:** `docs/design-review/allocation-actions-preview/README.md`; `docs/reviews/MOCKUP_PROMOTION_PARITY.md`의 이후 완료 기록 포함.

## Global Constraints

- 작업 루트: `/Users/donnieyu/DevSource/Personal/v-sideout/.worktrees/promotion-p1`. 기존 변경을 덮어쓰지 않는다.
- 4190은 가상 체험, 실제 앱은 별도다. 가상 회원·고정18명·임시 저장 코드를 제품으로 가져오지 않는다.
- 미배정 신청자는 전원 표시; 주→부→다른 포지션; 선택 가능한 세터 그룹 없음.
- 실제 전체 상태 검색, OP2/bench 저장 형식, 수동 추가 자리·기존 배정 보존.
- 1~2팀 초안 가능; 공개는 3~4팀·빈팀 없음·신청자 전원 배정 및 기존 서버 검증 통과 필요.
- 공개 후 신규 신청과 취소 불가. 미신청 회원의 공개 전 등록은 참석 확인과 서버 권한 검증 필요.
- 저장은 편집 유지, 공개는 참석 회원에게 공개된다는 확인/취소. 초안 저장으로 공개본 변경 금지.
- 자동 배치 대상/순서는 기존 알고리즘 유지. 신청자만 자동 배치하도록 바꾸는 제안은 별도 사용자 결정 후 작업한다.
- 기존 인증·프로필 원본의 파일 소유권을 침범하지 않는다. 의존 계약 변경은 먼저 담당 범위 확인.
- 실행은 동일 작업에서 순차 진행. 커밋은 변경 경계를 확인한 뒤 사용자 작업과 분리할 수 있을 때만 수행하며 전체 git add 금지.

## Review Focus

- 주포지션 후보 0명/미등록 프로필: 다른 미배정 신청자가 사라지지 않아야 한다 → Task 1.
- 추가 자리 진입과 OP2/일반 추가 자리 차이: 남은 신청자가 있는데 대기자를 먼저 제안하지 않아야 한다 → Task 1.
- 마지막 신청자와 빈팀/팀수 제한: 전원 배정과 공개 가능을 동의어로 잘못 표시하지 않아야 한다 → Task 2.
- 저장 실패·409·초안과 공개본 차이: 성공 오표시/입력 손실/공개본 오염이 없어야 한다 → Task 3.
- 실제 iPhone 키보드·safe area·뒤로가기: 후보와 이동 버튼, 미저장 보호가 유지되어야 한다 → Task 3.

## 파일 담당표

| 책임 | 파일 |
|---|---|
| 후보 분류·추가 자리/기존 슬롯 계약 | web/components/sideout/allocation/position-board-model.ts |
| 후보 목록·포지션 강조·선택/해제·스크롤 | web/components/sideout/allocation/continuous-allocation.tsx, allocation-layout.css |
| 편집/미리보기 전환·상태·버튼·자동배치 안내 | web/components/sideout/allocation/session-allocation.tsx, session-allocation.css |
| 서버 DTO·저장 기준·에러·이탈 | web/components/sideout/team-editor.tsx, use-edit-guard.ts, web/lib/sideout/team-editor.ts, web/lib/server/sideout-query.ts |
| 권위 있는 저장·공개 검증 | web/lib/sideout/team-draft.ts, team-publish.ts（기존 정책 유지） |
| 전체 인수 추적 | docs/reviews/MOCKUP_PROMOTION_PARITY.md 및 신규 검증 보고서 |

## Task 1: 후보 목록과 추가 자리 연결

**Files:** Modify position-board-model.ts, continuous-allocation.tsx, allocation-layout.css. Test web/tests/sideout-allocation-ui.test.tsx 및 sideout-extra-capacity.test.ts.

**Interfaces:** 기존 `allocationCandidateGroups(people:Candidate[], board:BoardTeam[], position:CourtPosition, scope:AllocationScope, query:string)`의 `{label,people}[]` 반환 계약 보존. 슬롯 id `6`=OP2와 일반 교대 슬롯을 구별한다. 회원 ID/참가 상태를 변경하지 않는다.

- [x] 후보 테스트에 주=2/부=2/기타=2 전체 6명 중복 없음, 세터의 센터/라이트/레프트 동일 분류, 주0명일 때 나머지 유지, 미등록/비활성, 검색 중 상태별 그룹 보존을 추가한다.
- [x] `cd web && npm run test:sideout -- tests/sideout-allocation-ui.test.tsx`로 새 요구가 현재 구현에서 실패하는지 확인한다.
- [x] 세터 예외 분류만 제거하고, 일치하는 주/부포지션 텍스트 및 그룹 숫자를 표시한다. 검색 중 참가 상태 구분을 유지한다. 같은 포지션 배정은 가능한 스크롤 유지, 포지션/검색/상태 전환은 상단 이동.
- [x] 추가 자리 진입은 신청자 탭을 기본으로 유지한다. 신청자0명이면 완료 상태와 대기자/미신청 탭의 선택 경로를 제공한다. OP2는 라이트 그룹 기준, 일반 교대는 추가 자리 후보로 표시한다. 새 자동등록/승격 규칙을 만들지 않는다.
- [x] 이름 선택은 원본 유지, X는 배정만 해제, 교체 후 기존 선수 후보 복귀, 추가 버튼은 빈자리만 생성하는 회귀를 검사한다.
- [x] 위 UI 테스트와 `npm run test:sideout -- tests/sideout-extra-capacity.test.ts` 통과 후 TEAM-10~13의 기준 변경과 증거를 기록한다.

## Task 2: 상태·버튼·미리보기 이식

**Files:** Modify session-allocation.tsx, session-allocation.css, team-editor.tsx, use-edit-guard.ts; 필요한 서버 저장/공개 메타데이터만 team-editor.ts 및 sideout-query.ts에 확장. Test sideout-team-editor.test.tsx, sideout-editor.test.tsx, sideout-query.test.ts, sideout-team-publish.test.ts.

**Interfaces:** `SessionAllocation`의 기존 `onSave(lineup:LineupRecord,publish:boolean):Promise<void>`, `onCancel():void`, `onDirty(dirty:boolean):void`, `EditorSnapshot` 유지. 새 상태 표시용 값은 서버 저장/공개본에서 유도하고 rosterRevision>1 또는 고정 인원으로 추정하지 않는다.

- [x] 1~2팀 전원 배정·3팀 빈팀·3~4팀 정상·빈 추가 자리·미배정 존재를 테스트하여 완료 안내/공개 가능 안내가 구별되는지 고정한다.
- [x] 관련 테스트를 실행하여 현재 버튼 배치/상태 요구가 충족되지 않는 항목을 확인한다.
- [x] 상단 저장, 단일 진행 상태, 미리보기의 배정하기/공개, 배정 화면의 이전/미리보기/다음을 이식한다. 신규 서버 메타데이터는 저장 여부/현재 공개본과의 차이를 실제 원본으로 제공하며 미제공 상태를 ‘미공개 변경’으로 추정하지 않는다.
- [x] 기존 취소를 제거하기 전에 헤더 뒤로가기·브라우저 뒤로가기·다른 화면 이동의 dirty 확인 및 명시적 폐기 시 캐시 제거를 공통 처리한다. 저장 성공 후 위치/모드/스크롤과 편집 지속을 보존한다.
- [x] 미리보기 선택 테두리는 제거하되 선택 팀 스크롤 유지. 기본 빈자리/선택적 추가 빈자리/배정 완료를 README 색·점선·문구 기준으로 표현한다. 실제 팀 추가·삭제·추가 자리 삭제는 유지한다.
- [x] 자동 배치 아이콘과 사전 확인 유지. 미배정 신청자0명에는 무변경 안내. 새 정책 결정 없이 기존 자동 배치 알고리즘을 변경하지 않는다. 미배정 신청자는 있으나 맞는 자리/프로필이 없으면 완료로 표시하지 않는다.
- [x] 테스트 통과 후 320/390/423/1024px의 일부 배정/완료/공개 제한 화면을 촬영하고 TEAM-14~18 인수 기록을 남긴다.

## Task 3: 서버·모바일 통합 인수

**Files:** Existing tests sideout-team-editor.test.tsx, sideout-team-draft.test.ts, sideout-team-publish.test.ts, sideout-team-publication.test.ts, sideout-extra-capacity.test.ts. Evidence docs/reviews/allocation-preview-promotion/ (신규).

**Interfaces:** 기존 저장/공개 명령·revision·commandId 재시도·서버 오류 계약 보존. 서버 정책을 통과했을 때만 성공 상태를 확정한다.

- [ ] 18/19/21명×3팀, 24/28명×4팀, 1~2팀 초안, 전원 배정했지만 빈팀인 경우를 실제 저장/조회 왕복으로 검사한다. 추가 자동 자리와 수동/배정된 자리 보존도 확인한다.
- [ ] 저장 실패/409/재시도/최신조회, 저장 후 편집 지속, 새로고침 복원, 공개 취소 불변, 공개본과 초안 분리, 공개 후 추가 신청 차단을 검사한다.
- [x] `cd web && npm run test:sideout`와 `npm run build`를 실행한다. 프로젝트의 quality:check 사용 가능 여부를 확인하고 정의되어 있다면 기존 규칙에 따라 동일 작업 ID로 실행한다.
- [ ] 브라우저 화면·동작 증거를 기록한다. 실제 iPhone에서는 키보드 열린 검색/지우기, 후보 내부 스크롤, 하단 safe area, 미리보기 왕복, 저장 유지, 뒤로가기 보호를 사용자와 확인한다. 브라우저 에뮬레이션 결과와 분리한다.
- [ ] 남은 실패/미검증을 명시하고 MOCKUP_PROMOTION_PARITY의 해당 TEAM/NAV/DATA 항목만 갱신한다. 완성 조건: 자동 검사·실제 화면·서버 왕복·실기기 결과에 미해결 중대 문제가 없음.

## 이후 대기열 — 이번 구현 묶음에 포함하지 않음

1. 경기 순서 수정 MATCH-02~06: 마스터/운영자 자식 수정 화면, 취소/저장, 신입 포함 토글·2~4팀·라운드 사이 배치, 모바일 드래그/키보드 이동, 20분 시간과 초과 안내, 초안/공개 권한. 현재 기본 생성 및 조회와 구분해 별도 계약/계획 작성 후 구현한다.
2. 미등록 포지션 입력: 인증/프로필 담당과 원본 편집 경로의 소유권부터 확인. 이름/과거 편성으로 추정 금지.
3. 전체 목업 전환 최종 인수: HOME/DETAIL/ROSTER/TEAM/MATCH/NAV/DATA 목록별 구현·권한·저장·취소·모바일 증거를 대조한다.

## 별도 결정이 필요한 제안

- 자동 배치를 ‘신청자만’ 대상으로 바꿀지: 현재 알고리즘은 신청자 다음 대기자까지 처리한다. UI 정리와 별도 정책 결정이다. 결정 전에는 기존 정책 유지.
- OP2를 포지션 없는 추가 자리로 바꿀지: 현재 계획은 OP2를 유지한다. 이름만 바꾸어 저장 계약과 불일치시키지 않는다.

## 준비 상태

- [x] 임시 UI 기준안·이전 기록 분리.
- [x] 다섯 브라우저 검증 통과와 캡처 확인.
- [x] 파일 담당/의존/순서/완료 조건 작성.
- [x] 요구사항 및 Review Focus를 각 Task에 대조. 미확정 정책은 기존 동작 유지로 경계 지정.
- [x] Task 1 실제 앱 반영 완료.

## 2026-10-06 실행 결과

Task 1·2 완료. Task 3의 18~28명 서버 왕복·브라우저·자동 검사와 실제 iPhone 핵심 3항목 확인 완료. 1~2팀/빈팀 제한은 자동 테스트로 검증했고 별도 실서버 왕복은 수행하지 않았다. iPhone safe area·내부 스크롤·뒤로가기의 별도 확인은 전체 인수로 이월한다. 위 복합 체크박스는 모든 세부 검증을 수행한 것으로 오인하지 않도록 미확인 항목이 있으면 유지한다. [변경/검증/판단 보고서](../../reviews/allocation-preview-promotion/report.md). 후속 경기 순서 편집은 별도 묶음이며 이번 변경으로 완료 표시하지 않는다.

- [x] 실제 iPhone 검색 키보드 상태 후보 선택·배정↔미리보기·저장 후 유지: 사용자 “세 항목 모두 정상”.
- [x] 이번 구현 묶음 결과 및 남은 검증을 보고서와 parity 문서에 기록.
