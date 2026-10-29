# 01 — Project overview: Hanoi Artisan Bridge

Digest of `docs/prd.md`, `docs/spec/` and `data/` as of spec revision 28 Sep 2026
(status "Revised – pending human approval"). If this file and the spec disagree, the spec wins:
fix this file.

## Product

Responsive web platform connecting **Tour Agencies** with **verified Local Providers** of Hanoi
craft-village experiences. Discovery (Explore), AI Tour Matching, contextual Chat, Booking
lifecycle, scoped admin monitoring.

## Roles

| Role | Key rights |
|---|---|
| Guest | Browses Explore (EXP120): price and contact hidden; analytics consent. Cannot see AI Matching. |
| Tour_Agency | Self-registers (email OTP → Pending Approval → HDT Approve / Request More Information / Reject; resubmit via 24h single-use link). Explore, AI Matching, Request Quote (once per Agency–Experience), Chat, reads **own** bookings only. |
| Local_Provider | Account created by UBND (Active). Edits own profile (Draft → Pending Verification → Verified / Revision Required; last Verified version stays published). Manages Experiences. **Owns the whole Booking lifecycle.** |
| ADMIN, `admin_type` = HDT | Hanoi Dept. of Tourism: approves Agencies, creates UBND accounts (1 village each), platform-wide dashboard, disables/enables accounts. Monitoring-only for Provider profiles. |
| ADMIN, `admin_type` = UBND | Creates Local Provider accounts and verifies Provider profiles **only in its one village**; dashboard fixed to that village. |
| System / Background worker | Matching pipeline, schedule sync, 72h hold expiry, ranking auto-tuning. |

ADMIN is one role with two subtypes, never two roles.

## Modules (7 specs, 91 functions)

| Module | Functions | Essence |
|---|---|---|
| AUT | F-AUTH-01..26 (Must) | Registration + OTP (6 digits, 10 min, 5 attempts, 3 resends); login/logout with opaque server-side sessions (not JWT); password recovery (15-min single-use link; 3/email, 5/IP per 15 min); RBAC = role + resource scope on every request, 5-min revalidation, disable revokes sessions. |
| PRF | F-PROFILE-01..07 | Agency profile (only Agency Owner edits; Company Name/Tax ID change → HDT review). Provider profile (major fields → UBND re-verification). **F-PROFILE-04 holds weekly operating hours** (input of BKG availability). Experience CRUD (F-PROFILE-06): no Draft/Publish; active On hold/Booked refs lock price/capacity/duration/location/discounts; delete blocked / archive / hard delete. AI description refine (Should). |
| AIT | F-MATCH-01..16 | Chat-based matching on AIT121: Tour Preference Profile → Verified candidates → hard constraints (availability, capacity, budget, route via Google Maps Distance Matrix) → score/rank → explanations. No-match threshold 60/100 + relaxation. AI failure = Temporary AI Failure + Retry, **no rule-based fallback**. 30-day half-life decay. F-MATCH-10, 11, 13–16 are Should. |
| EXP | F-EXPLORE-01..17 | EXP017 (Agency) / EXP120 (Guest). Behaviour logging, session re-rank (Should). Ranking quality = 50% relevance / 30% click / 20% strong action. Weekly auto-tuning (F-EXPLORE-17) with guard rails. No admin editing of rankings. |
| BKG | F-SCHED-01..10 (Must) | See `04-bkg-brief.md`. Every booking created by the Provider starts **On hold** for 72h; On hold→Booked / Cancelled, Booked→Cancelled (reason required), Booked→Completed only via Mark Group Arrival when now ≥ start_at. |
| ADM | F-ADMIN-01..10 | ADM079 dashboard: 4 cards (Total Agencies, Total Providers, Total Bookings, Active Collaborations), status chart, trend (daily ≤31d / weekly ≤180d / monthly), booking table, top-10 pairs (Booked+Completed); filters time / village (fixed for UBND) / Agency / Provider; no drill-down. |
| IAC | F-CHAT-01..05 | At most one **Active** chat per Agency–Provider pair; Provider may initiate only with Quote/Booking context; text ≤ 4000 chars; files 1–5, ≤ 10 MB (Should); Close is explicit, Closed is immutable and never reopened; latest 50 messages then pagination. |

