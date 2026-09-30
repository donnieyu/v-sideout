# M2 기존 회원 사전 등록·관리 서버 인계

작성: 2026-09-30 · 담당 A(회원·인증)  
기준: [회원 SSOT v0.7](../ACCESS_AND_DEPLOYMENT_SSOT.md), [M2 계획](../superpowers/plans/2026-09-30-member-management.md), [로드맵](../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md).  
소스 기준: `feat/auth-rotation`의 `3558044`. 검증은 2026-09-30에 이 코드와 동일한 변경 내용으로 수행했다.

## 제공 기능과 계약

- 마스터가 정상 세션으로 `GET /api/members`, `GET /api/members/:id`, `POST /api/members`, `PATCH /api/members/:id`, `POST /api/members/:id/reissue`, `POST /api/members/:id/deactivate`, `POST /api/members/:id/reactivate`를 호출한다. 로그인 아이디는 등록 시에만 입력하며 M2에서 변경 API는 제공하지 않는다.
- 생성 입력은 `loginId`, `displayName`, `homeClubId`, `homeRole`, `grants`, `isMaster`이다. 무소속 일반 회원은 `homeClubId:null`, `homeRole:null`을 사용한다. 마스터는 소속·역할·추가 grant가 없다. 운영자의 `homeRole`은 소속이 있을 때만 유효하다.
- 회원 ID는 UUID로 발급하고 로그인 비교키는 기존 NFC·소문자 정규화 후 DB 전체에서 고유하다. 활성·임시·비활성 계정 모두 ID를 점유한다. 임시 비밀번호는 회원마다 새로 만들고 7일 후 만료되며, 첫 로그인 뒤 변경이 필수다.
- 등록·재발급·재활성화의 성공 응답에만 새 임시 비밀번호를 한 번 포함한다. 목록·상세·감사·DB에 평문을 저장하지 않는다. 응답이 유실되면 이전 값을 조회하지 않고 재발급한다. 실제 회원에게 전달하는 절차와 이메일은 아직 연결하지 않았다.
- 마스터의 제한/만료/비활성·버전 불일치 세션과 일반 회원은 관리 요청을 할 수 없다. 쓰기 명령은 저장 직전 행위자의 활성 마스터 권한·버전을 다시 검사하고 대상 버전 CAS, 감사 삽입, 기존 세션 삭제를 한 D1 `batch()`에서 수행한다. 마지막 활성 마스터는 강등·비활성화할 수 없다.
- 모든 관리 쓰기 요청은 현재 URL과 일치하는 `Origin` 헤더를 요구한다. 재활성화는 기존 소속·추가 모임 권한을 현재 모임 원본으로 다시 확인하고, 원본 장애 시 계정과 자격을 변경하지 않는다.
- 최초 마스터 생성은 서버 내부 `bootstrapFirstMaster` 함수만 제공한다. 빈 계정 DB에서만 한 번 성공하며 공개 HTTP 경로가 없다. 운영에서 이 함수를 안전하게 호출하는 설정 명령과 본인 확인·자격 전달은 아직 만들지 않았다.

## I 연결 의존성

운영 모임 ID의 정본은 아직 없다. `EXAMPLE_CLUBS`는 샘플이며 현재 `workspaces` JSON 행의 존재로 모임을 검증할 수도 없다. I가 서버 원본과 `ClubDirectory.exists(clubId): Promise<boolean>` 제공자를 정하고 `memberDependencies()`에 연결하기로 했다. 현 제공자는 모든 비-null 모임 조회에서 503으로 실패한다. 따라서 **무소속 회원만 API로 등록할 수 있으며 실제 모임 소속 회원 등록·수정·재활성화는 아직 운영 불가**다. 연결 뒤 존재하지 않는 ID는 400, 제공자 장애는 503을 유지한다. 마스터 회원 관리 UI의 모임 선택지도 같은 원본에서 읽어야 한다.

I의 업무 API·앱 셸과 R의 참가 모델은 이번 작업에서 수정하지 않았다. I는 기존 C01–C04 검증 신원과 M2의 권한 변경 시 `authorizationVersion`·세션 회수 의미를 업무 요청에 적용한다. 운영 데이터의 기존 참가 회원 ID 매핑은 닉네임만으로 자동 결정하지 않는다.

## 검증과 남은 범위

- Node 24.16.0에서 전체 16개 `web/tests/*.mjs`, `tsc --noEmit --incremental false`, `npm run build`, 변경 파일 ESLint, `git diff --check`를 통과했다. 새 검사는 요청 권한/Origin 누락·불일치/입력/비밀 노출, 중복 등록, 비활성 ID, 모임 원본 장애 중 재활성화 거절, 재발급, 감사 실패 롤백, 세션 회수, 행위자 회수, 두 마스터 교차 비활성화 경합을 포함한다.
- Wrangler 4.92.0의 로컬 D1 바인딩에 0000–0002 마이그레이션을 적용했다. 최초 마스터 생성 `committed→conflict`, 동일 로그인 ID 등록 `committed→conflict`, 재발급 `committed→conflict`를 확인했다. 최종 행은 새 해시·버전 2, 감사는 초기 마스터/등록/재발급 각 1건이었다. 이 시험은 합성 데이터만 사용했다.
- 독립 코드 검토에서 Origin 누락 허용과 모임 원본 장애 중 재활성화라는 두 결함을 발견했다. 각 실패 검사를 추가하고 수정한 뒤 같은 검토자가 재검토하여 두 결함의 해결을 확인했고, 추가 실질 결함을 찾지 못했다.
- 저장소 전체 lint는 작업 범위 밖 `web/app/court-app.tsx`의 기존 React effect 오류와 무시 디렉터리 `.wrangler/rotation-test/worker.ts`의 시험용 `any`에서 실패한다. 변경 파일 lint는 통과한다.
- 원격 D1, 실제 동시 사용량, 운영 모임 제공자, 최초 마스터 설정 명령, 회원 화면, 실회원 자료/자격 전달, 신규 신청·승인·메일, 공개 URL 배포는 검증·실행하지 않았다.
