# Identity and roster bridge implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Each task uses test-first checks.

**Goal:** Make SIDEOUT's existing participation operations accept a verified member identity and return only the roster information that member may see.

**Architecture:** Keep the existing workspace domain model as a compatibility layer while extracting an explicit, required actor context for new server callers. Preserve the old demo wrapper until the authenticated API replaces it. Build projections from a trusted per-club role and stable internal member ID; do not infer identity from a name or client role.

**Tech Stack:** TypeScript, vinext, D1, Node domain tests.

**Spec:** `/Users/donnieyu/DevSource/Personal/v-team-builder/docs/INTEGRATION_PLAN.md` C03–C09 and `/Users/donnieyu/DevSource/Personal/v-team-builder/docs/ACCESS_AND_DEPLOYMENT_SSOT.md`.

## Global constraints

- Preserve the current 35 domain checks and existing demo route until a verified auth route replaces it.
- Do not read the actor ID or club role from a request body or query in the authenticated path.
- `memberId` is a stable internal identifier; display name and login ID are not keys.
- Before team publication, home-club members see only home-club applicant names, external members see counts, and only managers see the complete applicant/waiting roster.
- After publication, a member sees the published lineup only if they applied or were included in that lineup; waiting-only members cannot see it.
- Real credential issuance and deployment are separate later tasks.

## Review focus

- Two users sharing a display name must retain distinct participation rows.
- A member with an additional managed-club grant may manage that club even when it differs from their home club.
- A waiting-only member cannot fetch a published lineup by direct API request.
- A public member projection must not include position ratings, registration timestamps, or other members' raw participation rows.
- A call missing a verified principal must fail closed rather than fall back to the demo member.

### Task 1: Required identity for new domain callers

**Files:** Modify `lib/model.ts`, `lib/operations.ts`; test `tests/identity-roster.mjs`.

**Interfaces:** Produce `BusinessActor={memberId:string;role:Role}` and `operateForActor(workspace,action,actor,now?)`, `projectionForActor(workspace,actor,revision)`. The existing `operate` and `projection` remain demo-compatible wrappers.

- [ ] Write failing tests for two distinct self applicants, additional-club manager authority, waiting-only team visibility, and limited roster fields.
- [ ] Run `node tests/identity-roster.mjs` and confirm a feature-missing failure.
- [ ] Implement the required-actor functions and remove internal `DEMO_MEMBER` assumptions from their code paths.
- [ ] Run the new test and `node tests/domain.mjs`; both must pass.
- [ ] Run `npm run build` and `npm run lint`; record failures and fix those caused by this task.

### Task 2: Server contract and storage boundary

**Files:** New `lib/integration/*` and `app/api/sessions/[sessionId]/*` under a single owner; tests in new isolated integration tests.

**Interfaces:** Consume a verified server principal from the auth owner; validate session ID, command ID, expected revision, and target member IDs; return a role-specific DTO.

- [ ] Agree on the auth provider contract, role table, and D1 migration writer before writing server code.
- [ ] Write failing tests for missing auth, stale revision, wrong club, duplicate command ID, and cross-user projection.
- [ ] Implement one transaction boundary for participant and lineup changes, then pass tests.

### Task 3: Member-facing UI and visual QA

**Files:** Approved SIDEOUT UI entry points after their single-writer handoff.

- [ ] Confirm whether the newer `a-shadcn` UI or current `web/` UI is the integration target.
- [ ] Write interaction tests for sign-in, first password change, participation, waiting, manager editing, and published-lineup gating.
- [ ] Connect the UI to authenticated DTOs and remove demo role switching from the production path.
- [ ] Build, test, and inspect desktop/mobile screenshots and focus/back-navigation behavior.
