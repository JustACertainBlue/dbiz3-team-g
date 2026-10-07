<!--
Sync Impact Report:
- Version change: initial template -> v1.0.0
- List of modified principles:
  - PRINCIPLE_1: I. The Spec is the Source of Truth
  - PRINCIPLE_2: II. Business Rules are Test-First (Non-Negotiable)
  - PRINCIPLE_3: III. Thin Vertical Slices
  - PRINCIPLE_4: IV. Synthetic Data and No Secrets
  - PRINCIPLE_5: V. Humans Approve Every Change
- Added sections: Core Principles, Governance
- Removed sections: Generic placeholder sections (SECTION_2, SECTION_3)
- Technology choices: Explicitly deferred to plan.md as required
- Follow-up TODOs: None
-->

# Hanoi Artisan Bridge Constitution

## Core Principles

### I. The Spec is the Source of Truth
Requirements come only from `docs/spec/`. Data structures come only from `data/` (Session 5 data model, schema and seed). If code and spec disagree, the code is wrong until the spec is changed by a human in `docs/spec/`. Never invent a requirement; mark it `[NEEDS CLARIFICATION]` and stop.

### II. Business Rules are Test-First (Non-Negotiable)
Every business rule (BR-xxx) and every acceptance scenario of the slice being built gets an automated test that is written and seen failing before the code that makes it pass.

### III. Thin Vertical Slices
Build one user story at a time, end to end (screen, logic, data), in priority order P1, P2, P3. A slice is done only when its tests pass and it runs from a clean clone with the commands in `quickstart.md`.

### IV. Synthetic Data and No Secrets
Only the seed data generated in `data/` is used. No real personal data, no API keys or passwords in any committed file; secrets live in `.env`.

### V. Humans Approve Every Change
The agent works on a branch, shows the changed files with a reason for each, and never pushes or merges. A teammate reviews every pull request before merge.

## Governance
Amend only by pull request reviewed by two members; bump the version (MAJOR when a principle is removed or redefined, MINOR when one is added, PATCH for wording). Technology choices are NOT part of the constitution; they belong in `plan.md`.

**Version**: 1.0.0 | **Ratified**: 2026-10-07 | **Last Amended**: 2026-10-07
