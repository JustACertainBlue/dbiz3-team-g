# Build Log

Course: DBIZ3 AI-native Product Development, Sessions 8 to 11
Team: `G`    Product: `Hanoi Artisan Bridge`

Save as `docs/build/build-log.md`. Add one entry for every agent run that created or changed a
file in `specs/`, `src/` (or your code folder) or `tests/`. Write it right after the run, not at
the end of the day. The build log is how the instructors, and your teammates, see what the agent
did and what the humans decided.

## 1. Features in progress

| Feature folder | Module | User stories in this slice | Owner | Branch | Status |
|---|---|---|---|---|---|
| `specs/001-exp-core` | EXP | US-1–4; FR-001–017 attempted, with explicit remaining integrations | Group G, human reviewer pending | `001-exp-core` | Local prototype and tested domain logic; not fully complete |

## 2. Run entries

Copy this block for each run. Keep the newest entry at the bottom.

### Entry `<n>`: `<dd/mm>` `<member>`

| Field | Value |
|---|---|
| Path and agent | A (Claude Code) / B (Antigravity agent, model `<name>`) |
| Command and argument | `/speckit-plan ...` (paste the argument you typed) |
| Feature and tasks | `specs/001-...`, tasks `T0xx` to `T0yy` |
| What the agent produced | files created or changed, one line each |
| Human review | Accepted / Changed / Rejected. What you changed and why |
| Tests | `<passed> passed, <failed> failed` (paste the last line of the test run) |
| Spec issues found | none / open question `<n>` added to `docs/spec/spec-<MODULE>.md` |
| Commit | `<first 7 characters of the hash>` |

### Entry 1: 13/10 Codex — prepare, plan, tasks and analyze

| Field | Value |
|---|---|
| Path and agent | Local Codex agent using Session 8 Spec Kit workflow |
| Command and argument | `start_feature.py --spec docs/spec/specs/spec-EXP.md EXP --name core`; plan US-1 P1 only; tasks require tests before code; read-only analyze |
| Feature and tasks | `specs/001-exp-core`, T001–T018 |
| What the agent produced | `spec.md` snapshot, `plan.md`, `research.md`, `data-model.md`, `contracts/explore-api.md`, `quickstart.md`, `tasks.md` |
| Human review | Pending. Plan follows existing TypeScript/Next/Vitest stack and uses the canonical seed read-only. |
| Tests | `start_feature.py --check`: OK; environment check: 0 FAIL, 0 WARN |
| Spec issues found | See section 3: media files missing; later EXP analytics fields need data-model clarification. |
| Commit | Local commit on `001-exp-core`; not pushed |

### Entry 2: 13/10 Codex — US-1 tests first, code and verify

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Setup, US-1 tests first, then catalog/API/UI code; no spec or data edits |
| Feature and tasks | `specs/001-exp-core`, T001–T018 |
| What the agent produced | Next.js scaffold; seeded catalog service and API; Guest/Agency browse UI; minimal detail and Login destinations; unit/integration tests; `.gitignore` build-output rules |
| Human review | Pending. Agency Quote/Chat handoff and full detail remain separate stories. |
| Tests | Red: 2 suites could not import missing code. Green: 7 tests passed, 0 failed; `npm run lint` passed; `npm run build` passed; seed validator passed (47 CSVs); Guest/API/development Agency demo checked in browser. |
| Spec issues found | No P1 entity attribute missing. The seed records image keys but not image binary objects; cards use placeholders. Full §5.1 check identifies later-story persistence gaps below. |
| Commit | Local commit on `001-exp-core`; not pushed |

### Entry 3: 13/10 Codex — extend EXP P1 screens and P2 domain logic

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | User requested US-1–4 and FR-001–017; chose automatic System ranking promotion and Auth/Chat integration ports; declined edits to `data/` |
| Feature and tasks | `specs/001-exp-core`; Provider/Experience pages, availability, consented tracking, session ranking, KPI/optimization rules and handoff contracts |
| What the agent produced | `src/app/explore/` and `src/app/api/explore/` flows; `src/lib/explore/` domain services; unit tests; revised quickstart and implementation-status report |
| Human review | Pending. The user decided to keep `data/` unchanged, so FR-006 remains incomplete. |
| Tests | 32 passed, 0 failed; `npm run lint` passed; `npm run build` passed; seed validator passed (47 CSVs). |
| Spec issues found | SC-011 conflicts with BR-015/closed Q23; Nearby has no coordinates; full detail visits and source context lack explicit storage; Auth/Chat and PostgreSQL are not integrated. |
| Commit | Uncommitted local work; not pushed |

### Entry 4: 14/10 Codex — align EXP author-review documents

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | User requested document corrections so the author checklist can be assessed against the expanded EXP prototype |
| Feature and tasks | `specs/001-exp-core`, T024–T026; no application or data-model code edited in this run |
| What the agent produced | Aligned plan, research, data mapping, API contract and tasks with US-1–4; corrected spec SC-011; added open questions 28–31; refreshed the generated spec snapshot; updated implementation status and this log |
| Human review | Pending. The original US-1 red-to-green run is in Entry 2. No historical red run was captured for the later extension; documentation cannot create that evidence retroactively. |
| Tests | `start_feature.py --check`: OK; seed validator: PASS 47 CSVs; `npm test`: 7 files and 32 tests passed; `npm run lint`: passed; `npm run build`: passed; `git diff --check`: clean. These are green checks after implementation, not a historical red run for T019–T023. |
| Spec issues found | EXP §10 questions 28–31 now carry the unresolved mappings; `data/` remains unchanged. |
| Commit | Uncommitted local documentation changes; not pushed |

