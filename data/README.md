# Hanoi Artisan Bridge — Data Package

This directory contains the Session 5 data model, schema DDL, and synthetic mockup seed package for Hanoi Artisan Bridge.

## Directory Structure

- [`data-model-HAB.md`](data-model-HAB.md): Canonical logical data model and Mermaid ERD with Section 11 Privacy Declaration.
- [`schema/`](schema/):
  - [`schema.sql`](schema/schema.sql) / [`schema-HAB.sql`](schema/schema-HAB.sql): Executable PostgreSQL candidate schema defining all 46 entities, primary keys, foreign keys, and indexes.
- [`seed/`](seed/):
  - 46 synthetic entity CSV files.
  - [`generate_seed.py`](seed/generate_seed.py): Deterministic generator script.
  - [`load_seed.sql`](seed/load_seed.sql): SQL bulk-loader.
  - [`manifest.json`](seed/manifest.json) & [`seed_coverage.json`](seed/seed_coverage.json): Seed integrity and coverage tracking.
  - [`README.md`](seed/README.md): Reproducibility documentation and seed commands.
- [`scripts/`](scripts/): Auxiliary data validation and seed generator scripts.
