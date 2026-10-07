# 통합 변경 묶음과 인수 순서

현재 feat/promotion-p1 HEAD 3faaf54 기준. 작업 시작 때부터 다수의 미커밋·미추적 변경이 있었으므로 이 목록은 커밋이 아니라 검토 단위다.

| 순서 | 묶음 | 주요 경로 | 검증/인수 |
|---|---|---|---|
| 1 | 셸·조회·ID 명단 | web/components/sideout/{shell,home,session-detail,roster-dialog}.tsx, web/lib/server/sideout-query.ts, web/lib/sideout/read-model.ts | 조회 권한·parity·중복 모임명 |
| 2 | 일정·즐겨찾기·참가 | web/app/api/sessions, web/lib/server/sideout-{participation,write,write-store}.ts, web/lib/sideout/participation.ts | 우선기간·정원·마감·명단 연속 취소·CAS |
| 3 | 팀 배정·공개 수명주기 | web/components/sideout/{team-editor,allocation}, web/lib/sideout/{team-draft,team-publish,team-unpublish,retained-placement}.ts | 저장·참석 일치, 공개 잠금, 비활성 유지/해제, 재공개 |
| 4 | 경기 순서·드래그 | web/components/sideout/{match-editor,use-match-drag}, web/lib/sideout/{match-plan,match-drag}.ts | 같은 팀 공개본 즉시 반영·키보드/touch·실기기 |
| 5 | 회원 프로필 조회 | web/db/schema.ts, web/drizzle/0003_milky_night_thrasher.sql, server position query | auth-rotation 조회 인수, 중복 migration 제거 |
| 6 | 인증 쓰기·가입/승인·계정 프로필 | 인증 소유 브랜치 고정 커밋 및 별도 계약 | 쓰기 권한·발송·제한기·프로필 입력·합류 후 전체 회귀 |
| 7 | 릴리스 | 통합 migration journal/snapshot, 배포 설정 | DB 복사본 upgrade/restore, staging, iPhone, 배포/복구 |

각 묶음의 docs/reviews 및 tests를 같은 검토 단위로 포함한다. 파일이 묶음에 걸칠 경우 경계 합의 후 커밋한다. 통합 기준 브랜치·인증 파일 담당자 인수 없이 대량 cherry-pick하지 않는다. profile-and-integration.md의 migration 계보 확인 및 복구 절차를 따른다.

출하 전 잔여: 기존회원 포지션 편집 인수, 인증 가입/승인 합류, 모임 공간·게시판 새 셸 진입, 전체 접근성/200% 확대, iPhone 최신 흐름, 운영 환경 설정. 본 작업의 통과를 전체 제품 출시 완료로 보지 않는다.
