# Approved SIDEOUT Main Integration Preparation Plan

> **For agentic workers:** Use executing-plans for subsequent product implementation; this task only consolidates documentation and prepares a verified integration candidate. No new product behavior is introduced.

**Goal:** 승인된 현행 UI와 검증·인수 상태를 정리하고 메인 통합 후보를 준비한다.

**Architecture:** 기존 promotion-p1 작업 트리를 유지한다. 승인 UI 후보와 별도 호스팅/인증 변경을 명시적 파일 목록으로 분리하고, HEAD에 UI 후보만 덮어쓴 격리 폴더에서 검증한다. 실기기 확인은 사용자가 수행하며 시험 서버·DB를 건드리지 않는다.

**Tech Stack:** React, TypeScript, Vitest, vinext/Cloudflare Workers, Git.

**Spec:** 사용자 2026-10-12 요청 및 `web/DESIGN.md`의 최신 승인 기준. 이전 버전은 `docs/reviews/main-preparation-20261012/design-before.md`에 보존.

## Global Constraints

- 파일 담당: 이번 작업은 DESIGN.md, 이전 대응표, 과거 통합 보고서의 현행 링크, 이번 준비 보고서/목록/검증만 수정한다.
- 기존 제품 코드, 다른 채팅의 인증/운영 문서, 시험 DB와 4180 서버는 유지한다.
- 메인 변경, push, 외부 배포 및 migration은 이번 준비 범위에 포함하지 않는다.
- 사용자 확인 완료 기능은 재인수 미완료로 돌리지 않는다. 최신 iPhone 확인은 대기 상태다.
- 검토용 자료와 .wrangler/계정 자격/node_modules/빌드 출력은 제품 통합 대상이 아니다.

## Review Focus

1. 과거 상단 조작/공지 탭/모집 시작 규칙을 현행 UI로 오인하지 않도록 문서를 통합한다.
2. 앱 UI만 선택했을 때 미등록 신규 파일 누락 때문에 빌드가 실패하지 않는지 격리 검증한다.
3. 인증 호환성과 운영 배포 설정이 UI 변경에 섞이지 않도록 전체 변경을 분류한다.
4. 실기기 대기와 자동 검사 통과, 로컬 반영과 main/외부 반영을 구분한다.
5. 별도 작업이 동시에 변경될 수 있으므로 시작·종료 해시를 비교하고 덮어쓰지 않는다.

## Tasks

### 1. 승인 기준 현행화
- [x] DESIGN.md를 현재 규칙 중심으로 재구성하고 이전 버전을 보존한다.
- [x] MOCKUP_PROMOTION_PARITY.md의 현행 요약/오래된 인수 표시를 정리한다.
- [x] 메인 통합 기록은 과거 사실을 유지하며 최신 준비 보고서로 연결한다.

### 2. 통합 후보 분리
- [x] 전체 변경 파일을 UI, 호스팅/인증, 증거/설계, 실험, 별도 운영으로 분류한다.
- [x] 메인과 HEAD 차이 2커밋 및 미커밋 UI 파일을 해시 목록으로 고정한다.
- [x] 격리 후보를 HEAD + UI 변경으로 구성한다. 별도 인증 변경과 신규 의존성은 포함하지 않는다.

### 3. 검증 및 인계
- [x] 격리 후보의 build, SIDEOUT, member UI, TypeScript, 도메인/인증 검사를 실행한다.
- [x] 문서 링크와 대상 파일 해시/빠진 변경을 확인한다.
- [x] 검증 결과, 제외 항목, 통합 순서, 사용자 실기기 결과 반영 위치를 REPORT.md로 작성한다.
- [x] 제품 코드/시험 서버 보존을 확인하고 준비 완료와 실제 통합을 구분해 보고한다.
