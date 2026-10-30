# CLAUDE.md — Hanoi Artisan Bridge (DBIZ3, Group G)

Claude Code reads this file at the start of every session. The shared rules for every
AI agent are in AGENTS.md and are imported here; they always win over anything below.

@AGENTS.md

## 0. How to talk to the team

- Reply to humans in **Vietnamese**, keeping technical terms in English (FR, BR, On hold,
  pull request, slice, ...). Code, comments, commit messages and repo docs stay in English.
- Be explicit about evidence: say "verified by running X" or "inferred from Y, not verified".
- When the spec is silent or ambiguous: stop, quote the spec line, and list the question.
  Never fill the gap with your own requirement (AGENTS.md rule 2, constitution principle I).

## 1. What this project is (one paragraph)

Responsive B2B web platform connecting **Tour Agencies** with **verified Local Providers** of
Hanoi craft-village experiences: Explore, AI Tour Matching, Request Quote, in-app Chat,
Provider-owned Booking lifecycle, and scoped dashboards for ADMIN (`admin_type` HDT | UBND).
Course: DBIZ3 AI-native Product Development, VJCBI College – FTU. We are in **Sessions 8–11
(build phase)**: turning the approved spec into running code with Spec Kit, one thin slice at a time.

Full digest: `docs/build/claude-context/01-project-overview.md`.

## 2. Source-of-truth order (highest first)

1. `docs/prd.md` — MVP scope (MoSCoW).
2. `docs/spec/docs/function-list.md` (91 functions) + `docs/spec/docs/consistency-contract.md`
   (shared roles, states, field names).
3. Module specs `docs/spec/specs/spec-{AUT,PRF,AIT,EXP,BKG,ADM,IAC}.md` — §5 FR, §5.1 I/O
   contract, §5.2 BR, §10 open questions.
4. Screen specs `docs/spec/screens/` (Markdown). PNG mockups are legacy and NOT authoritative.
5. `data/` — data model, `schema.sql` (PostgreSQL), deterministic synthetic seed.

Spec files are **nested** in `docs/spec/specs/`, so `start_feature.py` needs `--spec`
(see §4). Never edit `specs/<feature>/spec.md`: it is a read-only snapshot of `docs/spec/`.

## 3. Hard rules for Claude Code in this repo (on top of AGENTS.md §4)

1. `docs/spec/` and `data/` are human-owned. Propose changes as text; edit only when the
   human asks for that exact change in the current prompt (settings.json will ask first).
2. Test-first is non-negotiable: write the BR/acceptance-scenario test, run it, show it
   **failing for the right reason**, and only then write code. Never edit a test to make it
   pass; if a test looks wrong, stop and say which and why.
3. Never `git push`, merge, `git reset --hard`, `git clean`, or delete files without asking.
   Never press "Merge pull request". Never commit on a teammate's feature branch unless the
   human says that branch is now theirs.
4. No new dependency that `plan.md` does not list without asking.
5. Same failure after 3 fix attempts → stop, write it in the build log, ask the human.
6. Every agent run that changes `specs/`, `src/` or `tests/` gets a build-log entry
   (`docs/build/build-log.md`). Draft it for the human at the end of the run.
7. "Tests pass" is not "feature works". Before claiming a slice is done, run it through the
   API/UI path the user will use (see `05-review-playbook.md`; AIT round 2 is the cautionary tale).
8. Synthetic data only; secrets only in `.env` (git-ignored). Mock keys are fine; real keys never.

## 4. The build loop (Session 8 Workshop Guide, Part B)

| # | Step | What to run | Gate |
|---|---|---|---|
| 1 | Prepare | `git switch main && git pull` → `uv run tools/start_feature.py --spec docs/spec/specs/spec-<MOD>.md <MOD> --name core` → `git switch -c <printed folder name>` → read-only field-to-data check | every NOT FOUND fixed in docs/spec or data before Step 2 |
| 2 | Plan | `/speckit-plan` with the team's stack argument | team approves 8-point plan review |
| 3 | Tasks | `/speckit-tasks` asking for a test task before every code task | every BR in slice has a test task |
| 4 | Analyze | `/speckit-analyze` (read-only) | CRITICAL fixed; HIGH fixed or logged |
| 5 | Tests first | `/speckit-implement` Setup + Foundational + test tasks only | tests fail for the right reason |
| 6 | Code | `/speckit-implement` code tasks only | all tests pass, no test edited |
| 7 | Verify | quickstart from a clean clone + click the demo path | on ≥2 laptops (macOS + Windows) |
| 8 | Log & review | build log, commit `feat(<MOD>): US-x ...`, PR, review by a non-author | then merge |

Before `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`: `uv run tools/start_feature.py --check`.
After a fresh clone or switching feature: `uv run tools/start_feature.py --use specs/<folder>`.
Second feature onward reuses the stack and structure of `specs/001-*/plan.md`, and starts only
after the first feature's Setup + Foundational phases are merged (otherwise scaffolds conflict).

Details, arguments to paste, and the MVP Alpha gates G1–G8: `docs/build/claude-context/02-build-workflow.md`.

## 5. Where we are now (update this section when it changes)

