# 실제 앱 전체 배정표 확인

- 대상: `web/components/sideout/allocation/board-allocation.tsx`를 미공개 팀편성 수정 화면의 기본 배정 화면으로 연결. 공개 편성은 기존 읽기 전용 화면을 유지한다.
- 로컬 앱: `http://127.0.0.1:4180/session/4a03a759-7ec2-4a7f-a584-f63c0ac74f60/teams/edit`
- 모바일 폭 320·390·423px에서 문서 가로 넘침 없이 표시. 4팀일 때 배정표 내부에서만 좌우 스크롤.
- 실제 앱 브라우저에서 공통 추가 선수 줄 생성·삭제, 선수 선택 다이얼로그를 닫지 않고 해제·재배정, 네 번째 팀 삭제 확인, 배정 선수가 있는 팀 삭제 확인/취소/확인, 신청자 전원 배정 후 미신청 회원 탭 자동 선택과 안내 문구를 확인했다. 검증 전후 팀 저장 API 응답 동일: 브라우저 확인은 저장하지 않았다.
- `npm run test:sideout`: 30개 파일, 317개 테스트 통과. `npm run test:member-ui`: 4개 통과. `npx tsc --noEmit --pretty false`와 `npm run build` 통과. `impeccable detect`: `[]`.
- 현재 저장 계약은 배정된 선수만 기록한다. 비어 있는 추가 줄은 편집 중 사용할 수 있지만, 비운 채 저장하고 다시 열면 복원되지 않는다. 선수에게 배정된 추가 자리는 저장된다.

시각 자료: `actual-board-320.png`, `actual-board-390.png`, `row-added-390.png`, `released-picker-390.png`, `candidate-fallback-390.png`, `occupied-team-confirm-390.png`, `four-team-right-390.png`. 상세 수치는 `verification.json`.
