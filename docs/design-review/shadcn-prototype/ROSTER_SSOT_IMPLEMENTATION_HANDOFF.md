# 참가 명단 SSOT 구현 인계 · 2026-09-29

## 범위와 결과

`shadcn-prototype`의 로컬 샘플에서 회차별 참가 기록, 대기 기록, 팀 초안/공개본을 `SessionRoster` 하나의 변경 경계로 연결했다. `web/`과 A 비교안은 수정하지 않았다. 이 결과는 로컬 목업의 일관성 개선이며 실제 계정, 서버 저장, 기기간 동기화를 뜻하지 않는다.

1. `roster-state.ts`: 신청·대기·취소·초안 저장·팀 공개를 버전 검사와 권한 검사 아래 명령으로 실행한다. 실패하면 원본이 바뀌지 않는다. 최초 공개 뒤에는 본인·운영진·마스터 모두 참가 취소가 불가능하다. 대기자를 팀에 넣은 재공개가 성공한 경우에만 신청자로 승격한다.
2. `roster-fixtures.ts`: 샘플 상태를 최초 진입과 대표 상태 변경 시 한 번 생성한다. 권한·주간 이동·일정 수정은 참가 상태를 재초기화하지 않는다.
3. `main.tsx`, `roster-dialog.tsx`, `inline-teams.tsx`, `session-allocation.tsx`: 홈 인원, 명단, 본인 버튼, 후보, 공개 편성을 공통 조회에서 읽는다. 운영진 명단 일괄 추가는 즉시 등록한다. 편성 화면에서 미신청 선수를 고른 경우에는 저장/공개 직전 확인하고 편성과 참가 등록을 한 번에 처리한다. 저장 실패 시 편집을 유지하고 오류를 표시한다.
4. 직접 주소와 브라우저 뒤로·앞으로가기로 편집 화면에 접근해도 현재 관리 권한과 회차를 다시 확인한다. 권한이 없으면 상세 또는 홈으로 주소를 교체한다. 편집 컴포넌트도 권한이 없으면 운영용 후보·초안을 렌더하지 않는다.

## 재현·검증

- 실행 경로: `http://localhost:4173/weekend/a-shadcn/?state=published-unapplied&review=ssot-v1#/home?week=0&filter=all`
- `npx vitest run --config vitest.allocation.config.ts`: 8개 파일, 37개 검사 통과.
- `npm run build`: TypeScript 검사와 Vite 빌드 통과.
- 실제 브라우저에서 390×844 모바일과 데스크톱 상세/명단을 확인했다. 모바일에서 운영진의 대기자 등록 → 팀 배정 → 재공개 후 총원 20→21, 본인 팀 표시와 `취소 불가` 상태를 확인했다. 모바일 명단 창의 화면 내 배치와 데스크톱 상세 정보 배치를 확인했다.
- 일반 회원의 팀편성·일정 편집 주소 진입은 통합 검사에서 상세로 교체되고 운영용 후보 정보와 편집 버튼이 보이지 않음을 확인했다.
- 실물 iPhone, 네트워크를 통한 다중 사용자 변경, 서버 재시작 후 보존은 검증하지 않았다.

## 독립 검토와 후속 정책

완료 직전 독립 검토는 회원이 브라우저 앞으로가기로 팀편성 편집 주소에 다시 들어가 운영용 프로필을 읽을 수 있는 문제를 발견했다. 위 4번으로 보완하고 회귀 검사를 추가했다. 검토에서 새 기능을 추가하지 않았다.

현재 동작상 공개된 팀에서 선수를 배정 해제해도 그 사람의 신청 자격은 유지된다. 이는 참가 취소와 팀 배정 변경을 분리한 결과이며, 공개 후 팀 밖에 남는 신청자를 어떻게 운영할지는 별도 제품 정책으로 결정해야 한다. 공개 후 대기 철회는 제공하지 않는다. 재신청의 신청 순번·우선권 복원 정책도 별도로 정해야 한다. 신청 상한 및 소속 회원 우선 편성의 자동 보장은 이번 전환 범위가 아니다.

실서비스 단계에서는 서버에서 인증·권한을 재검사하고 회차별 트랜잭션과 버전 충돌 처리, 영속 저장, 여러 기기의 동기화가 필요하다. 지금의 화면 권한 검사와 로컬 `revision`만으로 이를 보장할 수 없다.

## 주요 파일

- `src/roster-state.ts`, `src/roster-state.test.ts`
- `src/roster-fixtures.ts`, `src/roster-fixtures.test.ts`
- `src/roster-ssot.integration.test.tsx`
- `src/main.tsx`, `src/roster-dialog.tsx`, `src/inline-teams.tsx`, `src/session-allocation.tsx`
- `src/roster-transitions.test.tsx`, `vitest.allocation.config.ts`

저장소 루트는 Git 저장소가 아니므로 커밋 ID는 없다. 실행 시점 주요 파일의 SHA-256은 `roster-state.ts` `19137f59d036926ca3e1b707cd94b5fffbb1142f2b99491758f48855d4f09f53`, `main.tsx` `44890987e2297e9ee17806a03f75e428d732cdd6d2471503fdbf6da081aaafa8`, `roster-ssot.integration.test.tsx` `6614f4883b07098faedead95830d1c0d86bc4e5ba6774b275f31c4cb773aebfc`이다.
