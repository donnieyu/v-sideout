# 승인 UI 메인 통합 준비 — 2026-10-12

상태: **문서 현행화·파일 분리·격리 후보 검증 완료. 준비 당시 main 통합·push·배포는 미실행. **후속:** 사용자 실기기 정상 확인 및 1차 통합 승인. [실행 결과](../first-completion-20261012/REPORT.md).**

## 기준과 담당

- 작업 트리: `v-sideout/.worktrees/promotion-p1`, `feat/promotion-p1`.
- 현재 HEAD `9633597`, 로컬 main `06418b7`. main은 HEAD의 조상이다. 이는 로컬 검사이며 원격 최신 상태를 fetch한 결과는 아니다.
- 기존 main 통합 후 커밋: `3b4d994` 자동 배치 미배정 이유, `9633597` 경고형 이유 보기.
- 이번 작업은 문서와 후보 검증만 담당한다. 제품 코드, 별도 인증 작업, 새 Cloudflare 운영 설정, 시험 DB는 수정하지 않는다.
- 현행 규칙: [DESIGN.md](../../../web/DESIGN.md). [이전 원문](design-before.md)은 최초 경로 web/DESIGN.md 기준 상대 링크를 그대로 보존한 이력이다.
- [이전 대응표](../MOCKUP_PROMOTION_PARITY.md)의 현행 표/인수 상태도 정리했다. 날짜별 과거 구현 기록은 보존한다.

## 승인 상태

| 항목 | 현재 결정 | 근거 |
|---|---|---|
| 일정 홈 | 작은 배지·모임 이니셜/선, 필터/날짜 고정, 카드 목록 스크롤 | home/shell/week-schedule, 홈 비교 증거 |
| 등록/이어서 준비 | 기본 정보 또는 저장값의 상세부터 확인, 명시적 수정 | new-session/prepared-session-detail |
| 일정 조회/수정 | 장소·시간/신청 정보/공지 단일 카드·단일 수정 진입 | schedule-information/registration |
| 저장/모집 | 편집은 저장만·화면 유지, 모집 시작은 상세의 앱 확인창 | schedule-save-only/recruitment-app-dialog 보고서 |
| 하단 조작 | 모바일 44px·13px/400·둥근 버튼, 0→42→82% 공통 페이드 | editor-action-bar, floating-unified-fade |
| 확인창 | 취소/폐기/최신조회/이탈 공통 앱 Dialog, beforeunload만 브라우저 예외 | common-confirm-dialogs 보고서 |
| 자동 배치 | 기본 자리 우선, 미배정 이유·경고, 초기화 확인 | HEAD의 자동 배치 후속 2커밋 |

다음은 현재 규칙이 아니다: 상단 저장과 하단 공개의 분리, 일정 정보/공지 탭, 등록 폼부터 시작, 수정 폼의 모집 시작, 48px 작업 버튼, 투명 배경만 또는 초기 약한 페이드, 앱 동작에 기본 window.confirm 사용. 모두 사용자 후속 승인으로 대체된 이력이다.

## 파일 단위 통합 계약

전체 목록/해시는 [inventory.json](inventory.json)에 있다. 추적/미추적 파일을 함께 분류했다. 자동 분류에서 미분류는 오류로 처리한다.

| 묶음 | 범위 | 통합 방식 |
|---|---|---|
| 승인 UI | [54개 앱·테스트 파일](approved-ui-files.txt) | HEAD 위에 이 목록만 적용한 후보로 검증. 신규 컴포넌트/스타일/테스트 포함 |
| 승인 근거·설계 이력 | [문서/증거 목록](approved-evidence-files.txt) | 문서 변경과 함께 보존할 자료. 과거 실험안의 제품 승인을 의미하지 않음 |
| 인증/호스팅 | [별도 목록](hosting-auth-files.txt) | PBKDF2 환경 호환, @noble/hashes 의존성/인증 테스트, 테스트 사이트 noindex 및 배포 증거. UI 커밋에 섞지 않음 |
| 별도 운영 | [운영 문서·설정](separate-operations-files.txt) | 동시에 추가된 CLOUDFLARE_OPERATIONS.md/wrangler.production.json. 인수 없이 수정/포함하지 않음 |
| 임시 비교 실험 | [보존 목록](preserved-experiment-files.txt) | allocation-actions-preview/evolution/mobile-navigation 비교. 실제 앱 통합에서 제외·삭제하지 않음 |
| 이번 준비 | 보고서·계획·목록·검증 | 후속 통합자가 그대로 범위를 재확인할 수 있도록 남김 |

