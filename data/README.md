# Hanoi Artisan Bridge — data package

This folder is the Session 5 data-model and synthetic-seed package. The current baseline is the revised requirements in [`docs/spec/`](../docs/spec/README.md), especially the [Function List](../docs/spec/docs/function-list.md), [shared consistency contract](../docs/spec/docs/consistency-contract.md), and seven [module specs](../docs/spec/specs/). No real person's or real business's records belong in seed data.

## Read in order

1. [`model/01-entity-dictionary.md`](model/01-entity-dictionary.md) — input map, canonical entities, aliases, and ownership.
2. [`model/02-crud-matrix.md`](model/02-crud-matrix.md) — every one of the 91 Function IDs mapped to data reads/writes.
3. [`model/03-conceptual-erd.mmd`](model/03-conceptual-erd.mmd) — business entities and relationships, without implementation fields.
4. [`model/04-logical-data-model.md`](model/04-logical-data-model.md) — candidate relations, natural keys, attributes, constraints, and data lineage.
5. [`model/05-review.md`](model/05-review.md) — structural audit, outstanding decisions, and readiness gates.
6. [`model/07-physical-data-model.md`](model/07-physical-data-model.md) — PostgreSQL candidate, table groups and migration order.
7. [`model/08-data-dictionary.md`](model/08-data-dictionary.md) — physical tables, columns, types, nullability and constraints.
8. [`model/09-physical-erd.mmd`](model/09-physical-erd.mmd) — key-level physical ERD.
9. [`schema.sql`](schema.sql) — executable PostgreSQL candidate DDL.
10. [`seed/README.md`](seed/README.md) — executable seed-data contract and scenario coverage.
11. [`seed/generated/manifest.json`](seed/generated/manifest.json) — generated row counts and validation result.

The conceptual/logical model is approved for physical drafting. PostgreSQL is used as the candidate DBMS because the current System Configuration names it; this remains subject to the later Plan decision. Physical types, indexes and DDL can be revised without changing the approved business model.

## Conventions

- Canonical names are singular business nouns in prose and `snake_case` candidate relation names in the logical model.
- `C`, `R`, `U`, `D` mean create, read, update, delete. `D` does not imply physical deletion where history must survive.
- IDs in the model are opaque persistent identifiers. The database vendor, concrete ID type, temporal column type, and token storage are Plan decisions.
- Citations use Function IDs (`F-*`) and module business rules (`AUT/PRF/AIT/EXP/BKG/IAC/ADM BR-*`).
- `[NEEDS CLARIFICATION]` denotes an unresolved source requirement; it is not permission to fill the gap with a design guess.
