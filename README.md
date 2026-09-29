# Hanoi Artisan Bridge

Hanoi Artisan Bridge is a responsive web platform that connects Tour Agencies with verified Local Providers offering craft-village experiences. It supports discovery, AI-assisted matching, contextual communication, Booking management and scoped public-sector monitoring for Hanoi Department of Tourism and UBND administrators.

The current MVP scope, priorities and business decisions are defined in [docs/prd.md](docs/prd.md). The Function List and module specifications are the authoritative detail for individual functions.

## Repository map

| Path | Content |
| --- | --- |
| [docs/prd.md](docs/prd.md) | Product requirements and MVP MoSCoW scope |
| [docs/spec/](docs/spec/) | Function List, architecture, module specifications, traceability and screen specifications |
| [data/](data/) | Canonical data model, ERDs, PostgreSQL schema, seed data and validation scripts |
| [AGENTS.md](AGENTS.md) | Instructions and safe commands for AI coding agents |
| [tools/](tools/) | Repository environment checks |
| [GITHUB_GUIDE_VI.md](GITHUB_GUIDE_VI.md) | Vietnamese Git and GitHub guide for team members |

## Quick checks

Run these commands from the repository root:

```powershell
python tools/check_env.py --repo
python data/scripts/generate_seed.py
python data/scripts/validate_seed.py
git status
```

The seed package contains synthetic data only. Do not commit real personal data, passwords, API keys, tokens or `.env` files.

## Database package

The database source of truth is [data/README.md](data/README.md). It documents the logical model, physical PostgreSQL candidate, ERDs, seed-generation command and validation command. A live PostgreSQL load is optional for local development but required before claiming database-engine validation.

## Current project conventions

- Canonical Booking statuses: `On hold`, `Booked`, `Completed`, `Cancelled`.
- `ADMIN` is the role; `HDT` and `UBND` are its authorized subtypes.
- Village is seeded reference data in the MVP. Provider profile verification, not Village verification, determines public eligibility.
- Do not change requirements, data or shared specs without human approval and a documented consistency review.
