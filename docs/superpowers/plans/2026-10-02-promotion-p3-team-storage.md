# SIDEOUT P3-1 팀편성 저장 기반 Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for sequential implementation. Do not edit auth-rotation or approved prototype sources.

**Goal:** 확정한 팀편성 UI를 연결할 서버 초안 조회/저장을 제공하고 공개본·참가 원본의 경계를 검사한다.
**Architecture:** 기존 인증과 회차/roster revision, idempotency receipt를 재사용한다. 화면 및 포지션 프로필 인수 전에 독립 검증 가능한 서버 저장 단위를 완성한다.
**Tech Stack:** TypeScript/Zod/D1/Vitest.
**Spec:** ../specs/2026-09-30-mockup-promotion-design.md 및 최신 사용자 공개 후 신규 등록 금지 결정.

## Global constraints / ownership
- 이 작업은 promotion-p1의 신규 sideout 모듈/API/tests만 소유. 인증 테이블/마이그레이션/다른 작업 트리/동결 목업 편집 금지.
- 모든 신청자는 공개 전에 배정 필요. 2026-10-03 사용자 확정: 3~4팀만 공개 가능하고, 1~2팀은 초안 저장만 허용한다. 공개 명령은 이번 저장 단위에서 노출하지 않으며 다음 구현에서 UI와 서버 양쪽에 이 조건을 적용한다.
- 회원 주/부포지션 원본은 auth-rotation의 member_position_profiles에 존재하며 현재 미인수. 동일 데이터를 별도 저장하지 않는다. 편집 UI/자동배치 연결은 다음 단위.
- 미신청 회원은 명시적 확인 ID와 실제 새 등록 ID가 일치할 때만 공통 신청 규칙으로 등록한다. 공개 후는 차단, 취소 회원은 명단 재등록을 먼저 거친다.
- 공개본/공개 경기/최초공개시각은 초안 저장으로 바뀌지 않는다. 빈 팀과 빈자리는 초안 허용, 중복 선수/자리/잘못된 포지션은 거절.

## Review focus
- 공개 이후 미신청 배정으로 신규 접수를 우회하는지.
- 명단 취소 또는 권한 회수가 저장 직전에 발생해도 stale draft가 덮어쓰지 않는지.
- 같은 팀 수라도 실제 ID가 다르면 경기 순서가 새 팀을 참조하는지.
- 미신청 확인 목록 과다/누락 또는 취소 회원 재편성이 원본을 오염시키는지.
- 일반 회원이 팀 편집 GET으로 비공개 초안에 접근할 수 없는지.

## Task 1 — Pure domain
- [x] `web/lib/sideout/team-draft.ts`: strict input, 1~4 teams, semantic court/op2/bench slot validation, unique IDs, participant transitions.
- [x] `web/lib/sideout/match-plan.ts`: actual team IDs, 3팀3라운드+신입사이/4팀1라운드+신입앞뒤; 1~2팀은 경기초안 null. 이후 사용자 결정에 따라 초안 저장만 허용하고 공개하지 않는다.
- [x] `web/tests/sideout-team-draft.test.ts`: 실패→통과, 원본 불변과 공개본 보존.

## Task 2 — Authenticated API
- [x] `web/lib/server/sideout-teams.ts`, `web/app/api/sessions/[id]/teams/route.ts`, dependencies wiring: manager-only GET and draft POST.
- [x] `web/tests/sideout-team-storage.test.ts`: SQLite D1, 권한/시각/동시성/회원 비활성/replay/GET 비노출.
- [x] 기존 read DTO/편집 비활성 버튼은 화면 연결 전까지 유지. 서버 API만으로 화면 이전 완료 주장 금지.

## Task 3 — verification / handoff
- [x] 전체 sideout/member UI, type/build, LAN real local D1 smoke with synthetic fixture, runtime restarts.
- [x] 독립 검토와 결과 기록. 누락표에는 팀 저장 기반과 UI 미연결 구분.

## Rulings
- 사용자 다음 작업 지시에 따라 단계별 구현을 계속한다. 미정 정책이나 프로필 인수로 막히지 않는 저장 단위를 먼저 수행한다.
- 기존 미커밋 P1/P2 전체를 한꺼번에 커밋하지 않는다. 이번 범위 diff/검증 기록으로 인수 가능하게 남긴다.

## 완료 기록
- P3-1 초안 GET/POST 및 서버 도메인 완료. P3 전체 또는 화면 이식 완료가 아님.
- sideout 159개 + member UI 4개, 타입/빌드/diff-check 통과. LAN 실제 D1 저장·명령 재시도·409·일반회원403 확인.
- 독립 검토 `/root/p3_storage_review`: 구체 결함 없음. 보완 의견인 일정 revision 경합, 우선 대기 선순위 승격, draft/시작 경계를 추가 검사해 통과.
- 공개 명령, 회원 주/부포지션 원본 인수, UI/자동배치/경기 편집 연결은 다음 단위. 1~2팀 공개 여부는 2026-10-03 답변으로 확정: 공개 불가, 초안 저장만 허용. 공개 구현의 검증 항목에 1~2팀 거절, 3~4팀에서 모든 신청자 배정 등 나머지 공개 조건 확인을 포함한다.
