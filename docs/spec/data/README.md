# Hanoi Artisan Bridge — data package

Session 5 data-model and synthetic-seed package, arranged to the `From Spec to Data Model` prompt-pack
output contract (files `01`–`05` + `seed/`), with the PostgreSQL physical candidate kept alongside.
Baseline requirements: the revised `docs/spec/` (Function List, consistency contract, seven module
specs). Booking status enum is **On hold / Booked / Completed / Cancelled** ("Booked" is canonical).
No real person's or business's records belong in seed data.

This revision applies the review punch-list (see `CHANGELOG_SUMMARY.md`): **47 tables/entities**, and
`schema.sql` + the full seed have been **loaded and validated on PostgreSQL 16** — every FK, CHECK,
UNIQUE, GiST EXCLUDE and trigger passes.

## Read in order

1. [`01-entity-dictionary.md`](01-entity-dictionary.md) — S1: input map, canonical entities (THING/EVENT), implied entities, conflicts, open questions.
2. [`02-crud-matrix.md`](02-crud-matrix.md) — S2: long-form (function × entity) interactions, coverage per entity, anomalies.
3. [`03-erd.mmd`](03-erd.mmd) — S3: conceptual ERD; each relationship carries a forward/reverse reading + citation.
4. [`04-data-model.md`](04-data-model.md) — S4: logical relations (columns, types, keys, citations); embedded diagram matches `03` byte-for-byte.
5. [`05-review.md`](05-review.md) — S6: 7-criterion quality rubric, seed coverage, consolidated open questions, files produced.
6. [`seed/`](seed/) — S5: exactly 46 entity CSVs + JSON coverage/scenario manifests; FK integrity verified.

Physical candidate (kept, governed by the logical model above):

- [`06-physical-data-model.md`](06-physical-data-model.md) — table groups, physical choices, migration order.
- [`07-data-dictionary.md`](07-data-dictionary.md) — physical columns, types, nullability, constraints.
- [`08-physical-erd.mmd`](08-physical-erd.mmd) — key-level physical ERD.
- [`schema.sql`](schema.sql) — executable PostgreSQL candidate DDL.
- [`scripts/generate_seed.py`](scripts/generate_seed.py) — deterministic synthetic-seed generator.

## The `.mmd` / `.md` split (deliberate)

`03-erd.mmd` is a diagram and nothing else, so it is a diagram file (front matter is carried as `%%`
Mermaid comments to keep the file renderable). `04-data-model.md` is a document that contains a diagram.
They are not merged.

## Conventions

- Citations use Function IDs (`F-*`) and module rules (`AUT/PRF/AIT/EXP/BKG/IAC/ADM BR-*/§n`).
- `C`, `R`, `U`, `D` = create, read, update, delete; `D` does not imply physical deletion where history must survive.
- Generic logical types: `string int decimal date datetime time boolean uuid enum object`. Vendor, concrete ID type and token storage are Plan decisions.
- `[NEEDS CLARIFICATION]` marks an unresolved source requirement — not permission to fill the gap with a design guess.
