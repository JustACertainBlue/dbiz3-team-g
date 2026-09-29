# Hanoi Artisan Bridge — Mockup Seed Data Package

This directory contains deterministic, synthetic mockup data for Hanoi Artisan Bridge (DBIZ3 Session 5).

## 1. Seed Generation & Reproducibility

- **Generator Script**: `data/seed/generate_seed.py`
- **Regenerate Command**:
  ```bash
  python data/seed/generate_seed.py
  ```
- **Deterministic Namespace / Seed**:
  - UUIDv5 Namespace: `b6aa71de-8e57-4fa3-9a40-8f8f46e50bb7`
  - Re-running the generator reproduces the exact same byte-for-byte CSV outputs and leaves `git status` clean (satisfies Criterion C4 and Check T2).

## 2. Privacy & Synthetic Data Guarantee

- **Gate G4 Declaration**: All data is strictly synthetic.
- No name, email, phone number, address, or tax ID belongs to a real person or active business entity.
- All email addresses use reserved test domains (`@example.invalid`).
- All phone numbers follow simulated prefixes (`+8491xxxxxxx`).

## 3. Package Contents

- **46 Entity CSV Files**: Covering identity, permissions, villages, providers, experiences, bookings, chats, reviews, and audit logs.
- [`load_seed.sql`](load_seed.sql): SQL script to load all 46 CSVs in strict dependency order with deferred foreign key checks.
- [`manifest.json`](manifest.json): Entity count, file catalogue, and table row metrics.
- [`seed_coverage.json`](seed_coverage.json): Attribute and enum domain coverage mapping against the data dictionary.
- [`scenario_manifest.json`](scenario_manifest.json): Edge cases register covering boundary values, empty states, and terminal statuses.

## 4. How to Load Seed Data

1. Run the database schema DDL:
   ```bash
   psql -U <user> -d <database> -f data/schema/schema.sql
   ```
2. Load seed records:
   ```bash
   psql -U <user> -d <database> -f data/seed/load_seed.sql
   ```
