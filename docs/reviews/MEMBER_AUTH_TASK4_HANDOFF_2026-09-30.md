# 회원 인증 기반 Task 4 인계

작성: 2026-09-30 · 담당: A(회원·인증)  
기준: [회원 SSOT](../ACCESS_AND_DEPLOYMENT_SSOT.md), [M1 계획](../superpowers/plans/2026-09-29-member-auth-foundation.md), [Task 3 인계](MEMBER_AUTH_TASK3_HANDOFF_2026-09-30.md).

**범위:** `feat/auth-rotation`의 `011297e`에서 브라우저 세션 응답과 서버 전용 검증 신원을 분리했다. 통합 담당 I가 C01–C04 필드와 유효 권한 의미에 동의했다. `requireBusinessPrincipal`과 업무 API는 I 소유이며 아직 연결하지 않았다.

I는 문서 커밋 `a9755a4`와 `contracts.ts`·`identity.ts`·`auth-http.ts`를 읽고 최종 인계를 수락했다. I의 `requireBusinessPrincipal`은 `active`만 허용하고 A의 `grants`를 재합산하지 않는다. I는 이번 Node24 검사 결과를 인계 보고로 기록했으며 직접 재실행하지 않았다.

## 계약

- C01 `GET /api/auth/session`은 `anonymous`, `password_change_required {expiresAt}`, `active {me:{memberId,loginId,displayName,homeClubId},authorizationVersion}` 중 하나를 반환한다. `expiresAt`은 ISO 문자열이며 제한 세션 만료와 임시 자격 만료 중 이른 시각이다. 브라우저 응답에 비밀번호 해시·원본 토큰·이메일·마스터 여부·역할·grant 원본은 없다.
- C03 서버 전용 `resolveVerifiedIdentity(repo,token,now?)`는 같은 상태를 검증한 뒤 정상 세션에만 `principal:{memberId,homeClubId,isMaster,grants,authorizationVersion}`를 반환한다. `authorizationVersion`은 조회 당시 계정의 `authVersion`이다. `grants`는 A가 계산한 최종 유효 운영 권한이며 I는 소속 기본 역할을 다시 합산하지 않는다. 빈 배열은 일반 참가 자격 없음이라는 뜻이 아니다.
- C04 `effectiveClubGrants(account)`는 소속 `homeRole`과 명시 grant를 합친다. 같은 모임의 명시 역할이 우선하며 chair→staff도 명시값대로 적용한다. 중복 명시값은 기존 `clubRole()`의 첫 일치 규칙을 유지하고 모임당 한 항목만 낸다. 마스터 권한은 `isMaster`로 표현하며 모든 모임의 가짜 grant를 만들지 않는다.
- 서버 내부 `getMemberIdentity(repo,memberId)`는 최소 회원 신원만 조회한다. 없는 ID는 `null`; 비활성 회원도 역사 기록의 표시를 위해 조회된다. 이 함수의 결과 자체는 현재 로그인·열람·업무 권한의 증명이 아니다.
- 누락·잘못된 토큰, 세션/임시 자격의 만료 정각, 비활성 계정, 인증 버전 불일치, 제한·정상 상태 불일치는 `anonymous`다. 저장소 장애는 인증 실패로 숨기지 않아 기존 HTTP 경계에서 503으로 응답한다. 제한 세션은 비밀번호 변경·로그아웃에만 사용하고 I 업무 진입점은 `active`만 허용한다.

## 검증과 미완료

- Node **24.16.0**에서 신규 `auth-contract.mjs`를 먼저 실패시킨 뒤 구현해 통과시켰다. 이 검사는 정확한 DTO 키·비밀정보 비노출, 무소속·마스터·동일 모임 명시 권한, 제한/정상 세션, 만료 정각, 비활성·버전 회수, 저장소 장애 전파, 비활성 회원 신원 조회를 포함한다.
- 기존 `auth-http.mjs`는 C01의 정확한 키와 제한 세션 만료를 검사하도록 보강했다. 전체 **13개** `web/tests/*.mjs` 스크립트, `tsc --noEmit --incremental false`, `npm run build`, `git diff --check`가 Node 24.16.0에서 통과했다. 빌드는 기존 vinext의 동적 API 분류 안내를 출력했다.
- 독립 코드 검토에서 `a110043..a9755a4` 범위의 수정 필요 결함은 Critical·Important·Minor 모두 0건이었다. 검토자는 Node24.16.0에서 계약·HTTP·원자 회전·정책·저장 장애 검사 5개를 별도로 재실행했다.
- 이번 작업은 스키마·migration·쿠키 정책·로그인/변경/로그아웃 오류 코드·의존성을 변경하지 않았다. 비밀번호 변경 성공 후 응답이 유실되면 새 비밀번호로 재로그인하는 기존 복구 경계가 유지된다.
- 원격 D1의 동시 요청·CPU·장애 복구, 실제 브라우저/업무 API 통합, 실회원 자료·발송·공개 배포는 검증하지 않았다. C03의 업무 저장 직전 권한 변경 경합은 I의 저장 경계와 함께 검증해야 한다. M2 회원 관리에서 권한 변경 시 인증 버전을 갱신하는 명령을 구현해야 한다.

다음 A 작업은 기존 회원 사전 등록과 회원 관리 API(M2)의 상세 계획·구현이다. 통합 담당은 이 계약을 기준으로 I 소유 `requireBusinessPrincipal`을 연결하되, 현재 브라우저 DTO를 서버 권한 근거로 사용하지 않는다.
