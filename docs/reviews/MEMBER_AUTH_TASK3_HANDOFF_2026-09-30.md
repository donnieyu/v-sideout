# 회원 인증 기반 Task 3 인계

작성: 2026-09-30 · 담당: A(회원·인증)  
기준: [회원 SSOT](../ACCESS_AND_DEPLOYMENT_SSOT.md), [실행 계획](../superpowers/plans/2026-09-29-member-auth-foundation.md), [Task 1·2 인계](MEMBER_AUTH_TASK1_2_HANDOFF_2026-09-29.md).

**범위:** 비밀번호 변경의 계정 버전 갱신, 이전 세션 폐기, 후속 세션 생성이 하나의 D1 `batch()` 트랜잭션에 속하도록 변경했다. M1 Task 4 신원 계약, 회원 관리·화면·가입 신청·메일·공개 배포는 이 작업에 포함되지 않는다.

## 코드와 저장 경계

- 정본 저장소: `/Users/donnieyu/DevSource/Personal/v-sideout`. 격리 작업 트리: `.worktrees/auth-rotation`, 브랜치 `feat/auth-rotation`, 시작 HEAD `a110043`. Task 3 코드 커밋: `b13ceb4a8273bf2b06e31fb35c71205fb2a3b0fa`.
- 서비스는 새 토큰/해시를 준비하고 `AuthRepository.commitPasswordChange`를 한 번 호출한다. 충돌은 409 `CONFLICT`, 저장 실패는 503 `STORAGE_UNAVAILABLE`이며 성공 응답에서만 후속 토큰 쿠키를 전달한다.
- D1 배치는 `auth_version` 및 활성 상태를 확인하는 계정 CAS → `changes()=1`일 때 후속 세션 삽입 → 앞 문장의 `changes()=1`일 때 이전 세션 삭제 순서다. CAS가 0행이면 두 세션 명령도 0행이고 결과는 `conflict`다. 중간 SQL 오류가 나면 D1 배치 전체가 롤백된다. [D1 `batch()` 공식 문서](https://developers.cloudflare.com/d1/worker-api/d1-database/)의 트랜잭션·롤백 동작을 기준으로 구현했다.
- 기존 `saveAccount` 등은 다른 계정 작업용으로 남겼지만 비밀번호 변경 경로에서는 호출하지 않는다. 스키마·migration 변경은 없었다.

## 검증

- `node tests/auth-rotation.mjs`: 실제 SQLite SQL을 실행해 배치의 1·2·3번째 문장 실패마다 회원·세션이 모두 원상 유지됨을 확인했다. 정상 회전, 재시도 충돌, 비활성화 선행, 같은 버전의 병렬 두 변경 중 정확히 하나만 성공하는 경우도 검사했다. 테스트용 D1 어댑터는 트랜잭션을 직렬화한다.
- `node tests/auth-service.mjs`, `node tests/auth-http.mjs`: 단일 저장 명령 소비, 장애 후 이전 세션 유지, 충돌 409·저장 장애 503, 후속 응답이 유실되어도 새 비밀번호로 재로그인하는 경로를 검사했다.
- 로컬 Wrangler 4.92.0의 실제 D1 바인딩으로 기존 migration 두 개를 적용한 별도 시험 DB에서 `seed` → `rotate` → `inspect` → `rotate`를 호출했다. 결과는 `committed`, 회원 버전 2와 후속 세션 하나, 재호출 `conflict` 및 상태 불변이었다. 시험 설정의 compatibility date는 설치된 workerd가 지원하는 `2026-05-22`를 사용했다. 시험 DB·Worker는 격리 작업 트리의 무시된 `.wrangler/rotation-test/`에만 존재했고 원격 D1에는 접근하지 않았다.
- 전체 기존 11개와 새 `auth-rotation`까지 12개 `.mjs` 스크립트, `tsc --noEmit --incremental false`, `npm run build`, `git diff --check`가 통과했다. Node v26.7.0. 빌드는 기존 vinext의 동적 API 분류 안내를 출력했다.
- 독립 Astra/high 코드 검토에서 Task 3 범위의 Critical/Important/Minor 실행 결함은 발견되지 않았다. 검토는 SQL·서비스·HTTP·로컬 Miniflare 동작을 대상으로 했으며 원격 D1 운영 검증을 대신하지 않는다.

## 남은 검증과 다음 단계

- 원격 Cloudflare D1의 동시 요청·CPU·장애 복구는 아직 시험하지 않았다. 로컬 Wrangler 시험은 실제 바인딩의 정상·충돌 경로를 확인한 것이며 운영 DB 검증으로 간주하지 않는다.
- Task 4에서 브라우저용 최소 세션 DTO와 I가 소비할 서버 전용 유효 권한 계약을 확정한다. 그 전에는 현재 세션 응답의 원본 권한 필드를 통합 계약으로 사용하지 않는다.
- 이후 마스터 사전 등록, 회원 관리, 첫 로그인 화면, 가입 신청·발송 및 업무 API 통합을 진행한다. 실제 회원 자료와 임시 비밀번호 발송은 수행하지 않았다.
