---
description: Read-only snapshot of every module's branch, feature folder, PR and test state; updates nothing without asking.
---

Read-only task. Do not create, edit or delete any file, and do not switch away from the current
branch without telling me first.

1. Run `git fetch --all --prune`, `git --no-pager branch -r`, and `git --no-pager log --oneline -5 origin/main`.
2. For each remote branch that looks like a feature (`NNN-<module>-<slice>` or `member/topic`), list:
   last commit (sha7, date, author), the `specs/` folders it contains
   (`git --no-pager ls-tree -d --name-only origin/<branch> specs/`), and whether it is merged into main
   (`git branch -r --merged origin/main`).
3. If `gh api` works here, list open pull requests with number, title, branch, author and review
   state (`gh api repos/{owner}/{repo}/pulls?state=all`). If it does not, say so and skip.
4. On the current checkout only: run `uv run tools/start_feature.py --check` and, if a quickstart
   exists for the active feature, its test command; paste the last line.
5. Compare with `docs/build/claude-context/03-module-status.md` and CLAUDE.md §5. Output:
   - a table Module | Branch | Feature folder | PR | Merged? | Last commit | Notes;
   - the list of rows in 03-module-status.md that are now outdated, with the proposed new text.
6. Ask me before writing anything to 03-module-status.md or CLAUDE.md.

Answer in Vietnamese, keep technical terms in English.
