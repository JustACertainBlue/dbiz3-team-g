---
description: Pre-flight and Step 1 (Prepare) for the BKG module, stopping before /speckit-plan.
---

We are starting module BKG (Schedule/Booking). Read first:
`docs/build/claude-context/04-bkg-brief.md`, `docs/build/claude-context/02-build-workflow.md`,
`docs/spec/specs/spec-BKG.md`, and the stack/structure in `specs/001-ait-core/plan.md` if it exists
on this checkout.

Do these in order and stop at each "STOP" for my answer:

1. Report: current branch, `git status`, whether AIT (PR #6 / branch `001-ait-core`) is merged into
   `origin/main`, and which `specs/NNN-*` folders exist on main and on remote branches. Tell me which
   feature number BKG would get. STOP.
2. Read-only field check (Workshop Step 1): every stored field in §5.1 of spec-BKG.md → table.column
   in `data/schema.sql` / `data/04-data-model.md`, or NOT FOUND. One table. Flag name differences
   (e.g. agreed_price vs agreed_price_total, arrived_at vs arrival_at) as "FOUND (renamed)". STOP.
3. Re-check every finding in §6 of the brief against the current `data/` and spec (they were found
   on 2026-10-01 and may be fixed). For each still open, draft the open-question row for
   `docs/spec/specs/spec-BKG.md` §10 (do not edit the spec). STOP.
4. Present the slicing proposal (brief §7) and the storage options (brief §8) as a decision list
   for the team, with trade-offs tied to BKG rules (BR-005, BR-019, AC-BKG-RACE). STOP.
5. Only when I say "go": run
   `uv run tools/start_feature.py --spec docs/spec/specs/spec-BKG.md BKG --name core`
   from an up-to-date main and create the branch with the printed folder name. Then draft the
   `/speckit-plan` argument from 02-build-workflow.md Step 2 filled with the team's decisions, and
   show it to me. Do not run `/speckit-plan` yourself.

Answer in Vietnamese, keep technical terms in English. Never invent a requirement.