Won't have in MVP: e-contract, payment/escrow, native app, Village CRUD/verification (Village is a
seeded read-only catalog), AI model retraining, CMS, staff/delegation.

Canonical Booking statuses: `On hold`, `Booked`, `Completed`, `Cancelled` (never "Confirmed",
"Pending", "Expired").

## Data package (`data/`)

- 47 tables, PostgreSQL 16 + `btree_gist`. `schema.sql`, `seed/*.csv`, `seed/load_seed.sql`.
- Deterministic UUIDv5 seed; `seed/manifest.json` → `generated_at = 2026-09-30T00:00:00+07:00`
  (use it as the frozen "now" in tests).
- 26 accounts `thanhvienN@example.invalid`; 8 demo villages DEMO-HN-*: Bát Tràng, Đào Thục,
  Chuông, Hạ Thái (inactive), Sơn Đồng, Quất Động, Vạn Phúc, Phú Vinh. Verified providers:
  Bát Tràng (cap 12), Vạn Phúc (13), Phú Vinh (14), Chuông (15), Quất Động (16). **No Đường Lâm.**
- The DB itself enforces: single Active chat per pair (partial unique), 72h hold CHECK, no
  overlapping On hold/Booked per provider (GiST EXCLUDE), group_size ≤ max_participants
  (trigger), closed-chat/immutable message triggers, single Active ranking version, quote unique
  (agency, experience), one UBND village.
- The backend must enforce (not in DB): booking only for Verified provider + unarchived
  experience, status + history in one transaction, notice period / operating-hours check.
- Verified 2026-10-01: `validate_seed.py` PASS, regeneration byte-identical, loads on PostgreSQL 16.

## Known spec/data inconsistencies (found 2026-10-01; check before relying on them)

1. Seed `role_permissions`: `review_agencies` / `review_providers` have `admin_type` NULL, so UBND
   could review Agencies and HDT approve Providers (contract forbids). Tour_Agency has no
   booking-read permission.
2. Seed lacks Agency accounts in Pending Approval / Rejected (conflicts with F-AUTH-04).
3. IAC SC-008 expects a chat with > 50 messages; seed has 8 messages total.
4. `stored_files` CHECK requires ≥ 1280×720 for every image, incl. chat attachments and scans.
5. `usage flow.md` still has a Provider "Hold or Confirm?" direct-Booked branch (BKG OQ #20/#21).
6. `docs/spec/README.md` links a deleted `revision-summary.md`; data docs 01/02 say 92 functions
   (actual 91); docs 04/07 have column/FK mismatches vs `schema.sql`.
7. Screen specs: VER146 title clash with ADM145; EXP070 locks `group_size`; EXP120 consent marked
   both optional and required; DSC033 lacks View Village; VIL030 barely reachable.
8. PNG mockups show legacy concepts (Confirmed, direct booking, escrow, Draft/Publish, staff).
9. Enum label drift: image categories Activity/Space/Product (schema) vs longer labels (spec).
BKG-specific data findings are in `04-bkg-brief.md` §6.

## Team (PCCV)

| Member | Session 1–7 ownership |
|---|---|
| Vũ Việt Hoàng | Use Case, Git repo, ERD/DB — owner of `data/` |
| Vũ Khánh Linh | Function List, Module Spec — owner of `AGENTS.md` |
| Nguyễn Thị Minh Thư | Screen List/Mockup/Spec — owner of `docs/spec/` |
| Đào Trúc Linh | System Config, User Flow |
| Vũ Minh Thư | Sequence Diagram |
| Đỗ Tiến Quang | Context Diagram |

Build-phase module owners: record them in `03-module-status.md`.
