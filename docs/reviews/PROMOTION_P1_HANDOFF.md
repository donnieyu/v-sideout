# P1 승격 인계

상태: 구현 중. 시작 d976116, 인증 인수 a1ed430. 작업 브랜치 feat/promotion-p1.
기존 목업 및 진행 중 auth-rotation 작업 공간은 수정하지 않는다.

## 인증 인수
- 고정 커밋 병합, 충돌 없음. M4 후속 커밋 미포함.
- Node 24.16.0, npm ci, 기존 tests/*.mjs 전체, member UI, tsc, build 통과.
- bootstrap 테스트는 build의 Wrangler config를 필요로 하므로 새 checkout에서는 build를 먼저 수행한다.
- migration: 0000_windy_omega_red, 0001_glamorous_iron_lad, 0002_modern_triathlon.
- 제품 연결·실기기 검증·독립 검토는 아직 진행 전.
