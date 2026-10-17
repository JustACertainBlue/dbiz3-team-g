# AGENTS.md

Instructions for every AI coding agent working in this repository
(Antigravity agent, Claude Code, or any other tool). Humans: keep this file
short, factual and current.

## 1. Project

- Product: `Hanoi Artisan Bridge`, team `G`, course DBIZ3, VJCBI College, Foreign Trade University.
- Current step of the course process: Session 8 EXP implementation and review. The runnable EXP prototype is on `001-exp-core`; its uncommitted extension still needs verification and a reviewed pull request.
- Source of truth for MVP scope: `docs/prd.md`; source of truth for detailed function contracts: `docs/spec/`.
- Source of truth for data: `data/` (data model and seed package from Session 5).

## 2. Tech stack

- EXP plan: Node.js 22+, TypeScript 5, Next.js 14/React 18 and Vitest 2. See `specs/001-exp-core/plan.md` for decisions and limits.
- Canonical schema and synthetic seed are in `data/`. The current EXP prototype reads seed CSVs and keeps new interactions in development-server memory; it does not yet write to PostgreSQL.
- From the repository root: `npm install`, `python data/scripts/validate_seed.py` (or `uv run data/scripts/validate_seed.py`), `npm test`, `npm run lint`, then `npm run dev`.
- When adding a module, reuse the agreed stack and document any new integration or dependency in that feature's plan before implementation.

## 3. Commands that are safe to run

- `uv run tools/check_env.py --repo` : environment and repository check.
- `python data/scripts/generate_seed.py` : regenerates deterministic synthetic seed data.
- `python data/scripts/validate_seed.py` : validates seed coverage, references and business-rule fixtures.
- `git status`, `git diff` : always allowed.
- `uv run tools/start_feature.py --check` : checks the active feature snapshot against `docs/spec/`.
- `npm test`, `npm run lint` : run the current application tests and TypeScript check.

## 4. Hard rules

1. Never edit files under `docs/spec/` or `data/` unless the human asks for that exact change in the current prompt.
2. Never invent requirements. If the spec is silent or ambiguous, stop and list the question.
3. Never put real personal data in the repository. Seed data is synthetic only.
4. Never write secrets (API keys, passwords, tokens) into any file. Secrets live in `.env`, which is git-ignored.
5. Never run `git push`, `git reset --hard`, `git clean` or delete files without asking first.
6. After any change, show the list of changed files and a one-line reason for each.
7. Change only the files the current task needs. Never reformat, rename or reorder files you were not asked to touch.

## 5. Repository map

| Path | Owner | Content |
|---|---|---|
| `docs/spec/` | humans | Spec Document (read-only for agents) |
| `docs/prd.md` | humans | Approved MVP scope and priorities |
| `data/` | humans | Data model, seed generator, seed files (read-only for agents) |
| `docs/env/` | humans | Environment Readiness Report |
| `.specify/` | Spec Kit | Templates, scripts, constitution |
| `.agents/` | Antigravity | Workspace rules and Spec Kit skills |
| `.claude/` | Claude Code | Spec Kit skills (Path A members only) |
| `tools/` | humans | Helper scripts |

## 6. Conventions

- Start every task from an up-to-date main: `git switch main`, `git pull`, then a new branch.
- Build-feature branches use the feature folder name, for example `001-exp-core`; other work may use `member/short-topic`.
- One owner per shared file (see section 7). Others propose changes to that file through a pull request.
- Commit messages: `type: summary` where type is one of `feat`, `fix`, `docs`, `chore`, `test`.
- Language: code, comments and commit messages in English.

## 7. File owners

| File or folder | Owner (member) |
|---|---|
| `AGENTS.md` | Group G (khanhlinhvu) |
| `docs/spec/` | Group G (nguyenthu) |
| `data/` | Group G (viethoang) |
