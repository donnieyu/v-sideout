# 경기 순서 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. 기존 사용자가 순차 구현을 승인했다. 체크박스로 증거를 기록한다.

**Goal:** 승인된 경기 순서 수정 흐름을 실제 앱에 연결한다.
**Architecture:** MatchPlanRecord를 유지하며 순수 편집 모델/서버 명령/자식 편집 UI로 나눈다. roster CAS로 팀과 순서의 일관성을 보존한다.
**Tech Stack:** React/TypeScript/Zod, 기존 D1 write store, Vitest/Playwright. 새 의존성 없음.
**Spec:** ../specs/2026-10-06-match-editor-promotion-design.md

## Global Constraints
- 3팀 3라운드, 4팀 1라운드, 20분 경기, 신입 2~4팀. 100경기 상한.
- 사용자 승인: 같은 팀 ID 집합이면 저장 즉시 공개 경기 반영. 비공개 팀 ID를 공개 경기로 노출하지 않음.
- 기존 인증/참가/팀 저장 계약 보존. 원본 목업 수정하지 않음. dirty worktree의 이전 변경을 커밋/덮어쓰기하지 않음.

## Review Focus
- 팀 수/ID 변경 중 경기 저장 → roster/session CAS 거절, 초안 보존.
- 공개 뒤 다른 팀의 초안을 저장 → 새 팀 경기 명칭/ID 일반 회원 노출 차단.
- 응답 손실 후 동일 명령 재시도 → 한 번만 적용.
- 터치 pointercancel/화면 이동/드래그 중 저장 → 잘못된 순서 커밋 방지.
- 신입 토글·팀수·일반 경기 목록 → 일반 대진 누락 없이 원본 순서 유지.

### Task 1: 편집 모델
Files: web/lib/sideout/match-plan.ts, web/lib/sideout/match-editor.ts, web/tests/sideout-match-plan.test.ts.
Interfaces: MatchPlanRecord 유지. toggleRookieMatches, setRookieTeamCount, addRookieMatch, setRookieMatchPair, moveMatchTo, removeRookieMatch, matchTimes, validateMatchPlan.
- [x] 순서 이동/신입 토글/3~4 신입팀/일반 대진 무결성 테스트 RED.
- [x] 최신 목업 모델을 실제 팀 ID에 맞춰 이식; 기존 generateTeamMatches 보존. 테스트 GREEN.

### Task 2: 원자 저장과 권한
Files: web/lib/server/sideout-matches.ts, sideout-dependencies.ts, sideout-query.ts, web/lib/sideout-client.ts, web/app/api/sessions/[id]/matches/route.ts, web/tests/sideout-match-storage.test.ts.
Interfaces: MatchEditorView(sessionRevision,rosterRevision,teams,plan,saveVisibility), MatchSaveInput(action:save,sessionRevision,plan), 기존 WriteEnvelope/WriteResult.
- [x] 권한/POST origin/시간/revision/retry/공개 분리 테스트 RED.
- [x] 승인된 공개 정책으로 GET/POST 구현. 참가/선수 원본 변경 없이 경기 계획만 저장. 테스트 GREEN.

### Task 3: 화면과 인수
Files: web/components/sideout/match-editor.tsx, match-editor.module.css, match-list.tsx, session-detail.tsx, web/app/session/[id]/matches/edit/page.tsx, web/lib/sideout/navigation.ts, web/tests/sideout-match-editor.test.tsx.
Interfaces: SideoutShell/SideoutClient/useEditGuard 재사용, 위 API만 소비.
- [x] 취소/저장/이동/신입/충돌 복구/시간초과 테스트 RED.
- [x] 상단 취소/저장 자식 페이지, 터치/마우스 손잡이·키보드 이동 구현. 상세 수정 링크/안전한 return URL 연결. GREEN.
- [x] 전체 SIDEOUT/회원 UI·타입·빌드, 실제 API 및 320/390px 브라우저 검증.
- [x] 독립 리뷰 및 중요 문제 보완, 보고서/parity 갱신. 실제 iPhone 별도 확인.

실제 iPhone 드래그 인수는 사용자 응답 대기이며 자동 검증과 구별한다. 결과/독립 검토 보완은 ../../reviews/match-editor-promotion/report.md 참조.