### Entry 5: 14/10 Codex — validate the Active EXP ranking version

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Continue EXP implementation using the Session 8 test-first loop; correct the Active-version invariant and update stale agent instructions. |
| Feature and tasks | `specs/001-exp-core`, T028; `AGENTS.md` describes the stack and commands already in use. |
| What the agent produced | A test rejecting two Active ranking versions; `ExploreRuntime` now requires exactly one Active version; updated `AGENTS.md` and `tasks.md`. No `data/` or source spec change. |
| Human review | Pending. The fix prevents ambiguous baseline ranking; independent review is still required before merge. |
| Tests | Red: 1 failing test because two Active versions were accepted. Green: `npm test` 7 files, 33 tests passed; `npm run lint` passed; `start_feature.py --check` OK; `git diff --check` clean. |
| Spec issues found | None. The error message already claimed exactly one Active version; code now enforces that invariant. |
| Commit | Uncommitted local work on `001-exp-core`; not pushed. |

### Entry 6: 14/10 Codex — capture local EXP detail-visit duration

| Field | Value |
|---|---|
| Path and agent | Local Codex agent |
| Command and argument | Continue EXP implementation with a test-first fix for FR-006/FR-008 page-exit timing; keep `data/` unchanged. |
| Feature and tasks | `specs/001-exp-core`, T029. |
| What the agent produced | `tests/unit/explore-detail-visit.test.ts`, `src/lib/explore/detail-visit.ts`, `src/app/explore/ExploreTracker.tsx`; updated tasks and implementation status. |
| Human review | Pending. Browser navigation/exit delivery still needs independent manual verification. |
| Tests | Red: suite failed because `detail-visit.ts` did not exist. Green: `npm test` 8 files, 35 tests passed; `npm run lint` and `npm run build` passed; `git diff --check` clean. Browser exit delivery still needs manual verification. |
| Spec issues found | Existing EXP §10 question 28 still blocks durable FR-006 mapping; no data or source spec change. |
| Commit | Uncommitted local work on `001-exp-core`; not pushed. |

## 3. Spec issues found while building

Every gap the build uncovers goes back to `docs/spec/` as an open question or a spec change. It
is never fixed silently in code.

| # | Found at (step, entry) | Issue | Where it went in the spec | Status |
|---|---|---|---|---|
| | | | | |
| 1 | Prepare / Entry 1 | FR-006 detail visit fields (`entered_at`, `exited_at`, `scroll_depth_pct`, `sections_viewed`, `next_action`, `time_to_next_action`, `detail_visit_log_id`) have no explicit logical entity/columns in `data/`; FR-007 `source_context` is also not explicit. | Source EXP spec §10 questions 28–29; data owner must decide durable mapping. | Open; blocks full FR-006/007 |
| 2 | Prepare / Entry 1 | FR-003 optional `included_items`/`excluded_items` have no explicit Experience columns, and stored image binaries are absent though media metadata exists. | Source EXP spec §10 question 31 covers the content source; binary media remains a documented implementation dependency. | Open; optional content and media unavailable |
| 3 | Analyze / Entry 2 | US-1 AC2 says Agency actions are available, but the Quote/Chat handoff belongs to F-EXPLORE-11/12 and is not built in this slice. | Documented in `specs/001-exp-core/plan.md`; UI says unavailable and does not present a broken Agency button. | Open; blocks claiming complete US-1 acceptance |
| 4 | Install / Entry 2 | The package versions match the existing AIT stack but `npm audit` reports 9 dependency advisories, including 3 critical. | No source spec change; upgrade the shared stack with the other module branches before external deployment. | Open; prototype only |
| 5 | Entry 3 | SC-011 described HDT_Admin activation, contradicting BR-015 and closed question 23, which specify automatic System promotion. | Source EXP spec SC-011 corrected in Entry 4 and snapshot refreshed. | Closed document inconsistency; runtime worker still open |
| 6 | Entry 3 | Nearby relation requires 20 km but `data/` has no village coordinates. | Source EXP spec §10 question 30; same-Provider and same-type relations run locally. | Open data decision |
| 7 | Entry 3 | A complete EXP delivery needs durable PostgreSQL storage, Auth/Chat adapters and a weekly worker, absent from this branch. | Tracked in `specs/001-exp-core/implementation-status.md`. | Open integration work |

## 4. Agent mistakes worth remembering

Short notes for the team and for Session 10 (debugging and code review): what the agent got
wrong, how you noticed, and what you changed in the prompt, `AGENTS.md` or the constitution so it
does not happen again.

| Entry | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| | | | |
| 2 | EXP / local preview | Running `npm run build` while `npm run dev` used the same `.next` directory invalidated a development server chunk and made `/explore` return HTTP 500. | `next.config.mjs` now separates development output (`.next-dev`) from production output (`.next`); verified a production build while dev served `/explore` successfully. |