`.wrangler`, 계정 자격, 실제 DB, node_modules, dist, 환경 비밀 파일은 후보에 복사하지 않았다. 임시 후보의 npm 설치와 빌드는 실제 서버 디렉터리와 분리했다.

## 검증 후보와 결과

[prepare.py](prepare.py)는 HEAD의 web/.nvmrc를 별도 임시 경로에 추출하고 승인 UI 54파일만 덮어쓴다. `package.json`/lockfile/인증 코드는 HEAD 기준이므로 별도 호스팅 의존성을 우연히 참조하지 않는지도 검사한다. 후보 위치/기준은 [candidate.json](candidate.json)에 있다.

- Node 24.16.0, 후보 lockfile로 새 npm ci.
- 격리 제품 빌드 통과: [build.log](build.log).
- SIDEOUT 41파일 **410개**, 회원 UI **4개** 통과: [ui.log](ui.log), [member.log](member.log).
- 도메인/인증 tests/*.mjs **19파일** 모두 종료 0: [domain.log](domain.log). 이 파일에는 기존 legacy 검사가 함께 있으며 개별 출력의 과거 규칙이 현재 승인 정책을 대체하지 않는다.
- TypeScript `--noEmit --incremental false` 종료 0: [types.log](types.log). diff whitespace 오류 없음.
- 기존 전체 413개와의 차이는 별도 호스팅 PBKDF2 회귀 3개를 제외했기 때문이다. 누락이나 실패가 아니다.
- 후보 54개 UI 파일이 원본 해시와 일치한다. 별도 인증/실험/운영 파일도 시작 이후 변경하지 않았다: [verification.json](verification.json).
- 이번은 통합 후보의 새 설치/빌드/회귀 검사다. 기존 Chrome/WebKit UI 증거는 각 기능 보고서에 있으며 이번에 다시 실제 브라우저 전체 검사를 실행한 것은 아니다. 전체 lint 기존 부채와 독립 최종 코드 리뷰는 이번 통과 항목에 포함하지 않는다.
- 4180 서버를 재시작하거나 사용 중인 dist/DB를 변경하지 않았다.

## 사용자 인수

**이미 완료:** 코트/행 내부 스크롤, 선수 선택 모달, 경기 드래그, 공개 취소/재공개. 이전 검색 키보드·배정/미리보기·저장 유지 확인도 과거 인수로 유지한다.

**2026-10-12 사용자 인수 완료:** 실기기 정상 동작 확인을 받았다. 요청했던 최신 일정 폼·하단 버튼·새 등록 흐름의 이번 인수를 완료로 기록한다. 이는 전체 접근성/스크린리더 인수까지 의미하지 않는다.

전체 200% 확대·스크린리더는 별도 잔여다. WebKit 자동 검사를 물리 기기 확인으로 대체하지 않는다.

## 통합 순서

1. 사용자 실기기 결과와 새로운 코드 변경 여부를 반영한다. 수정이 발생하면 해당 검증 및 후보 해시를 갱신한다.
2. 최신 main/원격 상태와 작업 담당을 재확인한다. 현재 main에도 별도 목업 및 ACCESS_AND_DEPLOYMENT_SSOT.md 작업이 있으므로 그 변경을 보존한다. 새 커밋이 있으면 현재 조상 관계와 검증 결과를 재사용하기 전에 충돌/동작 차이를 확인한다.
3. 이번 보고서·현행 문서를 정리한 문서 커밋, 승인 UI 54개 파일의 제품 커밋을 명시적 파일 목록으로 구성한다. `git add .`/`git add -A`는 사용하지 않는다. 이미 있는 자동 배치 2커밋도 통합 대상이다.
4. 최종 커밋 차이와 검증을 확인하고 main에 통합한다. 실제 병합 단계의 최종 검토/CI는 이번 준비로 대체하지 않는다.
5. 인증/호스팅 묶음은 별도 인수·보안/호환성 검토 후 독립 커밋으로 처리한다. UI 검증은 이 변경의 승인 근거가 아니다.
6. Sites 또는 운영 배포는 별도 작업이다. Sites와 로컬 데이터는 독립적이며 seed 재실행/로컬 DB 복사는 하지 않는다. 운영 migration은 이번 범위 밖이다.

## 후속 범위

회원 주·부 포지션 입력, 가입/승인/발송/요청 제한 합류와 migration 단일 계보, 운영 DB 백업/복구, 전체 접근성. 팀 순서 DnD·코트 팀명 수정 진입·로고 업로드·게시판은 별도 제품 검토이며 이번 승인 UI의 누락으로 분류하지 않는다.
