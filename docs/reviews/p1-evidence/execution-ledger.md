# SDD ledger — plan: docs/superpowers/plans/2026-09-30-promotion-p1-read-path.md
Start: d976116; auth pin a1ed430; native sequential execution approved.
Ruling: native worktree creation failed because this chat points to historical non-Git v-team-builder — created ignored canonical .worktrees/promotion-p1 via Git fallback — cost if wrong: worktree not attached in app.
Pre-flight: Task1→4/5 auth principal and active gate contracts match pinned commit.
Pre-flight: Task2→3/4 typed dates and versioned records consumed consistently.
Pre-flight: Task3→4 directory and read store share club IDs.
Pre-flight: Task4→5 minimal DTOs and disabled write capabilities preserve P1 scope.
Pre-flight: Task5→6 real API and browser checks share isolated DB.
Initial state: Tasks 1–6 pending. No remote changes or real members.
Task 1: Ruling: existing bootstrap integration test requires generated dist/server/wrangler.json — run build before baseline tests and CI tests — cost if wrong: longer verification, no behavior change.
Task 1: complete (commits d976116..117dc9d, tests: sh -c 'cd web && fnm exec --using=24.16.0 node tests/auth-contract.mjs && fnm exec --using=24.16.0 node tests/auth-rotation.mjs' → PASS atomic password rotation: rollback, CAS conflict, session replacement)
Task 2: complete (commits 117dc9d..38c5443, tests: sh -c 'cd web && fnm exec --using=24.16.0 npm run test:sideout' →    Duration  89ms (transform 59%, import 22%, tests 13%, worker 6%))
Task 3: complete (commits 38c5443..6e1be5f, tests: sh -c 'cd web && fnm exec --using=24.16.0 npm run test:sideout' →    Duration  514ms (tests 78%, transform 14%, import 6%, worker 2%))
Task 4: complete (commits 6e1be5f..ba2d471, tests: sh -c 'cd web && fnm exec --using=24.16.0 npm run test:sideout' →    Duration  572ms (tests 60%, transform 26%, import 12%, worker 1%))
Task 5: Ruling: real browser password input accessible name included the nested visibility button — add explicit password label in reused login form — cost if wrong: one extra attribute; no auth policy change. Browser exact-label lookup failed before fix.
Task 5: Ruling: built vinext Link throws TypeError because lazy navigateClientSide export is not a function (real browser red; direct GET works) — use native document links/location for P1, keep explicit routes/history/query and per-account scroll position, revalidate on BFCache restore — cost if wrong: extra document/auth round trips; no package upgrade or router-private patch.
Task 5: complete (commits ba2d471..07d34b7, tests: sh -c 'cd web && fnm exec --using=24.16.0 npm run test:sideout && fnm exec --using=24.16.0 npm run test:member-ui' →    Duration  769ms (tests 43%, environment 37%, import 11%, transform 9%))

Task 6: Ruling: real iPhone is not tool-accessible — automated mobile/browser acceptance complete, leave device acceptance explicitly pending and ask the user asynchronously — cost if wrong: Safari-specific issue remains undiscovered; no production-readiness claim.
Task 6: complete (commits 07d34b7..eb001fe, tests: sh -c 'cd web && fnm exec --using=24.16.0 npm run test:sideout && fnm exec --using=24.16.0 npm run test:member-ui' →    Duration  772ms (tests 43%, environment 35%, import 12%, transform 9%))

Task 6 device update: user confirmed iPhone login screen after restart; login/detail/reload acceptance remains pending.

Final review: independent gpt-6-astra/high, p1_final_reviewer, range d976116..4fd2e34. Critical 0, Important 3, Minor 0. Verdict With fixes.
Final: fixed focus revalidation clearing auth forms — three login/first/normal password form cases RED→GREEN; built Chromium focus check PASS; full suite green.
Final: fixed public court ignoring slotId — additional/rear placement regression RED→GREEN; full suite green.
Final: fixed dangling match references — eight roster integrity regressions RED→GREEN; full suite green.
Final: Ruling: schema v1 semantic court IDs oh1/mb1/s/oh2/mb2/op1 are explicit, other IDs additional — existing P1 fixture IDs and approved court shape preserved without positional inference — cost if wrong: future prototype numeric IDs need an explicit import conversion.
Final: Ruling: P2 쓰기·동시성: 승인 범위 밖인 상태 유지. 조회 성공으로 쓰기 안전성을 주장하지 않는다. 비용: 다음 단계에서 명령/경쟁 검증 필요.
Final: Ruling: P3 저장·공개·경기 생성 및1/2팀 정책: 후속 정책 유지. 현재 조회의 잘못된 참조만 수정했다. 비용: 최소 공개 fixture를 실제 공개 가능성으로 오해하지 않아야 함.
Final: Ruling: M4 가입·승인·전달·요청 제한기: 다른 작업의 고정 커밋 인수 전까지 제외. 비용: 출시 전 통합 검토 필요.
Final: Ruling: 배포·실회원·원격D1·백업/복구·운영 보안 전체: 실행 범위가 아니므로 완료 주장 없음. 비용: 운영 인수 별도 필요.
Final: Ruling: 원격 CI: 구성만 연결하고 실제 통과는 미확인. 비용: push/PR 이후 환경 차이 발견 가능.
Final: Ruling: iPhone 로그인 이후 흐름: 사용자가 이후 master 로그인·조회 화면 진입은 확인했으므로 그 부분만 상태 갱신. 상세·첫 변경·새로고침·history·키보드는 미확인. 비용: Safari 문제 잔존 가능.
Final: Ruling: 모든 Safari/BFCache 동작: Chromium 회귀와 복귀 보호 구현만 확인했다. 비용: 실기기 history 검사 필요.
Final: Ruling: 전 화면 픽셀 일치: 승인 소스 해시 보존과 현재 화면 확인으로 한정. 비용: 전체 시각 비교는 아직 없음.
Final: Ruling: 인수 인증 M1–M3 관리 명령 전면 재감사: 기존19개 회귀 및 P1 소비 경계를 검증했으며 별도 전체 감사 완료로 표시하지 않는다. 비용: 관리자 기능 후속 통합에서 재검증 필요.
Final: Ruling: 전체 lint 부채·vinext 자체 수정: 별도 작업으로 남긴다. 비용: 문서 이동의 추가 요청 및 기존 lint 부채 유지.
Final: no deferred minors. Post-fix sideout70/70, member UI4/4,19 existing mjs files,typecheck,build,diff PASS; fresh browser320/390/1280 PASS.
Device update: user confirmed iPhone master login and read-only screen. Detail/reload/history/first change/keyboard remain pending; this is not full P1 acceptance or production approval.
