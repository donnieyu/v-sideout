# 승인된 편집 화면 및 운동 공지 적용

> For agentic workers: use superpowers:executing-plans, inline execution in the current worktree.

**Goal:** 승인된 상단 작업/하단 복귀, 등록 본문, 공지 읽기·수정 흐름을 실제 앱에 적용한다.
**Architecture:** 기존 서버·권한·저장 계약을 유지하고 공통 shell/editor controls 및 해당 화면의 표시만 확장한다. 등록 본문은 기존 일정 수정과 분리한다. 공지 데이터는 같은 session.notice를 사용한다.
**Tech Stack:** React, TypeScript, CSS Modules, Vitest, Playwright.
**Spec:** docs/reviews/mobile-navigation-phase1-20261010/CONTINUE-HERE.md 및 2026-10-12 사용자 승인.

## Global Constraints
- 기존 미커밋 작업은 승인된 기준이다. 사용자 승인으로 이 작업 트리에서 이어서 수정하며 일괄 커밋/초기화/머지하지 않는다.
- API·권한·팀 공개 조건·신청 규칙·2000자 공지 제한 불변.
- 팀/일정/경기 저장 후 편집 유지. 복귀 시 미저장 확인과 임시 초안 정리.
- 현재 회원 데이터는 시각 검증에서 변경하지 않는다. 브라우저 쓰기 검증은 가로챈 시험 응답 또는 테스트 fixture 사용.

## Review Focus
- 저장 중 복귀·메뉴 이동으로 중복 저장/초안 유실이 생기지 않을 것.
- 320px, 긴 이름, 모바일 키보드, 모달에서 고정 조작이 입력·내용을 가리지 않을 것.
- 공지 없음/긴 공지/일반 회원/운동 시작 이후의 표시와 수정 권한.
- 최초 준비 저장 후 URL·복귀 목적지·초안 키를 갱신하고 다음 저장은 같은 일정 수정일 것.
- 공개 취소 성공/실패·경기 드래그 동안 조작·복귀 일관성.

## Task 1: 편집 작업 및 복귀 통합
Files: shell.tsx, editor-controls.tsx/css, use-edit-guard.ts, team-editor.tsx, allocation/session-allocation.tsx/css, match-editor.tsx, sideout.module.css; tests: sideout-shell, sideout-edit-guard, sideout-allocation-ui, sideout-match-editor.
- [x] 승인된 조작 개수/위치, readonly, 차단된 복귀 및 이탈 정리 검사를 추가하고 실패 확인.
- [x] shell floatingReturn에 처리중/드래그 숨김 지원. 모바일 키보드·모달 시 복귀 숨김. 저장/공개는 상단, 팀 하단 공개 nav 제거. 일정/경기 취소 제거.
- [x] 관련 테스트 통과. 이동 목적지·주/필터 및 저장 의미 유지.

## Task 2: 등록 폼과 공지 수정 직접 진입
Files: schedule-editor.tsx, new schedule-form component/css as needed; tests: sideout-schedule-editor.test.tsx.
- [x] 준비/모집 저장 후 편집 및 URL, 초기 요약·펼침·기존 notice 탭 직접 진입, 이탈 초안 정리 실패 검사.
- [x] 등록: fixed shell+action header, one scroll body, 기본 장소/시간 요약과 펼침, 마감 직접 입력, 우선/정원 summary controls, inline notice. 부족한 필수값은 자동 펼침 및 오류 위치 표시.
- [x] 기존 일정 수정 폼 구조 보존, ?section=notice 직접 진입 지원. 복귀는 save 전 home/후 detail.
- [x] 테스트와 typecheck 통과.

## Task 3: 공지 읽기 및 연결
Files: notice-dialog.tsx, new notice-content component/css as needed, home.tsx, session-detail.tsx; tests: sideout-schedule-v4, sideout-read-parity, sideout-notice.
- [x] 빈 공지 숨김/운영자 추가, 모달 중복 정보 없음, 상세 펼침 및 수정 권한 검사 실패 확인.
- [x] 홈 공지만 모달, 운영자 시작전 공지 수정 링크. 상세는 본문 3줄/펼침(실제 넘침일 때만), 동일 편집기의 공지로 연결. 공개 회원 입장 시간 보존.
- [x] 관련 검사, 전체 SIDEOUT/member 테스트, typecheck, 변경 파일 lint, build.

## Task 4: 실제 확인 및 인수 기록
- [x] 최신 빌드로 로컬 서버 갱신. 320/390/1280px 처음/실제 끝/등록 스크롤/모달/드래그/공지 연결/고정 복귀 캡처와 측정.
- [x] 독립 리뷰 후 필요한 수정 및 검증. 사용자에게 현재 접속 URL과 물리 iPhone 확인 범위 보고.

## Execution notes
Baseline: 371 SIDEOUT tests passing. Existing linked worktree feat/promotion-p1 at 9633597. 승인된 작업 실행 요청으로 추가 계획 승인 질문 없이 진행한다. 커밋에는 기존 다른 변경이 섞이므로 이번 작업은 검토 가능한 미커밋 상태로 보존한다.

결과: ../../reviews/approved-editors-20261012/REPORT.md 참조. 실제 iPhone 키보드·안전영역 검증은 별도 사용자 확인으로 남겨둔다. 기존 경기 편집 lint 오류는 baseline 동일, 전체 lint 통과를 주장하지 않는다.
