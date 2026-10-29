# 06 — Lessons learned (agent mistakes worth remembering)

Mirror important rows into `docs/build/build-log.md` §4.

| # | What went wrong | How it was caught | Prevention |
|---|---|---|---|
| 1 | The Antigravity agent, sitting on `main`, could not find the AIT feature and started to create its own feature folder and quickstart. | Human noticed the plan proposed new files during a review task. | Feature work lives on feature branches. Before reviewing: `git fetch --all`, `git branch -r`, `git switch <branch>`. A review task never creates files. |
| 2 | `git grep` / `git log` opened a pager and looked "stuck". | Human saw no prompt. | Use `git --no-pager ...`; press `q` to leave a pager. |
| 3 | After switching branches, `.next/` and `next-env.d.ts` remained untracked. | `git status`. | Check `git status` after every switch; delete build artefacts only with the human's OK. |
| 4 | AIT round 1: data invented by the agent (Đường Lâm village, "Bat Trang Ceramic Guild", fixed score 96.5, max_participants 25) instead of the seed. | Reviewer compared UI with `data/seed/*.csv`. | Constitution I + IV: read the seed; one test must load the seed and assert a value the data package states. Grep for invented names. |
| 5 | AIT round 2: 83/83 tests passed while the UI returned wrong results for every later turn of a session. | Reviewer ran the same prompts in one session vs a fresh session. | Test through the API entry point, including multi-turn flows on one session id. "Tests pass" ≠ "feature works". |
| 6 | Constant score (87.3) for every candidate went unnoticed by tests. | Reviewer looked at the ranking for different inputs. | Add a test that different preferences produce different orderings/scores. |
| 7 | Create actions not idempotent (new quote/chat ID per click). | Reviewer clicked twice. | Every uniqueness BR gets a "do it twice" test. |
| 8 | A reviewer mislabelled a BR in the report. | Re-reading spec §5.2. | Copy BR IDs from the spec table, not from memory. |
| 9 | "Seed max ≤ 20" written in a test comment (actual 18). | Reviewer checked the CSV. | Never state data facts in tests/comments without reading the seed. |
| 10 | AGENTS.md §1–2 still said "stack not decided / no app code" after AIT chose a stack. | Reading AGENTS.md during the Claude Code switch. | After every `/speckit-plan` that sets a stack, update AGENTS.md §2 via PR (Workshop Step 2). |
| 11 | `specs/002-prf-core/plan.md` lists Next.js 15, Drizzle ORM, Cloudinary and msw, but `package.json` on `main` has Next.js 14 and none of them; the code reads the seed through the shared repository. | Comparing plan.md with `package.json` during the 29 Oct 2026 survey. | When the implementation changes the stack or storage, update plan.md in the same PR (or record it in Complexity Tracking). Reviewers diff plan.md's Technical Context against `package.json`. |
| 12 | `mvp-alpha-checklist.md` records commit `f5e7223`, which exists only on `002-prf-core`; PR #8 was squash-merged as `222216d`, so the checked commit is not on `main`. | `git branch -r --merged main` during the 29 Oct 2026 survey. | Fill "Commit checked" after the merge, with the commit on `main` that the `mvp-alpha` tag points to. |
