# 승인 UI 승격 기준 보존본

현재 사용자가 검토한 `shadcn-prototype`의 소스·테스트·설정·lockfile을 보존한다. `manifest.json`은 파일별 SHA-256, 메인/인증 참조 커밋, 캡처 시점의 미커밋 상태를 기록한다. `prototype-source.tar.gz`는 해당 바이트를 담은 복원용 아카이브다.

- 승격 설계: [목업 승격 기준과 통합 설계](../../../superpowers/specs/2026-09-30-mockup-promotion-design.md)
- 포함: src, scripts, public, HTML 진입점, 빌드/테스트 설정, package.json/lockfile.
- 제외: 의존성 설치물, 생성된 빌드, DB·자격, 브라우저 상태, 과거 문서·스크린샷. 과거 스크린샷을 최신 UI 증거로 복제하지 않는다.
- A/B 참고 코드는 원본 복원 목적으로 포함되며, 서비스 승격 대상은 확정한 a-shadcn 흐름이다.
- 이번 동결은 미커밋 소스를 포함한다. 메인 HEAD만 checkout하여 같은 UI가 복원된다고 볼 수 없다.
- 사용자 모바일 수용: 선택 자리로 이동, 상단 도구가 가려지는 동작 허용, 연결 동작 확인. 제품 서버 통합 검증과는 구분한다.
- 캡처 시점 검사: `npm run check:allocation` → 상호작용 69개, Vitest 10파일/80테스트 통과. jsdom scrollTo 미구현 안내 및 Node module.register 폐기 예정 안내가 있었다. 이번 턴 빌드/실제 인증·DB 검증은 수행하지 않았다.

복원은 새로운 빈 임시 디렉터리에 아카이브를 풀어 manifest 해시와 대조한다. 실행 중인 목업이나 인증 작업 트리에 덮어쓰지 않는다. 기존 검토 URL은 유지한다.

이 보존본은 수정하지 않고 이후 승인본은 새 디렉터리로 만든다. 버그·정책 누락도 원본에 포함될 수 있으며 승격 설계의 차이 표를 함께 읽는다.
