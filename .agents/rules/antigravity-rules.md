# Team G — Antigravity Agent Always-On Rules

Instructions and constraints for Google Antigravity Agent working on Hanoi Artisan Bridge (DBIZ3, Team G, VJCBI College, FTU).

## 1. Project Context
- **Product**: `Hanoi Artisan Bridge` (Team G).
- **Process Step**: AI Product Development Readiness Review (Session 7 Midterm).
- **Source of Truth for Requirements**: `docs/spec/` (Function list, system architecture, screen specs, module specs).
- **Source of Truth for Data**: `data/` (data model, schema DDL, synthetic seed package).

## 2. Hard Behavioral Rules
1. **Never edit files under `docs/spec/` or `data/`** unless the human explicitly asks for that exact change in the prompt.
2. **Never invent requirements.** If the specification is silent, ambiguous, or contradictory, stop and flag the question.
3. **No real personal data.** All seed data must be strictly synthetic (`@example.invalid` emails, `+8491xxxxxxx` phones).
4. **Never write secrets.** No API keys, tokens, or passwords may be committed. All environment variables reside in `.env` (git-ignored).
5. **Never run destructive git commands.** Do not execute `git push`, `git reset --hard`, `git clean`, or delete files without explicit confirmation.
6. **Report file changes.** After any change, list the changed files and a one-line reason for each.
7. **Minimal scope.** Modify only the files required for the immediate task.

## 3. Safe Verification Commands
- `uv run tools/check_env.py --repo`: Environment readiness verification.
- `python data/seed/generate_seed.py`: Deterministic seed regeneration; leaves `git status` clean.
- `git status`, `git diff`: Safe repository state checks.
