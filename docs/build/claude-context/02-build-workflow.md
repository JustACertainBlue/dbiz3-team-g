# 02 — Build workflow (Session 8 Workshop Guide, adapted to this repo)

Source: DBIZ3 Session 8 Workshop Guide (4 Oct 2026), Spec Kit v1.0.1, Session 8 build kit,
constitution in `.specify/memory/constitution.md`.

## Constitution (5 principles, course convention)

I. The spec is the source of truth (`docs/spec/`, `data/`). Code that disagrees is wrong until a
   human changes the spec. Unknown → `[NEEDS CLARIFICATION]` and stop.
II. Business rules are test-first (non-negotiable): every BR and every acceptance scenario of the
   slice gets an automated test, written and **seen failing** before the code.
III. Thin vertical slices: one user story at a time, end to end (screen, logic, data), P1 → P2 → P3.
   Done = tests pass + runs from a clean clone with `quickstart.md`.
IV. Synthetic data, no secrets.
V. Humans approve every change: agent works on a branch, shows changed files with reasons,
   never pushes or merges; a teammate reviews every PR.

Technology choices are not in the constitution; they live in `plan.md`.

## Bridge script: `tools/start_feature.py`

Spec Kit wants `specs/<feature>/spec.md` + `.specify/feature.json` (not in Git). The script copies
the module spec as a read-only snapshot with a SHA-256 header.

```bash
# our specs are nested, so --spec is required
uv run tools/start_feature.py --spec docs/spec/specs/spec-BKG.md BKG --name core
uv run tools/start_feature.py --check      # before plan / tasks / implement; exit 1 = DRIFT
uv run tools/start_feature.py --refresh    # after a human changed docs/spec/
uv run tools/start_feature.py --use specs/001-ait-core   # after clone / switching feature
```

The feature number is the next free `NNN` **in the current checkout's `specs/`**. If AIT is not
merged into `main` yet, a BKG feature created from `main` also gets `001-`. Check
`git branch -r` and other members' feature folders first and agree on numbering.

## Step 1 — Prepare

```bash
git switch main && git pull
uv run tools/start_feature.py --spec docs/spec/specs/spec-<MOD>.md <MOD> --name core
git switch -c <folder name it printed>
```

Then the read-only consistency check (paste to the agent):

```text
Read-only task. Do not create, edit or delete any file. For module <MOD>, list every field in the
Input/Output table (section 5.1) of docs/spec/specs/spec-<MOD>.md that is stored by the system. For
each field, give the table and column in data/schema.sql (and data/04-data-model.md) where it is
stored, or write NOT FOUND. Answer as one table.
```

Every NOT FOUND is fixed in `docs/spec/` or `data/` by its owner before Step 2.

## Step 2 — Plan: argument for `/speckit-plan`

```text
Stack (decided by the team): <language+version>, <framework>, <storage>, <test runner>.
It must run on macOS and Windows with free tools.
Scope of this feature: user story <US-x> (P1) only. List every other user story of the spec as out of scope.
Data: the data model, schema and seed in data/ are the source of truth and must not change.
data-model.md must point to data/04-data-model.md and data/schema.sql and list only which tables
this slice reads and writes, and through which FR or BR. Do not redefine any field.
Login and deployment are out of scope until Session 11; if an FR needs them, record it in Complexity Tracking.
quickstart.md must give the exact commands to install, load the seed, run the tests and start the
app, from a fresh clone, on macOS and Windows.
Use the stack and project structure in specs/001-ait-core/plan.md.
```

Plan review (team answers yes/no to each; one "no" sends it back):
1. Technical Context names only the chosen stack, no extra framework/service.
2. No NEEDS CLARIFICATION left in plan.md or research.md.
3. Constitution Check shows every principle with a reason, not only "PASS".
4. data-model.md changes nothing in `data/`.
5. Every route/screen/function in `contracts/` traces to an FR.
6. quickstart.md can be run by someone who was not in the room.
7. Every interpretation in research.md (not stated in the spec) is copied to the spec's open questions.
8. No out-of-scope user story sneaked in.
Then update AGENTS.md §2 with the stack and real commands (owner: khanhlinhvu) via PR.

## Step 3 — Tasks: argument for `/speckit-tasks`

```text
Tests are required by the constitution (Principle II). For every business rule in this slice and
every acceptance scenario of the user stories in scope, create a test task that comes before the
code task it checks. Include one test that loads the seed data and checks one value that the
Session 5 data package already states. Keep the user stories that plan.md marks out of scope out of tasks.md.
```

