# P3 팀편성용 회원 포지션 조회 인수

작성일: 2026-10-03  
제공 브랜치: `feat/auth-rotation` (`4aa6dbd`)  
받는 범위: `feat/promotion-p1`의 권한 있는 팀편성 조회. 이 문서는 포지션 **조회 계약만** 인계한다. 가입 신청·승인·자격 발송·공개 요청 제한 기능의 통합 완료를 뜻하지 않는다.

## 1. 정본과 조회 계약

`auth_members.id`가 내부 회원 ID이며 `member_position_profiles.member_id`가 이를 참조한다. 로그인 아이디나 표시 이름으로 매칭하지 않는다. 프로필은 회원 개인의 선호 주·부 포지션이며 소속 모임별 구분이나 경기의 실제 배정 포지션과 다르다. `join_requests.requested_main_position`·`requested_sub_position`은 신청 이력이고, 승인 시에만 같은 값을 개인 프로필로 복사한다. 코드값은 `S`, `MB`, `OH`, `OP` 네 가지이며 주·부 값이 같아도 유효하다.

서버 조회는 이미 권한 검사를 통과해 팀편성 화면에 포함하기로 한 회원 ID 집합에 한정한다. 예시 SQL은 `SELECT member_id, main_position, sub_position FROM member_position_profiles WHERE member_id IN (...)`이다. 클라이언트가 보낸 ID 목록을 곧바로 조회 범위로 쓰거나 일반 회원/공개 팀 조회에 이 값을 추가하지 않는다. 팀편성 편집용 응답에서만 다음처럼 해석한다.

| 상태 | `position`(주) | `secondary`(부) | 의미 |
| --- | --- | --- | --- |
| 해당 `member_id` 행이 있고 두 값이 유효 | 저장된 코드 | 저장된 코드 | 선호 포지션을 팀편성 참고값으로 표시 |
| 행이 없음 | `null` | `null` | 아직 포지션 미등록. 현재 P3의 수동 배정 경로를 유지 |
| 행이 있지만 허용되지 않은 코드 또는 한쪽 값 누락 | 정상값처럼 표시하지 않음 | 정상값처럼 표시하지 않음 | 데이터 오류로 확인·복구; 임의의 기본 포지션을 만들지 않음 |

기존 사전 등록 회원, 마스터/운영진의 직접 추가 회원, 아직 승인되지 않은 신청자에게는 프로필 행이 없다. 이들의 값을 레거시 목업, `auth_members.kind`, 신청 이력, 팀의 배정 포지션에서 추론하거나 일괄 채우지 않는다. 무소속 승인 회원은 프로필 행이 있을 수 있다. 프로필은 `club_id`가 아니라 `member_id`에 연결된다.

## 2. 정확한 소스와 최소 이식 범위

| 항목 | 현재 인증 브랜치의 근거 | P3 인수 방식 |
| --- | --- | --- |
| 원본 스키마 | `web/db/schema.ts`의 `memberPositionProfiles` | 동일한 필드와 `auth_members.id` 외래키를 P3 스키마에 추가 |
| 생성 migration | `web/drizzle/0004_wet_liz_osborn.sql`의 `member_position_profiles` CREATE TABLE | 해당 테이블 정의만 P3의 **새 migration**으로 생성·적용. `0004` 전체를 그대로 가져오지 않음 |
| 프로필 생성 | `web/lib/auth/join-approval-repository.ts`의 승인 배치 | 이번 조회 인수에는 포함하지 않음. 현재 P3에 프로필 행이 없는 것은 정상 |
| 허용 코드/동일값 | `web/lib/auth/join-request.ts`, `web/tests/join-request.mjs` | `S/MB/OH/OP`, 동일 주·부 허용을 조회 검증에도 유지 |
| 로컬 검증 | `web/tests/join-approval.mjs`, `web/tests/club-member-create.mjs`, `web/tests/join-approval-d1.mjs` | 승인 회원에게만 행이 생기고 직접 추가 회원은 미등록임을 확인한 근거 |

