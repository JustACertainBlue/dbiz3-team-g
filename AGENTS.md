# AGENTS.md

Instructions for every AI coding agent working in this repository
(Antigravity agent, Claude Code, or any other tool). Humans: keep this file
short, factual and current.

## 1. Project

- Product: `Hanoi Artisan Bridge`, team `G`, course DBIZ3, VJCBI College, Foreign Trade University.
- Current step of the course process: module integration. AIT, PRF, EXP, ADM, BKG and IAC share one functional prototype. AUT PR #11 is integrated with that runtime; its adoption map and quickstart are in `specs/AUT-INTEGRATION.md`. Real email, durable file storage and production deployment remain separate integrations.
- Source of truth for MVP scope: `docs/prd.md`; source of truth for detailed function contracts: `docs/spec/`.
- Source of truth for data: `data/` (data model and seed package from Session 5).

## 2. Tech stack

- Language/Runtime: TypeScript 5.x / Node.js >= 22.0.0
- Web framework: Next.js 14 (App Router) and React 18.
- Database: Supabase PostgreSQL 17 in development. All live APIs/server pages use `src/lib/db/application-store.ts`, verified TLS and the restricted DATABASE_APP_URL login. No live JSON fallback. Ordinary tests use isolated JSON fixtures; hosted tests opt in with npm run test:postgres. Migration history is the guarded private ledger (npm run db:migrate), not Supabase CLI db push. See docs/env/supabase-quickstart.md. File bytes still use local ignored upload directories.
- Login: AUT bcrypt verification and opaque cookie `hab_session`; role, organization and scope load from the shared repository. Four synthetic seed identities retain fixture-password login in development only; production rejects it. Legacy `hab_demo_account` cookies are accepted only by automated tests. Email-dependent flows report unavailable unless the explicitly local `HAB_EMAIL_MODE=dev-outbox` adapter is enabled; never claim it sends real email.
- Test runner: Vitest 2.
- From the repository root: `npm ci`, `python data/scripts/validate_seed.py`, `npm test`, `npm run lint`, then configure the database as in the Supabase quickstart and run `npm run dev`.
- When adding a module, reuse the agreed stack and document integrations and dependencies in that feature's plan.

## 3. Commands that are safe to run

- `uv run tools/check_env.py --repo` : environment and repository check.
- `python data/scripts/generate_seed.py` : regenerates deterministic synthetic seed data.
- `python data/scripts/validate_seed.py` : validates seed coverage, references and business-rule fixtures.
- `npm test`, `npx vitest run` : automated test runs.
- `npm install`, `npm run dev` : install and local development server.
- `git status`, `git diff` : always allowed.
- `uv run tools/start_feature.py --check` : checks the active feature snapshot against `docs/spec/`.
- `npm test`, `npm run lint` : run the current application tests and TypeScript check.
- `npm run db:check`, `npm run db:check:app`, `npm run db:audit`: inspect the configured development database without printing credentials.
- `npm run test:postgres`: explicitly opt in to hosted PostgreSQL tests; their fixture mutations roll back. Ordinary `npm test` does not connect to Supabase.

## 4. Hard rules

1. Never edit files under `docs/spec/` or `data/` unless the human asks for that exact change in the current prompt.
2. Never invent requirements. If the spec is silent or ambiguous, stop and list the question.
3. Never put real personal data in the repository. Seed data is synthetic only.
4. Never write secrets (API keys, passwords, tokens) into any file. Secrets live in `.env`, which is git-ignored.
5. An agent may push feature branches and open pull requests. It never pushes to `main`, never force-pushes, never deletes remote branches or tags, never pushes tags, and never merges (the human merges). This deviates from constitution principle V, which is unchanged (build log §4 row 46); Claude Code enforces it with `.claude/hooks/block-git-push.py`. Never run `git reset --hard`, `git clean` or delete files without asking first.
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
