# 참가자 추가 멈춤 수정 — 2026-10-02

## 재현과 원인
- 실제 LAN 주소 `http://192.168.219.173:4180`에서 390px Chromium으로 재현. localhost 검증만으로는 발견할 수 없는 비보안 HTTP 컨텍스트 차이였다.
- `crypto.randomUUID`가 undefined여서 참가자 추가 POST 전에 예외. ID 생성이 try/finally 밖에 있어 busy가 true로 남았다. 명단 조회 및 후보 조회는 200 정상 응답.
- 홈의 PC/모바일 일정 트리가 같은 명단 draft key를 사용했다. focus 인증 재확인 후 두 인스턴스가 같은 open 상태를 복원하여 포털 Dialog가 두 개 열렸다.

## 수정
- `lib/sideout/command-id.ts`: randomUUID가 없으면 getRandomValues 기반 RFC4122 v4 키 생성. 네이티브 API가 있으면 유지. 재시도는 기존 command ID 재사용.
- 명단, 참석 신청, 일정 저장, 즐겨찾기 저장의 ID 생성을 try/finally 안으로 이동. ID 생성 오류에도 busy 해제 및 오류 표시.
- `week-schedule.tsx`의 desktop/mobile 컨텍스트로 명단 draft 복원 키를 분리. 상세 화면도 별도 키. 기존 인증 재확인 및 사용자 변경 시 draft 폐기 유지.

## 검증
- 수정 전 회귀 테스트: LAN 추가 1개 및 PC/모바일 창 복원 2개 실패 (`red.txt`).
- 수정 후 SIDEOUT 129개 + member UI 4개 통과. 타입 검사 및 빌드 통과. git diff --check 통과.
- LAN 홈: 후보 선택, POST 실패 시 재시도 가능, focus 후 Dialog 정확히 1개 및 선택 유지, 취소/닫기 정상 (`home-lan.txt`).
- LAN 실제 로컬 D1: 참석 신청, 우선 기간 대기, 기간 종료 승격, 운영자 추가/취소와 대기 승격, 다른 계정 동일 명단 확인. 브라우저 오류 없음 (`participant-browser.json`).
- LAN 일정 준비 저장/모집 시작/수정 저장, 즐겨찾기 저장/새로고침, 권한 거절 및 중복 명령/충돌 검증 통과 (`browser.json`).
- 390px 홈 참가자 추가 화면 확인: `home-picker-390.png`. 다른 자동 캡처는 viewport 전환 애니메이션 중 찍힌 경우가 있어 화면 판정에는 이 안정된 캡처만 사용.
- 실물 iPhone 조작은 사용자의 재확인 필요. 이번 자동화는 Mac Chromium에서 같은 LAN HTTP 주소 및 모바일 viewport로 수행.

## 환경
- 기존 로컬 서버를 새 빌드로 재시작. 주소 동일: `http://192.168.219.173:4180/home`.
- 합성 검증 일정: 2026-10-25 뉴배동 `20ca2a95-37ca-4a46-a0d1-e2d8ba366581`, 일정 저장 검증 `e0537f69-1de0-4010-bc0f-45f5084c5400`. 즐겨찾기는 테스트 전 값 복원.
- 기존 P1/P2 변경 보존. 커밋·병합·외부 배포 없음.