Check: each BR touched has its own test task; tests precede code; every task names a file path;
the first user-story phase is demonstrable on its own.

## Step 4 — Analyze

`/speckit-analyze` (read-only). CRITICAL (incl. any constitution conflict) → fix before Step 5.
HIGH → fix or log why it does not affect this slice. MEDIUM/LOW → log. A spec fix goes into
`docs/spec/` (by its owner), then `--refresh`, then re-check plan.md and tasks.md.

## Step 5 — Tests first

```text
/speckit-implement Only the Setup and Foundational phases and the test tasks of the <US-x> phase
(<T001 to T0nn>). Do not write any code that makes those tests pass. Run the tests at the end and show me the output.
```

Test reviewer checks: the tests fail, and fail because code is missing (not a typo).

## Step 6 — Code

```text
/speckit-implement Only the code tasks of the <US-x> phase (<T0xx to T0yy>). Do not change any test.
If a test seems wrong, stop and tell me which and why. Run all tests at the end and show me the
output. Mark finished tasks [X] in tasks.md.
```

Stop rules: agent wants to change a test/spec/constitution/data → stop, human decides. Same
failure 3 times → stop, log, ask. Package not in plan.md → team decides. Unknown command → refuse, ask.

## Step 7 — Verify (every member, own laptop)

`git pull` the branch → `--use specs/<folder>` → follow quickstart.md from the top → all tests
pass → click the demo path vs acceptance scenarios → pick one BR, find its test and the code line.
Full reviewer procedure: `05-review-playbook.md`.

## Step 8 — Log and review

Build-log entry → commit `feat(<MOD>): US-x <summary>` → push branch (human) → PR (GitHub fills
`.github/pull_request_template.md`) → non-author reviews + runs Step 7 → merge (human).

## Roles (rotate per slice)

Driver (types, shares screen) · Spec keeper (checks every decision/task against an FR/BR) ·
Data keeper (blocks unagreed data-model changes) · Test reviewer (reads tests before code, checks
they can fail) · Logger (build-log entry right after each run).

## Build log (`docs/build/build-log.md`)

One entry per agent run that changed `specs/`, `src/` or `tests/`, written right after the run:

| Field | Value |
|---|---|
| Path and agent | A (Claude Code) |
| Command and argument | `/speckit-plan ...` (exact argument) |
| Feature and tasks | `specs/00x-...`, tasks `T0xx`–`T0yy` |
| What the agent produced | files created/changed, one line each |
| Human review | Accepted / Changed / Rejected + why |
| Tests | last line of the test run |
| Spec issues found | none / open question added to docs/spec/... |
| Commit | first 7 chars |

Also: §3 spec issues found while building (never fixed silently in code), §4 agent mistakes worth
remembering.

## MVP Alpha (deadline: tag `mvp-alpha` on main before Session 9)

Definition: core modules run end to end on the seed data for their highest-priority user story,
from a clean clone, with BRs covered by passing tests. No login, deployment or polish needed.

| Gate | Evidence |
|---|---|
| G1 Fresh clone runs on ≥ 2 laptops (macOS + Windows) | names |
| G2 P1 story of every core module works on the seed | demo path in checklist §1 |
| G3 Every BR + P1 acceptance scenario has a passing test | last line of test run |
| G4 `start_feature.py --check` OK for every feature | output |
| G5 Analyze CRITICAL/HIGH handled | build log |
| G6 Every change reached main via a reviewed PR | GitHub history |
| G7 No real personal data, no secrets | checked by a member |
| G8 Every agent run logged | build log |

Checklist §3 "Known limitations": write them honestly. A written limitation is part of the plan;
one the instructor discovers is a penalty. A **Must** FR in the P1 story that runs wrong is a defect
to fix, not a limitation.

## Troubleshooting

| Symptom | Fix |
|---|---|
| "no active feature" / "Feature directory not found" | `--use specs/<folder>` |
| DRIFT from `--check` | `--refresh`, re-read plan.md and tasks.md |
| Agent edits `specs/<feature>/spec.md` | reject; change `docs/spec/`; `--refresh` |
| plan.md keeps NEEDS CLARIFICATION | answer in `docs/spec/` under Clarifications, `--refresh`, re-plan |
| data-model.md redefines entities | re-run with the data sentence; reject changes to `data/` |
| tasks.md has no tests | re-run `/speckit-tasks` with the §3 argument |
| "done" but tests not run | run them yourself, paste output back |
| two branches both created the scaffold | keep one; rebase the other after merge |
