# 회원 인증 기반 Task 1·2 인계

작성: 2026-09-29 · 담당: A(회원·인증)  
기준: [회원 SSOT](../ACCESS_AND_DEPLOYMENT_SSOT.md), [실행 계획](../superpowers/plans/2026-09-29-member-auth-foundation.md), [기존 코드 검토](MEMBER_AUTH_REUSE_REVIEW_2026-09-29.md).

**결과:** 확정된 8자·영문/숫자·7일 정책과 저장 오류의 정확한 HTTP 응답을 격리된 인증 브랜치에 구현했다. 회원 사전 등록, 신규 신청, 원자적 비밀번호 회전, 업무 API/화면 연결, 공개 배포는 아직 완료되지 않았다.

## 소스와 인계 상태

- A 작업 트리: `/Users/donnieyu/DevSource/Personal/v-team-builder/web/work/member-auth-foundation`.
- 브랜치: `feat/member-auth-foundation`, 기준 `bfa0af18652ca116362c6e5f7aaeae6d9bf1acf0`.
- `7205c2b`: 검토한 인증 원본을 보존하고 확정 정책을 `lib/auth/policy.ts`에 연결. 기존 HTTP 12자 기본값 제거.
- `cf391c2`: 세션 삭제/조회 저장 실패를 503으로 보고하고 오류 코드·메시지를 구조화. 정상 로그아웃 때만 세션 쿠키 제거.
- 출발 원본 W(`/Users/donnieyu/DevSource/Personal/v-team-builder/web/work/member-roster-integration`)의 [26개 파일 해시](MEMBER_AUTH_REUSE_BASELINE_2026-09-29.json)를 복사 전·후 대조했고 드리프트는 0이었다. W는 A가 수정하지 않았다. 20개 원본 파일을 A 격리 트리에 복사했다. 첫 커밋은 미커밋/미추적 원본 보존과 정책 변경을 함께 담으므로 변경 귀속은 기준 해시로 구분한다.
- R은 채팅 `01a0ec1e-8e99-7573-87d7-3a0e06a32fa4`에서 현재 인증·스키마 편집이 없고 해당 영역을 A 담당으로 둔다고 명시했다. I는 A가 `db/schema.ts`와 `drizzle/`의 단독 작성자이며 자신은 병행 수정하지 않는다고 확인했다. R의 과거 변경 의도를 모두 재검증했다는 뜻은 아니며, A가 코드·검사로 인수했다.
- A는 인증 서비스·라우트·계정 원본을, I는 `requireBusinessPrincipal`·업무 API·앱 셸을 소유한다. R의 참가 도메인 파일을 이 브랜치에서 변경하지 않았다.

## 변경된 동작

| 항목 | 결과 |
| --- | --- |
| 확정 비밀번호 규칙 | 최소 8자 + 영문/숫자. 생일 포함 문자열 허용. 임시 자격 7일. 첫 변경과 동일 임시 비밀번호 거절은 기존 계정 로직 유지 |
| 로그아웃 저장 장애 | 활성·제한 세션 모두 503 `STORAGE_UNAVAILABLE`. 서버 폐기 실패를 성공으로 표시하거나 쿠키를 지우지 않음 |
| 세션 조회 저장 장애 | 예외가 라우트 밖으로 새지 않고 503 구조화 오류로 응답 |
| 로그인 실패 | 없는 아이디·오입력에 같은 401 `INVALID_CREDENTIALS` 응답. 저장 장애는 503, 잘못된 입력은 400 |
| 정상 로그아웃 | 서버 세션 삭제 뒤 200과 만료 쿠키 응답 |

## 실행 검증

작업 트리 A, Node `v26.7.0`. 새 검사는 수정 전 `policy.ts` 부재 및 HTTP 12자 값, 로그아웃 장애의 200 응답을 각각 실패로 확인한 뒤 통과시켰다.

- `node tests/{credentials,account-state,session-token,auth-policy,auth-service,auth-http,auth-failures,auth-repository,auth-schema,identity-roster,domain}.mjs`: **11개 스크립트 모두 종료 코드 0**. `auth-repository`와 `auth-schema`는 Node SQLite 기반 D1 형태 시험이다.
- `../../node_modules/.bin/tsc --noEmit --incremental false`: 통과. 별도 작업 트리에는 자체 `node_modules`가 없어 `web/node_modules` 실행 파일을 사용했다.
- `npm run build`: 통과. `/api/auth/login`, `/logout`, `/password`, `/session` 라우트 포함.
- `git diff --check`와 작업 트리 상태: 통과·깨끗함.
- 독립 Astra/high 코드 리뷰: Task 1·2 범위에서 Critical/Important 0건. 403/409·비활성/만료의 오류 응답을 더 고정하는 테스트는 Minor 후속 항목으로 기록했다.

## 남은 위험과 다음 단계

1. **F02 미해결:** 비밀번호 변경의 계정 저장→기존 세션 삭제→새 세션 저장은 아직 분리되어 있다. 마지막 저장 실패 때 비밀번호만 변경되는 부분 성공은 [기존 결함 보고](MEMBER_AUTH_REUSE_REVIEW_2026-09-29.md) 그대로다. 새 503 분류만으로 해결되지 않는다. 다음 실행 단위는 계획 Task 3의 D1 원자적 변경·경합 검사다.
2. Task 4의 최소 브라우저 세션 DTO와 서버 전용 유효 권한 계약은 아직 미구현이다. 현재 세션 응답 원본 권한 필드는 I에 최종 계약으로 제공하지 않는다.
3. 실제 Workers/D1 성능·원자성, 요청 제한, 마스터 사전 등록, 신규 신청·메일, 운영 DB·회원 자료, 업무 API·브라우저 통합은 미검증/미구현이다. 이 브랜치를 서비스 공개 준비 완료로 사용하지 않는다.
4. root `docs/`는 Git 저장소 밖이다. 현재 SSOT/계획/인계의 지속 보존·백업 위치는 통합 전에 정해야 한다.

다음 담당은 이 인계와 두 커밋을 확인한 뒤 Task 3의 저장 경계를 별도로 설계·구현한다. 이후 Task 4 계약을 I와 확정하고 M2 사전 등록·회원 관리를 이어간다.
