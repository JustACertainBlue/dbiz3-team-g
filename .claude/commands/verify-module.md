---
description: Step 7 verify of a teammate's module branch; produces a PR review report. Read-only.
argument-hint: <MODULE-ID> [branch]
---

Run Step 7 Verify for module $ARGUMENTS following `docs/build/claude-context/05-review-playbook.md`.
You are the reviewer: do not edit, commit or push anything on that branch.

1. Section A: find and switch to the branch (ask me if more than one candidate), note the commit,
   `--use`, `--check`, `validate_seed.py`, then follow its quickstart.md exactly. Report every step
   that needed something the quickstart does not say.
2. Section B: run the tests (paste the last line), map every BR and acceptance scenario of the
   slice in `docs/spec/specs/spec-<MODULE>.md` to a test (table BR/AS → test file:line or MISSING),
   and point to the code line for one BR.
3. Section C: build the "input → expected" table from `data/seed/*.csv` and the spec for the demo
   path, including fresh-session vs same-session, do-it-twice, boundary and no-result cases.
   Run what can be run from the terminal (API calls, scripts). List the UI cases I must click and
   wait for my screenshots before judging them. Do not evaluate until I say I have sent everything.
4. Section D/E: classify findings with spec IDs copied from §5/§5.2, and draft the report in the
   template, in English, ready to paste into GitHub "Review changes". Give the verdict separately
   in Vietnamese with one-line reasons.
5. Section F: remind me to clean up; ask before deleting anything.
