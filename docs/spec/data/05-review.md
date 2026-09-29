---
artifact: 05-review.md
step: S6
generated: 2026-09-28
sources: 01, 02, 03, 04, seed coverage (all present); BOUNDARY from architecture/context.md
---

# 05 — Data-model review

Each criterion is scored Pass / Fail / Not assessed with evidence quoted from the input. "Not assessed"
is used only when the slot a criterion depends on was absent; a Pass is never awarded by default. For
each Fail, the minimum change is proposed — not a redesign. Criteria 1–6 are the Batini–Ceri–Navathe
conceptual-quality set; criterion 7 is process-specific.

## Rubric

| Criterion | Result | Evidence quoted from the input | Minimum change proposed |
|---|---|---|---|
| 1. Completeness | Pass | Every FIELDS output field lands somewhere: Booking outputs (`agreed_price`, `hold_expires_at`, `status`) → `bookings`; F-ADMIN-03..10 metrics are aggregates over `bookings`/`agency_profiles`/`provider_profiles` (§04 marks display nouns as views). Explore card capacity is derived as `1..max_participants`, so no separate recommended-group-size field is required. | — |
| 2. Correctness | Pass | "Every newly created booking MUST have initial status On hold ... one slot" (F-SCHED-03) → `BOOKING ||--|{ BOOKING_STATUS_HISTORY` and a create-time On-hold row; "at most one Active Chat per Agency–Provider pair" (F-CHAT-01) → `AGENCY_PROFILE ||--o{ CHAT_SESSION` plus a partial-unique-on-Active constraint (07). Cardinalities match their evidence sentences in 03. | — |
| 3. Minimality | Pass | The earlier duplicate `account_status` authority is resolved: `user_accounts.account_status` is stored once, while Agency Profile reads it as a derived view (04 Type conflicts). Aggregate dashboard fields and Explore capacity remain derived rather than duplicated. | — |
| 4. Readability | Pass | 03 records, per relationship, a forward and reverse sentence a non-technical reader can check aloud, e.g. "An Agency profile attends zero or more Bookings / Each Booking is for one Agency profile" (F-SCHED-03..07). | — |
| 5. Extensibility | Pass | Adding an online **payment/settlement** record (currently out of scope, F-SCHED-07 "payment ... outside MVP") is additive: a new `payment` entity referencing `bookings`, with no change to existing keys or cardinalities. | — (additive only; confirm before building) |
| 5b. Extensibility (limit) | Not assessed | Multi-slot / multi-session Bookings are explicitly excluded ("one slot", BKG BR-016); supporting them later **would** need a structural change (Booking→Slot 1:N). Source defers this, so it is not assessed as a defect. | Raise as a business decision if multi-session tours are ever in scope. |
| 6. Integration | Pass | BOUNDARY names Email, AI (OpenAI), Maps (Google), Media (Cloudinary) as external (context.md). The model stores only metadata: `stored_files.storage_key` points to external object storage; no file bytes, no AI weights, no map tiles are stored relationally. No conflict. | — |
| 7. Traceability | Pass | Every relation subsection in 04 and every row of the 02 long-form carries a Function-ID citation; 03 cites each relationship; enum value sets in 04 trace to `schema.sql` CHECK constraints. | — |

## Seed coverage

Synthetic-only rows use reserved `example.invalid` addresses and provisional `DEMO-HN-*` village
codes. The logical model contains 46 entities and [`seed/`](seed/) now contains exactly one entity
CSV for each of them. The machine-readable evidence is [`seed/seed_coverage.json`](seed/seed_coverage.json):
45 entity files contain at least eight rows; `roles.csv` contains the complete three-row closed
domain permitted by `roles_code_chk`. Generating five ordinary Role rows would require invalid or
duplicate primary-key values, so this is recorded as a justified S5 exception rather than a false
Pass. Foreign-key integrity was checked programmatically across 666 non-null references with zero
violations.

| Scenario ID | Rows that make it runnable | Covered? |
|---|---|---|
| ordinary-01 | 8 linked Agency–Provider–Experience chains with users + villages | Yes |
| boundary-otp | one OTP with attempt=5, resend=3, invalidated at exact expiry | Yes |
| empty-village | inactive Village row with no active Experience | Yes |
| exception-cancelled | terminal Cancelled Booking row | Yes |
| exception-closed-chat | terminal immutable Closed Chat row | Yes |
| exception-rejected-registration | rejected Registration Request retained | Yes |
| permission-ubnd-scope | UBND Admin row linked to exactly one Village assignment | Yes |
| kpi-period | booking + status history reproducing created-at period and as-of status | Yes |

Row-kind check is recorded per entity in `seed_coverage.json`, rather than inferred from one global
example. Boundary values include OTP attempt/resend limits, zero-valued scores/weights and maximum
file size. Empty cases use nullable optional relations or parent rows with no children. Exceptional
states include Cancelled, Closed, Rejected, Revision Required, expired/invalidated and Disabled.
Static catalogs and association tables without a lifecycle state are marked `not applicable`; they
are not mislabeled as containing an exceptional state.

