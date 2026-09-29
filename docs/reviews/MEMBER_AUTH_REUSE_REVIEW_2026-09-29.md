# 기존 회원·인증 코드 재사용 검토

검토일: 2026-09-29 · 담당: 회원·인증(A)  
결론: **기존 기반은 재사용하되, 저장 실패 처리와 통합 계약을 보완한 뒤 인수한다. 운영 투입 가능 판정은 아니다.**

기준: [회원 SSOT](../ACCESS_AND_DEPLOYMENT_SSOT.md), [통합 계획](../INTEGRATION_PLAN.md) 9절.

## 1. 검토 대상과 편집 경계

- 기본 `web/`: `main`, HEAD `bfb1597`, 작업 트리 깨끗함.
- 검토 checkout: `/Users/donnieyu/DevSource/Personal/v-team-builder/web/work/member-roster-integration`(이하 W).
- 브랜치: `feat/member-roster-integration`, HEAD `bfa0af18652ca116362c6e5f7aaeae6d9bf1acf0`.
- 커밋 `bfa0af1`: 로그인 ID·비밀번호 기본 함수. `5cb326d`: 서버 actor 경계·회원 투영. 후자는 I/R의 별도 검토 영역이다.
- 계정·세션·HTTP·D1 저장소와 관련 테스트, 인증 라우트는 미추적 파일이며 DB 스키마와 migration journal은 미커밋 변경 상태다. **HEAD만으로 검토 대상을 재현할 수 없다.**
- [26개 파일 SHA-256 목록](MEMBER_AUTH_REUSE_BASELINE_2026-09-29.json)을 함께 보존한다. 검사 전후 해시 변경은 없었다.
- R의 명시적 편집 중단, A의 파일 인수, 스키마 단독 작성자 확정은 아직 기록되지 않았다. 읽기 검토·로컬 검사만 수행했으며 제품 파일은 수정하지 않았다.

## 2. 재사용 판단

| 영역 | 확인한 구현 | 판단 |
| --- | --- | --- |
| `lib/auth/credentials.ts` | NFC·소문자 비교키, 내부 공백 거절, 매개변수 기반 길이/영문/숫자 검사, PBKDF2 해시·검증 | 재사용. 최소 8자 정책 연결과 Workers 실행 비용 검증 필요. 정규화 상세는 설계 제안임 |
| `lib/auth/accounts.ts` | 사전 생성, 임시 자격 만료, 첫 변경 필수, 동일 비밀번호 거절, 비활성화·버전 증가 | 재사용. 마스터 API·최초 마스터 설정·입력 검증·발급 이력은 별도 구현 필요 |
| `lib/auth/session-token.ts` | 무작위 토큰, 해시 저장, HttpOnly/SameSite 쿠키 | 재사용. 실제 HTTPS 환경과 세션 정책 검사 필요 |
| `lib/auth/auth-service.ts` | 로그인, 계정 상태·버전 기반 세션 검증, 변경 후 회전 | 아래 F01/F02 보완 후 재사용 |
| `lib/auth/auth-http.ts`, 인증 라우트 | 로그인·세션 조회·비밀번호 변경·로그아웃 | 오류 종류·확정 정책·응답 계약 보완 필요 |
| `lib/auth/d1-repository.ts` | 계정·세션 CRUD, 계정 버전 CAS | 원자적 변경 명령 추가 필요. 현재 순차 CRUD만으로 승인/재발급 완성 아님 |
| 스키마/migration | 전체 계정에 적용되는 login key 고유 인덱스, 세션, 신청 기초 테이블 | 기존 원본 보존 후 단독 작성자가 검토. 운영 DB 적용 증거 없음 |
| 신규 신청·승인·메일·마스터 화면 | 완성된 서비스/화면 없음 | 신규 작업. 테이블 존재를 기능 완료로 해석하지 않음 |

## 3. 재현한 결함

### F01 · P1 · 저장소 오류를 무시해 로그아웃 성공으로 응답

위치: W의 `lib/auth/auth-service.ts:64`, `lib/auth/auth-http.ts:48`.

`logout()`의 catch가 잘못된 쿠키뿐 아니라 `deleteSession()`의 저장 오류까지 삼킨다. 합성 저장소에서 삭제 호출만 실패시킨 결과:

```text
logout HTTP status: 200
logout body: {"state":"anonymous"}
resolveSession(previousToken): password_change_required
```

브라우저 쿠키 삭제와 서버 자격 폐기는 다르다. 이미 복사되었거나 진행 중인 요청이 가진 토큰은 여전히 유효하다. 잘못된 토큰 형식만 별도로 처리하고 저장 실패는 503 등 재시도 가능한 실패로 반환해야 한다. UI에서도 서버 로그아웃 완료로 안내하면 안 된다. 활성 세션에도 같은 코드 경로가 적용되며 활성/제한 상태 양쪽 회귀 검사를 추가한다.

