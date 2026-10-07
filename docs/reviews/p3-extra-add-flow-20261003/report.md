# 추가 자리 생성과 배정 화면 이동 분리

2026-10-03 · promotion-p1 로컬 반영

## 원인 및 수정

- `addExtra`가 자리 생성과 함께 선택 대상·포지션·화면을 변경했다. 이제 자리만 추가하고 현재 선택과 화면을 유지한다. 생성된 타일의 기존 `open` 동작으로만 배정 화면으로 이동한다.
- 새 `.allocation-reserve.empty`의 일반 `empty` 클래스가 `web/app/globals.css`의 `.empty svg`에 걸려 아이콘 27px, 자동 좌우 여백, 하단 12px 여백이 적용됐다. 추가 자리 전용 `no-extras`로 이름을 분리했다.
- 기존 버튼의 흰 배경·테두리·44px 터치 높이를 유지하며, 아이콘 16px와 문구를 중앙 정렬한다.

## 검증

- React 회귀 테스트를 먼저 변경해 이전 구현에서 2개 실패를 확인했다. 이후 수정 후 SIDEOUT 214개 및 회원 UI 4개, 총 218개 통과.
- TypeScript 검사·빌드·git diff --check 통과.
- 실제 앱에서 320·390·1024px 너비로 CSS 실측: 아이콘 16×16px, margin 0, 버튼 높이 44px.
- 미리보기 → 추가 버튼 → 빈 타일 추가 및 현재 선택 유지 → 생성 타일 클릭 → 추가 선수 배정 화면 이동 확인.
- 390px 전후 스크린샷을 직접 확인했다. 브라우저 pageerror 없음.
- 테스트 전후 실습 일정 팀편성 API 결과가 같음을 확인했다. 저장·공개를 수행하지 않았다.
- 실제 iPhone 물리 기기 테스트는 수행하지 않았다.

증거: `verify.mjs`, `before.json`, `browser.json`, `before.png`, `after-empty.png`, `after-added.png`, `after-slot-click.png` 및 검사 로그.
