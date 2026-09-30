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