이 테이블은 `auth_members`가 있는 `0001_glamorous_iron_lad.sql`만 선행하면 독립 생성할 수 있다. 현재 P3에는 `0000`~`0002`가 있으므로 조회 전용 migration을 추가할 수 있다. 인증 브랜치의 `0003_chubby_sugar_man.sql`은 **신청 이력 컬럼**을 추가하며 조회 전용 테이블 생성의 선행 조건이 아니다. 다만 나중에 가입 승인 코드까지 통합하려면 `0003` 신청 컬럼과 `0004`의 다른 테이블·원자 승인 배치를 함께 조정해야 한다.

프로필 테이블을 처음 추가한 커밋은 `deae058`이다. 이 커밋은 승인·발송·회원 구분 등 여러 기능도 포함하므로 P3의 최소 조회 인수를 위해 커밋 전체를 cherry-pick하지 않는다. 인증 HEAD `4aa6dbd`의 문서 수정도 조회 기능의 의존성이 아니다. P3에서 별도 `0003` migration을 만들면 양쪽 브랜치의 migration 번호와 Drizzle journal/snapshot이 갈라진다. 추후 브랜치를 통합할 때 중복 CREATE TABLE을 실행하지 않도록 하나의 migration 계보로 재정렬해야 한다. 이 작업이 끝나기 전 원격 D1에 양쪽 migration을 각각 적용하지 않는다.

## 3. P3의 적용·검증 순서

1. P3의 기존 `0000`~`0002`를 적용한 별도 합성 로컬 D1에서 `auth_members` 존재를 확인한다. 실제 회원 DB는 사용하지 않는다.
2. P3 소유 `web/db/schema.ts`에 프로필 테이블만 추가하고 `npm run db:generate`로 P3의 다음 migration/journal/snapshot을 만든다. 생성 SQL이 `member_id TEXT PRIMARY KEY NOT NULL`, `main_position TEXT NOT NULL`, `sub_position TEXT NOT NULL`, `created_at TEXT NOT NULL`, `member_id → auth_members.id` 외래키인지 대조한다.
3. 새 migration을 로컬 D1에 적용한다. 기존 회원 조회는 행 없음 → 주·부 `null`; 합성 프로필 행은 두 코드 반환; 동일 코드(S/S)도 반환; 존재하지 않는 회원 ID는 외래키에 따라 거절되는지 확인한다.
4. 팀편성 조회는 기존 서버 권한·회원 목록 필터 뒤에 프로필을 붙인다. 운영진 팀편성 응답에는 허용된 회원의 선호 포지션만, 일반/공개 응답에는 선호 포지션이 없음을 검사한다. 현재 `position:null, secondary:null` 수동 배정 동작도 회귀 검사한다.
5. 승인 경로까지 통합하기 전에는 실제 기존 회원의 값이 자동으로 생기지 않는다고 UI와 인계 기록에 명시한다. 기존 회원 포지션 입력·수정 권한과 경로는 별도 작업이다.

2026-10-03 인증 브랜치에서 `join-approval.mjs`, `club-member-create.mjs`, `join-approval-d1.mjs`를 다시 실행해 모두 통과했다. 별도 메모리 SQLite에서 `0000`·`0001` 뒤 프로필 테이블만 만들고 행 없음·동일 포지션 S/S·외래키 위반을 확인해, 조회 전용 테이블에는 `0003` 신청 컬럼이 필요하지 않음을 검증했다. 이는 인증 브랜치의 승인 저장 및 최소 스키마 검증이며, P3 브랜치의 조회 통합·원격 D1 적용·실회원 데이터 이전 완료 증거는 아니다.

## 4. 파일 담당 인수 동의

인증 담당은 위 **포지션 프로필 스키마와 권한 있는 조회 계약**을 P3 담당이 `feat/promotion-p1`의 자기 소유 파일에 이식·사용하는 데 동의한다. 인증 담당은 이 인수 범위의 구현 편집을 종료했고 P3 작업 트리 파일을 수정하지 않았다. `feat/auth-rotation`의 가입·발송 모듈, 기존 `0003`/`0004` migration 파일 자체, 실회원 자료 및 공개 배포는 이 동의에 포함되지 않는다.
