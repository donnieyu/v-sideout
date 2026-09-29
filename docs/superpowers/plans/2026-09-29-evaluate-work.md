# Evaluate Work Implementation Plan

> For agentic workers: Use superpowers:subagent-driven-development for the bounded tooling task; the coordinator owns instructions, cases, trials, and integration. Preserve other workers' files.

**Goal:** Install a working multi-turn quality/efficiency evaluation skill, persist comparable cases and follow-ups, exercise a bounded effort comparison, and deliver usage instructions.

**Architecture:** A concise skill delegates one independent evaluator and uses a Python standard-library CLI for scope, runtime metadata, validation, immutable records, append-only follow-ups, and indexes. Historic observations and synthetic trials stay explicitly separated from live evaluations. Recommendations stay hypotheses until applicable follow-up evidence exists.

**Tech Stack:** Markdown, TOML/YAML, JSON, Python 3 stdlib unittest.

**Spec:** /Users/donnieyu/DevSource/Personal/v-team-builder/docs/WORK_EVALUATION_SKILL_PLAN_2026-09-29.md

## Global Constraints

- Preserve existing review-completed-turn and historic records.
- Install under /Users/donnieyu/.codex/skills/evaluate-work and /Users/donnieyu/.codex/agents/work_evaluator.toml.
- Record root /Users/donnieyu/.codex/work-evaluations; records, experiments, policies, development are separate.
- No product edits, external messages, automatic model switches, or memory edits.
- User authorized execution of the proposed sequence. Make routine implementation choices and continue.
- This location is not a Git checkout; no worktree or commits are needed for this global skill installation. Keep the plan and development ledger as evidence.
- Live recommendations, historical observations, and synthetic trials are distinguishable. Do not infer causal model superiority or monetary savings.

## Review Focus

- Failed reviews and partial coverage must not skip uncovered earlier turns.
- Unknown runtime data and usage overlap must never become zero or a summed total.
- Follow-up with a different model/effort cannot validate the original recommendation.
- Duplicate IDs, traversal, concurrent persistence, and malformed records must fail without overwriting.
- Imported legacy decisions are historical and cannot override later user scope changes.

## Task 1: Scope and recording tools

Owner: tooling worker; files scripts/*.py, tests/*.py, assets/record-template.json only.

Interfaces: CLI eval_tools.py inventory, scope, collect, validate, save, followup, index, import-legacy. Exact arguments are documented by argparse --help and references/tooling.md after implementation. Python standard library only.

- [x] Write and run failing tests for multi-turn selection, coverage gaps, interrupted changes, runtime provenance, immutable persistence and follow-up matching.
- [x] Implement helpers; scope uses explicit classified inventory with frozen upper boundary; complete/partial review coverage uses exact IDs, not just latest review time.
- [x] Runtime inventory reads only supplied logs; collect preserves source lines and nulls; content is not dumped by default.
- [x] Save validated record.json and generated report.md together without overwrite; follow-ups are new immutable JSON/Markdown events.
- [x] Legacy import retains original source/hash and limits; compact index does not rank models or sum unknown overlaps.
- [x] Run full unittest suite; report commands, tests, and limitations.

## Task 2: Instructions and independent evaluation contract

Owner: coordinator; SKILL.md, agents/openai.yaml, references/*.md, global work_evaluator.toml.

- [x] Run baseline scenario against old single-turn scope before authoring new workflow.
- [x] Write core workflow and references for records/rubric, comparison, tools, and usage.
- [x] Configure one evaluator with independent quality-first judgment, actual-runtime verification, and no product edits.
- [x] Integrate tool contracts and validate skill metadata, links and template.
- [x] Run a fresh forward test against the same fixture; record scope and epistemic behavior, not prose matching.

## Task 3: Cases, bounded comparison, and grounded policies

Owner: coordinator; work-evaluations/{records,experiments,policies,development}.

- [x] Import three representative legacy cases as observations; preserve old judgments, unknowns, user scope corrections and unavailable follow-up.
- [x] Compare gpt-6-sol medium and high on identical isolated synthetic state-transition tasks, one run each; max two trial agents, no repair loop. Label exploratory n=1 per condition.
- [x] Freeze task/rubric/start hashes; run independent acceptance checks; collect actual runtime when accessible.
- [x] Record findings and conditional recommendations without generalizing fixture results to production.
- [x] Convert repeated evaluation failures into deterministic checks, regression tests, or narrower guidance.

## Task 4: Final validation and handoff

- [x] Fresh independent read-only whole-deliverable review; reproduce and fix material issues, run full tests.
- [x] Verify registration files and record rendering; show installation evidence without claiming current-session hot reload.
- [x] Write Korean usage guide and completion report with completed work, observed results, and remaining longitudinal validation.

## Execution ledger

- Initial: spec reviewed; tooling and prose share only the record schema/CLI; coordinator will align references to implemented help. Legacy mapping consumed only after tooling passes.
- Ruling: use bounded skill forward tests and two isolated effort trials as authorized by the user's staged-execution request; no live product experimentation. A tiny trial can test the workflow but cannot establish model superiority.

- Complete: installed v1 skill/agent/tools; 25 tests pass including 3 RED→GREEN reader-publication regressions. Baseline/forward scope verified, 3 legacy records imported, 2 isolated effort trials passed 8 checks each, blind quality comparison found no winner. Initial policies remain conditional; longitudinal validation is future operation.
- Verification adaptation: bundled quick_validate needs unavailable PyYAML; Ruby YAML plus equivalent name/description checks, reference checks and TOML parsing passed without installing dependencies. Current-session agent hot reload was not asserted.
- Final review disposition: P2 staging-read bug fixed and full suite passed; no unresolved material code findings. Existing historical-source and sandbox limits are disclosed in completion report.