- Deadline: tag `mvp-alpha` on `main` with `docs/build/mvp-alpha-checklist.md` filled in.
State checked on 30 Oct 2026 at `main` = `fa4d9d2` (details: `03-module-status.md`).

- **On `main`**: AIT (`specs/001-ait-core`, PR #6 merged as `3e0e047`), PRF
  (`specs/002-prf-core`, PR #8 squash-merged as `222216d`), EXP (`specs/001-exp-core`, merged
  with `ada9e44` "unify functional prototype on JSON runtime"), BKG US-4 (`specs/004-bkg-core`,
  PR #17 merged as `343e4ce`), BKG US-5 + US-3 (`specs/011-bkg-manage`, PR #20 merged as
  `5cae545` and PR #22 merged as `7057d5c`), BKG US-6 (`specs/012-bkg-list`, PR #25 as `c3f0c64`),
  BKG US-1 + US-2 (`specs/013-bkg-schedule`, PR #28 as `fa4d9d2`), BKG spec #57–#82 (PR #21, #24,
  #26, #27). `npm test` on `main` `fa4d9d2`: 76 files, 503 tests pass; `npm run lint` passes
  (run 30 Oct 2026).
- **Not merged**: AUT (`001-aut-registration`, feature folders `001`–`010-aut-*`), ADM
  (`003-adm-core`), `member/spec-consistency`, `ngthu/update-specs`.
- **BKG**: owned by the human running this session. **Code complete on `main` `fa4d9d2`**: all six
  stories US-1..US-6 (F-SCHED-01..10) in four rounds — `specs/004-bkg-core` (US-4, PR #17),
  `specs/011-bkg-manage` (US-5 + US-3, PR #20, #22), `specs/012-bkg-list` (US-6, PR #25),
  `specs/013-bkg-schedule` (US-1 + US-2, PR #28); 503 tests + lint pass; spec decisions #26–#82 on
  `main`; summary in build-log Entry 31. Still missing: the Windows run (G1) for 004, 011, 012, 013,
  and post-merge non-author reviews of PR #17, #22, #25, #28 (all merged without a GitHub review;
  AIT/PRF/EXP owners: `applyBatch` in `src/lib/demo/json-repository.ts`; PRF owner: Provider/Agency
  navigation links; EXP owner: the "Xem lịch trống" link on the Explore Provider page). Read `docs/build/claude-context/04-bkg-brief.md` and
  `specs/011-bkg-manage/tasks.md` before doing anything on BKG.
- **IAC**: no module of its own; only `src/lib/demo/commercial-handoff-service.ts` and the
  shared `/messages` page (Quote/Chat handoff from Explore and AIT).
- **Runtime**: all modules on `main` share one JSON runtime
  (`src/lib/demo/json-repository.ts`): the CSV seed is copied once to `.demo-data/runtime.json`
  (git-ignored) and every write rewrites that file; tests use a volatile in-memory copy.
  PostgreSQL is the target schema but `src/lib/db/client.ts` is still a stub. Login is a demo
  session, not AUT.
- **Known drift**: `specs/002-prf-core/plan.md` lists Next.js 15, Drizzle, Cloudinary and msw,
  while `package.json` has Next.js 14 and none of those. Point this out to the PRF owner; do not
  silently ignore either file.

## 6. Context files (read on demand, not all at once)

| File | Read when |
|---|---|
| `docs/build/claude-context/01-project-overview.md` | you need product, roles, modules, data facts |
| `docs/build/claude-context/02-build-workflow.md` | running any Spec Kit step or filling the checklist |
| `docs/build/claude-context/03-module-status.md` | before touching or reviewing any module |
| `docs/build/claude-context/04-bkg-brief.md` | any BKG work |
| `docs/build/claude-context/05-review-playbook.md` | Step 7 verify / reviewing a teammate's PR |
| `docs/build/claude-context/06-lessons-learned.md` | before your first run in a session |

Project slash commands: `/team-status`, `/bkg-start`, `/verify-module <MOD>`.

## 7. Commands

- Environment: `uv run tools/check_env.py --repo`
- Seed: `python data/scripts/generate_seed.py`, `python data/scripts/validate_seed.py`
- Spec snapshot: `uv run tools/start_feature.py --check | --refresh | --use specs/<folder>`
- App (one shared Next.js app, Node ≥ 22): `npm ci` (install exactly from `package-lock.json`),
  `npm test` (Vitest), `npm run lint` (`tsc --noEmit`), `npm run dev`.
- Demo data: `npm run demo:seed` (create `.demo-data/runtime.json` from `data/seed/*.csv`),
  `npm run demo:reset` (overwrite it from the seed again).
- Demo login: cookie `hab_demo_account` (guest | agency | provider | ubnd | hdt, see
  `src/lib/auth/demo-session.ts`), switched with the `RoleSwitcher` component.
- `npm run lint` rewrites the tracked `tsconfig.tsbuildinfo`; do not commit that change.
- Use `git --no-pager ...` for log/grep/diff so output is not trapped in a pager.
- `.claude/skills/speckit-*` is a verbatim copy of `.agents/skills/speckit-*` (Spec Kit 1.0.1,
  integration agy). If Spec Kit is upgraded, re-copy; do not edit either copy by hand.
