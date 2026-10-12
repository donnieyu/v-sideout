# 모집 시작 공통 앱 다이얼로그 — 2026-10-12

- PreparedScheduleView에서 window.confirm 제거, 앱의 공개 취소 확인창과 같은 Dialog/Content/Header/Footer/Button 사용.
- 제목과 본문을 분리하고 취소(외곽선)/확인(주색) 가로 배치, 각 44px 터치 영역 유지.
- 새 일정과 저장된 준비 일정 모두 확인 후에만 쓰기. 취소/닫기/Escape 시 쓰기 없음. 뒤쪽 플로팅 버튼은 기존 공통 규칙으로 숨김.
- 시각 검증에서 포커스 복원 누락을 발견하여 이 화면의 시작 버튼 ref로 복원. 공유 Dialog 자체는 변경하지 않음.

검증: UI 확인을 요구하는 테스트를 먼저 실패 확인한 후, 관련 3파일 26개 테스트 통과. TypeScript 및 production build 통과. Chrome/WebKit 390px에서 신규/저장된 준비 일정 각각 안내, 취소, Escape, X, 확인, 취소 후 초점 복원을 확인했다. 기본 브라우저 다이얼로그가 발생하면 실패하도록 검사했다. 앱 다이얼로그 너비 358px, 확인/취소/닫기 44px, 뒤 플로팅 visibility hidden 확인. 실제 일정 쓰기는 가상 응답으로 대체해 기존 데이터는 변경하지 않았다. 4180 서버 새 빌드 반영. 실기기 Safari 결과와 동일시하지 않는다.

증거: verify.mjs, measure.json, chrome/webkit saved/new-dialog.png.