## Consolidated open questions

Grouped by owner, ready to paste back into the owning module's Open-questions section. The
specification stays the single source of truth; the model applies the stated default and keeps the
question visible.

| # | Owner | Question | Blocking? | Default applied | Consequence if the default is wrong |
|---|---|---|---|---|---|
| Q-05 | AUT/PRF | [NEEDS CLARIFICATION: Is `tax_id` and Provider registration number globally unique across current and rejected history, or only across current approved entities?] | No | Enforce uniqueness on current approved entities; retain rejected history. | A valid re-registration may be blocked, or duplicate legal identities may be admitted. |
| Q-11 | PRF/data | [NEEDS CLARIFICATION: Which authoritative Village catalog and stable source key will replace provisional `DEMO-HN-*` codes before production?] | Before production | Keep provisional source codes and never key by village name alone. | Production import cannot safely upsert or reconcile Village references. |
| Q-10a | PRF/AIT | [NEEDS CLARIFICATION: Must unaccepted AI description drafts persist, and what is their retention period?] | No | Persist with nullable `accepted_at`; archive/delete only after a retention policy is approved. | Abandoned drafts either grow indefinitely or disappear before an expected resume/audit. |
| Q-14 | AUT | [NEEDS CLARIFICATION: May several UBND Admin accounts be assigned to the same Village?] | No | Allow many UBND Admin accounts per Village; each account has exactly one Village. | Authorization scope or staffing assignments may be implemented incorrectly. |
| Q-10b | AIT | [NEEDS CLARIFICATION: Are Recommendation Results persisted per matching run for traceability, or transient?] | No | Persist each run and its ranked results. | Storage may be unnecessary, or the explanation/audit trail may be lost. |
| Q-12 | EXP | [NEEDS CLARIFICATION: Which actor may approve and activate a Draft ranking-parameter version, and through which function?] | Before activation | Store Draft/Active/Retired; do not activate without an authorized workflow. | An unapproved ranking configuration could become live. |
| Q-06 | data owner | [NEEDS CLARIFICATION: What retention periods apply to rejected registrations, closed chats and files, audit logs, expired tokens and unaccepted AI drafts?] | Before production | Use RESTRICT/archive and retain evidence until a policy is approved. | Evidence may be deleted prematurely or retained indefinitely. |

## Files produced

| File | Step | Status |
|---|---|---|
| `01-entity-dictionary.md` | S1 | Reshaped to prompt.md contract (Entities / Implied / Conflicts / Open questions). |
| `02-crud-matrix.md` | S2 | Converted to long form (321 interaction rows) + coverage + anomalies. |
| `03-erd.mmd` | S3 | Conceptual ERD; 60 relationships each with forward/reverse sentence + citation. |
| `04-data-model.md` | S4 | 47 relations with columns/type/required/key/citation; embedded diagram matches 03 byte-for-byte (67 relationships, verified). |
| `05-review.md` | S6 | This file. |
| `seed/*.csv` | S5 | 47/47 entity CSVs; per-entity evidence in `seed_coverage.json`; loaded into PostgreSQL 16 with every FK / CHECK / UNIQUE / EXCLUDE / trigger enforced — 0 violations. |
| `06-physical-data-model.md`, `07-data-dictionary.md`, `08-physical-erd.mmd`, `schema.sql` | (supplementary) | PostgreSQL candidate; `schema.sql` verified to create cleanly and load the seed on PostgreSQL 16. |

## Executable validation (2026-09-29)

`schema.sql` and all 47 seed CSVs were loaded into a live PostgreSQL 16 instance. Results: the schema
creates cleanly (47 tables) and the full seed loads under one transaction with every referential,
CHECK, partial-unique, GiST **EXCLUDE** (no overlapping On hold/Booked bookings) and **trigger**
(Closed-chat immutability, `group_size <= max_participants`) constraint enforced by the engine — 0
violations. Negative tests confirmed the new guards actively reject an overlapping booking, an
over-capacity group size, and a message posted after a chat was closed.

Two pre-existing `schema.sql` defects were found and fixed during this validation (they had never been
run on a real engine before): the `bookings` overlap EXCLUDE used `start_at + interval` — only STABLE,
not IMMUTABLE, so PostgreSQL rejected it; it now excludes on a plain `end_at` column. The booking↔chat
foreign keys form a cycle and are now `DEFERRABLE INITIALLY DEFERRED` so the seed loads in one
transaction.

## Human gate

An AI is generous scoring itself. The team must challenge at least one **Pass** above and argue the
opposite — start with criterion 6 (Integration): is storing only `stored_files` metadata truly
sufficient once Email/AI/Maps callbacks (delivery status, run IDs, route cache) need to be persisted?