### F02 · P2 · 비밀번호 변경 중간 실패를 입력 오류로 안내

위치: W의 `lib/auth/auth-service.ts:55`, `lib/auth/auth-http.ts:50`.

계정 변경 → 기존 세션 삭제 → 새 세션 삽입이 별도 저장이다. 합성 저장소에서 마지막 삽입만 실패시킨 결과:

```text
password change HTTP status: 400
passwordAlreadyChanged: true
resolveSession(previousToken): anonymous
```

사용자는 입력 오류 안내를 받지만 실제 비밀번호는 바뀌어 이전 비밀번호로 재시도할 수 없다. 비밀번호 CAS·이전 세션 폐기·새 세션 저장을 원자적 명령으로 묶고 실패 시 전부 이전 상태를 유지하도록 한다. DB 성공 후 응답 유실은 별개이므로 새 비밀번호로 재로그인하는 복구 안내도 필요하다. 동시 변경·비활성화와의 충돌은 별도 409/401 응답으로 구분한다.

위 두 진단은 기존 테스트 수정 없이 임시 디렉터리의 TS 변환 모듈과 합성 저장소로 수행했다. 장애 주입 진단의 임시 스크립트는 보존하지 않았으므로 위 절차를 정식 회귀 테스트로 만드는 것이 후속 구현의 첫 단계다.

## 4. 결함과 구별할 미완성/계약 항목

1. HTTP 기본값은 최소 **12자**다. 이번 사용자 확정 **8자**, 임시 자격 **7일**, 미활성 계정도 **만료만으로 아이디 자동 반환 없음**을 공통 정책에 반영해야 한다. 12시간 세션은 기존 코드값이며 사용자 확정 수치가 아니다.
2. 현재 세션 응답에는 `loginId`가 없고 원본 `grants/homeRole` 등이 포함된다. C01의 최소 회원 정보와 서버 전용 검증 결과를 분리한다.
3. 제한 세션의 응답 만료는 임시 비밀번호 만료만 사용한다. 실제 표시 만료는 세션 만료와 임시 자격 만료 중 이른 시점이어야 한다.
4. 공개 인증 요청 제한, 가입 신청·중복 승인 원자성, 발급 이력·메일 재시도, 관리 명령 감사 기록이 없다. 공개 배포 전에 별도 구현·검증해야 한다.
5. 해시가 로컬 Node에서 동작한다는 사실은 Workers CPU 한도 내 실행을 입증하지 않는다. 실제 대상 런타임 성능·D1 저장 보장을 따로 검증한다.

## 5. 이번에 직접 실행한 검증

작업 디렉터리 W, Node `v26.7.0`. 각 명령 종료 코드 0.

| 명령 | 결과/범위 |
| --- | --- |
| `node tests/credentials.mjs` | PASS, 기본 함수 3개 검사 |
| `node tests/account-state.mjs` | PASS, 최초 변경·만료·역할·비활성/ID 보존 |
| `node tests/session-token.mjs` | PASS, 토큰·쿠키 |
| `node tests/auth-service.mjs` | PASS, 합성 저장소 서비스 흐름 |
| `node tests/auth-http.mjs` | PASS, 합성 저장소 HTTP 흐름 |
| `node tests/auth-repository.mjs` | PASS, 로컬 SQLite를 D1 형태로 감싼 저장소 검사 |
| `node tests/auth-schema.mjs` | PASS, 로컬 SQLite 스키마 검사 |
| `node tests/identity-roster.mjs` | PASS, 8개 검사. 최신 참가 UI 전체 정책 인수 판정 아님 |
| `node tests/domain.mjs` | PASS, 35개 검사. 기존 도메인 회귀 |
| `./node_modules/.bin/tsc --noEmit --incremental false` | PASS, 타입 검사 |

총 **테스트 스크립트 9개와 타입 검사 통과**. 기존 검사가 F01/F02를 다루지 않아 통과 결과와 결함 재현 결과는 모순되지 않는다. 실제 D1/Workers, 브라우저, 빌드, 이메일, 외부 배포는 이번 검증 범위가 아니다. 테스트 데이터는 합성이고 실회원 정보는 사용하지 않았다.

## 6. 인수 후 작업 순서

1. [회원 개발 로드맵](../MEMBER_ACCESS_IMPLEMENTATION_ROADMAP.md)의 단계별 책임을 따른다.
2. [인증 기반 보완 계획](../superpowers/plans/2026-09-29-member-auth-foundation.md)으로 정책·F01/F02·세션 계약을 먼저 고친다.
3. 마스터 사전 등록과 기존 회원 첫 로그인 경로를 완성한다.
4. 신규 신청·승인·메일, 요청 제한·운영 검증을 완료하고 I에게 통합 증거를 전달한다.

이 보고서는 코드 편집권 인수, 브랜치 병합, 운영 DB migration 적용 또는 공개 배포 승인이 아니다.
