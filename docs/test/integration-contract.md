# Integration Contract — Hanoi Artisan Bridge (Session 10)

**Purpose.** One section per cross-module interface: who sends, who receives, the mechanism, the
fields (type, required flag, source line), error behaviour, the FR/BR IDs involved, the tests that
cover it today, and every disagreement between two specifications (or between a specification,
`data/schema.sql` and the code). Disagreements are only marked here; this document does not
propose spec changes.

**Sources.** `docs/spec/docs/consistency-contract.md`, `docs/spec/specs/spec-{AUT,PRF,EXP,AIT,BKG,IAC,ADM}.md`,
`docs/spec/screens/`, `data/schema.sql`, `src/`, `tests/`. Every line reference is to `main`.
Where the specification has no rule, the entry says "spec silent — code does X (path:line)".

**Date / commit.** 2026-11-07, `main` = `51ce772`. Drafted by Claude Code from the specs, schema and
code (AI Use Log); human check pending.
Updated 2026-11-07 at `main` = `0b3c2ed`: Session 10 contract tests for §4–§6, and the fixes of
issues #87 (PR #89) and #88 (PR #90). Line references outside the changed paragraphs are still to `51ce772`.

## Summary

| # | Interface | Sender | Receiver | Main FR/BR | Disagreements |
|---|---|---|---|---|---|
| 1 | Session context | AUT | every module | AUT FR-007, FR-015, FR-016, FR-017, FR-022, BR-011, BR-012, BR-013, AC-AUT-SESSION, SC-006 | 2 |
| 2 | Shared Chat/Booking write lock | IAC, BKG (and EXP/AIT handoff) | JSON runtime / each other | IAC FR-001, BR-004, BR-021, #38, #47, AC-IAC-PAIR; BKG AC-BKG-RACE, AC-BKG-EXPIRY | 0 (2 notes) |
| 3 | Booking Update message | BKG | IAC | BKG FR-008 (F-SCHED-08), BR-012, #5, #13, #26, #27, #49, #55, #56; IAC FR-001, FR-002, #36 | 4 (2 fixed) |
| 4 | Catalog eligibility | PRF | EXP (and AIT, handoff) | PRF BR-007, BR-018, #32; EXP FR-001, BR-001; AIT BR-003, FR-005 | 4 (1 fixed) |
| 5 | Quote / Chat handoff from Explore | EXP | IAC | EXP FR-011, FR-012, BR-009, BR-010; IAC FR-001, #7, #18, #19, #21; AIT BR-018 | 2 |
| 6 | AI matching results to Quote / Chat | AIT | IAC (via shared handoff), EXP catalog data | AIT BR-003, BR-009, BR-010, BR-018, BR-019, FR-005, FR-006, FR-011 | 3 |
| 7 | Dashboard booking metrics | BKG | ADM | ADM FR-002, FR-003, FR-009, FR-010, BR-007, BR-010, BR-014, BR-017, BR-018, BR-019 | 2 |
| 8 | Pending verification list | PRF (and AUT registrations) | ADM | ADM FR-008; PRF BR-006, BR-007, #32 (no FR for the list) | 2 |
| 9 | Agency major legal change review | PRF | AUT (HDT review) | PRF FR-002, BR-017; AUT FR-018 | 5 |

---

## 1. AUT → every module: canonical SessionContext (`hab_session`)

- **Sender:** AUT (login, session store). **Receiver:** every API route and server page.
- **Mechanism:** `POST /api/auth/login` sets the opaque cookie `hab_session`
  (`src/app/api/auth/login/route.ts:21-22`: `httpOnly`, `sameSite: 'lax'`, `secure` in production,
  `maxAge = PRODUCT_SESSION_TTL_SECONDS`). Every module calls
  `sessionContextFromRequest(request)` (`src/lib/auth/session.ts:80-91`), which calls
  `productSessionFromRequest` (`src/lib/auth/product-session.ts:97-107`). The token is stored only
  as a SHA-256 hash in table `sessions` (`product-session.ts:73-83`, `data/schema.sql:88-98`).
  `hab_demo_account` is honoured only when `NODE_ENV === 'test'` (`session.ts:88-90`).

### Fields (`SessionContext`, `src/lib/auth/session.ts:12-23`)

| Field | Type | Required | Source |
|---|---|---|---|
| `authenticated` | boolean | yes | code `session.ts:14`; spec silent on the name |
| `userId` | ID \| null | yes | AUT FR-017 I/O `user_id (ID; Required)` (spec-AUT.md:404) |
| `role` | `ADMIN` \| `Tour_Agency` \| `Local_Provider` \| null | yes | AUT FR-007 I/O `role (Enum[ADMIN, Tour_Agency, Local_Provider])` (spec-AUT.md:394); consistency-contract.md:49 |
| `adminType` | `HDT` \| `UBND` \| null | yes (non-null only for ADMIN) | AUT FR-007 I/O `admin_type ... required for ADMIN on success` (spec-AUT.md:394); consistency-contract.md:16, :49 |
| `agencyId` | ID \| null | yes (non-null only for Tour_Agency) | AUT FR-017 `role_assignment.organization_id` (spec-AUT.md:404); value from `agency_profiles.user_id` match (product-session.ts:28-29), consistency-contract.md:31 |
| `providerId` | ID \| null | yes (non-null only for Local_Provider) | same as above (product-session.ts:32-33) |
| `assignedVillageId` | ID \| null | yes (non-null only for UBND) | AUT FR-016 I/O `resource_village_id ... UBND scope is the assigned village` (spec-AUT.md:403); from `ubnd_village_assignments` (product-session.ts:37-38) |
| `permissions` | string[] | yes | AUT FR-007 I/O `permission_set (Array<String>)` (spec-AUT.md:394); FR-016 `session_context{... permission_set ...}` (spec-AUT.md:403); loaded from `role_permissions` (session.ts:35-41), NULL `admin_type` rule = consistency-contract.md:31 |
| `dataScope` | `Platform-wide` \| `Assigned village` \| `Own organization` \| null | yes | AUT FR-016 `data_scope` (spec-AUT.md:403); FR-015 role scopes (spec-AUT.md:371) |
| `mustChangePassword` | boolean | optional | AUT FR-007 I/O `must_change_password (Boolean; Optional)` (spec-AUT.md:394); consistency-contract.md:43 |

### Error behaviour

- No cookie, unknown token, expired (`expires_at`), revoked (`revoked_at`), account not
  `Active`/`Approved`, or `role_context` different from the account's current role → no product
  session (`product-session.ts:100-106`); the module receives the Guest context
  (`session.ts:90`). Each route then answers its own 401/403 (for example
  `src/app/api/adm/dashboard/route.ts:10-22`, `src/app/api/ait/sessions/[id]/quote/route.ts:13-14`).
- Disabled mid-session: disable sets `revoked_at` on all the user's sessions
  (`src/lib/auth/admin-accounts.ts:41`, `src/lib/auth/lifecycle.ts:32`), and every request also
  re-reads the account status (`product-session.ts:103-104`), so the next protected request is
  denied (AUT BR-013, AC-AUT-SESSION "Next protected request is denied immediately; no5-minute
  grace", spec-AUT.md:236).
- `must_change_password = true`: every path except `/api/auth/change-password`, `/api/auth/session`,
  `/api/auth/logout` receives the Guest context (`session.ts:85`).
- Login failure: 400 `INVALID_REQUEST`, 401 `INVALID_CREDENTIALS`, 403 `ACCOUNT_INACTIVE`
  (`src/app/api/auth/login/route.ts:11-17`).
- Session lifetime: spec says "Lifetime and transport are explicit Plan choices" (spec-AUT.md:494;
  consistency-contract.md:35); code = 12 h (`product-session.ts:8`).
- Periodic check: AUT FR-017 "Runs periodically (every 5 min) and on critical actions"
  (spec-AUT.md:373), BR-012 (spec-AUT.md:430). Code has no periodic job; it re-validates status
  and role on every request (`product-session.ts:100-105`), which is stricter. Not marked as a
  disagreement.

**FR/BR:** AUT FR-007, FR-009, FR-015, FR-016, FR-017, FR-022; BR-011, BR-012, BR-013; AC-AUT-SESSION; SC-006.

**Tests:** `tests/unit/product-session.test.ts` (revoke at :38, role change at :53),
`tests/unit/auth-session-context.test.ts`, `tests/contract/auth-session-api.test.ts`,
`tests/contract/product-login-api.test.ts`, `tests/unit/admin-accounts.test.ts:21` (disable revokes
sessions), `tests/integration/aut-lifecycle.test.ts:47`, `tests/integration/auth-no-header.test.ts`,
`tests/unit/auth-guard.test.ts`. End-to-end through the module routes with a real `hab_session` cookie (expiry boundary, disabled
mid-session, revoked): `tests/contract/auth-session-modules.test.ts` (PR #82, not yet merged).

### Disagreements

1. **Login error values.** spec-AUT.md:394 FR-007 `error_message (Enum[Invalid credentials,
   Account not approved, Account disabled])` vs code `LoginFailure = 'INVALID_CREDENTIALS' |
   'ACCOUNT_INACTIVE'` (`src/lib/auth/product-session.ts:10`); "not approved" and "disabled" both
   become `ACCOUNT_INACTIVE` (`product-session.ts:65`, `:93`; login route :17).
2. **UBND landing screen.** consistency-contract.md:43 "Then Admin→ADM079" vs
   `workspacePath` sending UBND to `/admin/providers` (`src/lib/auth/product-session.ts:120`;
   ADM079 is `/admin`, `src/app/admin/page.tsx:158`). HDT goes to `/admin` (:121).

---

## 2. IAC ↔ BKG: shared write lock (`withBookingWriteLock`)

- **Sender / receiver:** every Booking write (BKG) and every Chat write (IAC, and the EXP/AIT
  handoff that creates Chats) share one queue.
- **Mechanism:** `withBookingWriteLock(fn)` (`src/lib/booking/write-lock.ts:9-14`) chains `fn` on a
  process-global promise tail and runs it inside `demoRepository().atomic([...13 tables])`
  (bookings, booking_status_history, chat_sessions, chat_messages, chat_participants,
  chat_attachments, stored_files, quote_requests, experiences, provider_profiles,
  provider_profile_versions, audit_logs, notifications). `withChatWriteLock` is an alias
  (`src/lib/iac/chat-lock.ts:7-9`). Not re-entrant (`chat-lock.ts:6`; `expire-holds.ts:12`).
- **Callers:** BKG `create-booking.ts:173`, `update-booking.ts:60`, `change-status.ts:45`,
  `mark-arrival.ts:40`, `expire-holds.ts:35`; IAC `chat-service.ts:74` (open), `:100` (send),
  `:222`, `:269`, `:339` (close/attach); handoff `src/lib/demo/commercial-handoff-service.ts:95`, `:132`.

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| `fn` | `() => Promise<T> \| T` | yes | code only (`write-lock.ts:9`); spec silent on the API |
| Re-check inside lock: Chat `status === 'Active'` | enum Active/Closed | yes | spec-IAC #38 "Send and Open re-check the status inside the lock" (spec-IAC.md:429); code `chat-service.ts:108` |
| Pair uniqueness re-check inside lock | (agency_id, provider_id) | yes | spec-IAC FR-001 "At most one Active Chat exists for an Agency–Local Provider pair" (spec-IAC.md:247); AC-IAC-PAIR (spec-IAC.md:181); schema `chat_one_active_pair_uq` (schema.sql:727); code `pairChatPlan` inside the lock (`chat-service.ts:74-76`) |

### Error behaviour

- A rejected section releases the queue (`write-lock.ts:12`, tested at `tests/unit/bkg-write-lock.test.ts:23`).
- Send/attach on a Chat closed while queued → 409 `CHAT_CLOSED`, nothing written
  (spec-IAC #38, #47, spec-IAC.md:429, :438; code `chat-service.ts:108`).
- Booking race → "At most one permitted booking commits; failed request creates no block"
  (AC-BKG-RACE, spec-BKG.md:236); confirm vs expiry → "One conditional transition wins"
  (AC-BKG-EXPIRY, spec-BKG.md:237).

**FR/BR:** IAC FR-001, BR-004, BR-021, #38, #46, #47, AC-IAC-PAIR; BKG AC-BKG-RACE, AC-BKG-EXPIRY, #45, #50.

**Tests:** `tests/unit/iac-chat-lock.test.ts:7` (Chat write delays Booking write),
`tests/unit/bkg-write-lock.test.ts`, `tests/unit/iac-open-race.test.ts`,
`tests/unit/iac-close-race.test.ts`, `tests/unit/iac-attach-race.test.ts`,
`tests/unit/bkg-create-race.test.ts`, `tests/unit/bkg-race-pause.test.ts`,
`tests/unit/bkg-expire-holds.test.ts`.

### Disagreements

None found between two specifications. Notes:
- spec-BKG is silent on sharing a lock with Chat (only "Atomically recheck availability",
  spec-BKG.md:280); the shared lock is decided in spec-IAC #38/#47 (spec-IAC.md:429, :438).
- The queue is per process (`write-lock.ts:2-3` comment says PostgreSQL aggregate transaction locks
  serialize writes across connections). Inferred from the comment, not verified.

---

## 3. BKG → IAC: Booking Update message (F-SCHED-08)

- **Sender:** BKG (create, update, status change, arrival, 72 h expiry). **Receiver:** IAC Chat
  of the Agency–Provider pair.
- **Mechanism:** `bookingUpdateOperations(booking, at, changedFields)`
  (`src/lib/booking/agency-sync.ts:35-80`) returns batch operations that the BKG caller applies in
  its own `applyBatch` inside `withBookingWriteLock` (`agency-sync.ts:6-9`). Target Chat:
  `resolveChat` (`agency-sync.ts:23-33`); new Chat via `newPairChatOperations`
  (`src/lib/iac/chat-pairs.ts:36-58`); `sent_at` via `nextSentAt` (`chat-pairs.ts:83-90`).
  Read status: `recipientReadStatus` (`agency-sync.ts:83-90`).

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| `booking_event.event_type` | Enum[create, update, status_change, mark_arrival, auto_expiry] | yes | spec-BKG FR-008 I/O (spec-BKG.md:338); expiry included per #5 (spec-BKG.md:495) |
| `booking_event.booking_id` | ID | yes | spec-BKG.md:338 |
| `booking_event.changed_fields` | list | yes (spec) | spec-BKG.md:338; code optional, default `[]` (`agency-sync.ts:38`) |
| `chat_messages.message_kind` | `'Booking Update'` | yes | schema.sql:754; spec-BKG #26 (spec-BKG.md:516); code `agency-sync.ts:75` |
| `chat_messages.sender_user_id` | ID, empty for system message | no | schema `chat_message_sender_chk` (schema.sql:754); code `''` (`agency-sync.ts:74`) |
| `chat_messages.text` | string ≤ 4000 | yes | template spec-BKG #49 "Booking {status}: {experience}, {start}–{end}, {group_size} pax, {agreed_price} VND", plus "changed: {fields}" (spec-BKG.md:539); code `agency-sync.ts:16-20` |
| `chat_messages.booking_id`, `experience_id` | ID | yes | spec-BKG #26 (spec-BKG.md:516); IAC #21 (spec-IAC.md:412); code `agency-sync.ts:76` |
| `chat_messages.sent_at` | DateTime, ISO UTC with ms, strictly later than the Chat's latest message | yes | spec-IAC FR-002 `sent_at (DateTime; Required)` (spec-IAC.md:258); #47 "`sent_at` is at least 1 ms after the Chat's latest message" (spec-IAC.md:438); code `agency-sync.ts:45-61` |
| `chat_sessions.last_message_at` | DateTime | yes | spec-IAC FR-002 `last_message_timestamp` (spec-IAC.md:258); code `agency-sync.ts:57`, `:62` |
| Agency `chat_participants.unread_count` | integer, +1 | yes | spec-BKG #27 "each Booking Update message increments `unread_count`" (spec-BKG.md:517); code `agency-sync.ts:55`, `:65-67` |
| New Chat (no Active Chat) | `source = 'Booking'`, `booking_id`, `experience_id` | yes | spec-BKG FR-008 step 3 (spec-BKG.md:323), #13 (:503); spec-IAC #36 (spec-IAC.md:427); code `agency-sync.ts:51-58` |
| Output `chat_auto_message_id` | ID | yes | spec-BKG.md:338; = `agency_notification_message_id` per #55 (spec-BKG.md:545); code returns `messageId` (`agency-sync.ts:79`) |
| Output `recipient_read_status` | Enum[Seen, Unseen] | yes (internal) | spec-BKG.md:338, #27 (:517); consistency-contract.md:88; code derived on read (`agency-sync.ts:83-90`) |

Target order: (1) `source_chat_session_id` only if Active and same pair (#56, spec-BKG.md:546);
(2) the pair's Active Chat; (3) create one (spec-BKG.md:323). Code `agency-sync.ts:23-33`, `:51`.

### Error behaviour

- A refused BKG action (validation, conflict, no-op) writes no message (spec-BKG #52,
  spec-BKG.md:455 "Nothing is written and no message is sent"; consistency-contract.md:92).
- A Closed Chat is never used and stays unchanged (spec-IAC #36, spec-IAC.md:427).
- The message rows are part of the same batch as the Booking change, so a failure rolls back both
  (`agency-sync.ts:7-8`; BR-019 spec-BKG.md:363).
- Agency without a user: `agencyUserId` becomes `''` (`agency-sync.ts:42`) — spec silent; code then
  writes a participant row with empty `user_id` on the reuse path (`agency-sync.ts:67`).

**FR/BR:** spec-BKG FR-008 (F-SCHED-08), BR-012, BR-019, #5, #13, #26, #27, #49, #52, #55, #56;
spec-IAC FR-001, FR-002, BR-014, #36, #47.

**Tests:** `tests/unit/bkg-agency-sync.test.ts` (:45, :60, :73, :84, :104, :112),
`tests/unit/iac-bkg-sync.test.ts`, `tests/unit/bkg-iac-message-order.test.ts` (issue #66: :37, :46,
:55, :66, :78), `tests/integration/iac-close-booking.test.ts`, `tests/unit/bkg-expire-holds.test.ts`.

### Disagreements

1. **Sender of a Chat message.** spec-IAC FR-002 `sender_id (ID; Required — from session)`
   (spec-IAC.md:258) and §8 Chat Message "message_id, chat_session_id, sender_id, text, sent_at"
   (spec-IAC.md:295) vs spec-BKG FR-008 "system-generated update message" (spec-BKG.md:323) and
   schema `chat_message_sender_chk` allowing NULL sender for Booking Update (schema.sql:754).
   spec-IAC #18 acknowledges the data rule (spec-IAC.md:409) but FR-002 is unchanged.
2. **"Most recent Active Chat".** spec-BKG FR-008 step 2 "use the most recent Active Chat between
   the same Agency and Local Provider" (spec-BKG.md:323) presumes several Active Chats, vs
   consistency-contract.md:86 "At most one Active Chat per Agency–Provider pair" and
   schema.sql:727. Code uses the single Active Chat (`agency-sync.ts:31-32`).
3. **Open data question already answered by data.** spec-BKG #35 (Open) "`bookings.source_chat_session_id`
   has no FK to `chat_sessions`" (spec-BKG.md:525) vs schema `booking_source_chat_fk`
   (schema.sql:728-730).
4. **DateTime format (fixed).** consistency-contract.md:58 "ISO8601 timestamp with offset" allowed
   both BKG `+07:00` seconds and IAC UTC milliseconds in one column; issue #66 (Booking Update
   ordered wrongly) was fixed by PR #68 (`81c1239`, ancestor of `main`): `agency-sync.ts:45-48`
   now writes ISO UTC ms via `nextSentAt`. Booking rows keep `+07:00` (`agency-sync.ts:47`).
   Note: spec silent on the template's date format — code renders `{start}–{end}` as
   `YYYY-MM-DD HH:MM–HH:MM` and joins changed fields with `"; changed: "` (`agency-sync.ts:17-19`).
   Update 2026-11-07: cutting that string was only right for `+07:00` values; on PostgreSQL (UTC)
   the Booked/Cancelled text showed 02:00 for a 09:00 Booking (issue #87). Fixed by PR #89: the text
   is formatted in Asia/Ho_Chi_Minh (spec-BKG #31) by `src/lib/time/hanoi-time.ts`; tests
   `tests/unit/hanoi-time-display.test.ts`, `tests/unit/hanoi-time.test.ts`.

---

## 4. PRF → EXP: catalog eligibility

- **Sender:** PRF (provider_profiles, provider_profile_versions, experiences) and AUT (account
  status). **Receiver:** EXP catalog (also read by the handoff, §5, and AIT, §6).
- **Mechanism:** `eligibleRows(seed)` (`src/lib/explore/catalog.ts:53-68`) reads the shared runtime
  tables; cards built by `toCard` (`catalog.ts:70-92`).

### Fields (eligibility predicate, `catalog.ts:61`, `:65`)

| Condition | Type | Required | Source |
|---|---|---|---|
| `experiences.archived_at` empty | timestamp \| null | yes | PRF BR-019 archive (spec-PRF.md:369); EXP edge case "deleted or unpublished" (spec-EXP.md:173) |
| `provider_profiles.verification_status = 'Verified'` | enum | yes | PRF BR-007 (spec-PRF.md:357); PRF #32 "stays Verified while a published version exists" (spec-PRF.md:438) |
| `provider_profiles.published_version_no` set and that version's `version_status = 'Verified'` | integer / enum | yes | PRF BR-007; PRF #32 "Explore ... keep using published_version_no" (spec-PRF.md:438) |
| Provider `user_accounts.account_status = 'Active'` | enum | yes | spec silent in EXP — code `catalog.ts:65`; AUT BR-013 (disabled user cannot work) |
| `villages.is_active = 'true'` | boolean | yes | spec silent — code `catalog.ts:65`; consistency-contract.md:12 Village is a read-only seeded catalog |
| Card public name = published version `business_name` | string | yes | EXP FR-002 `provider_name (String; Required)` (spec-EXP.md:283); code `catalog.ts:84` |
| `price` | Decimal VND | optional (Agency only) | EXP FR-002 I/O (spec-EXP.md:283); BR-003; code `catalog.ts:89` |

### Error behaviour

An ineligible Experience is omitted silently (no error); a list can be empty (EXP AC1/AC5,
`tests/unit/explore-catalog.test.ts:46`). PRF revisions (major change) keep the published version
visible: `provider_profiles.verification_status` stays Verified while
`provider_profile_versions.version_status` holds the review state (`src/lib/prf/provider-service.ts:236-266`).

**FR/BR:** PRF BR-007, BR-018, BR-019, BR-020, #32, AC-PRF-REVISION; EXP FR-001, FR-002, BR-001, BR-003; AIT BR-003, FR-005.

**Tests:** `tests/contract/prf-exp-catalog.test.ts` (Session 10 contract: PRF route → Explore route and AIT
candidates; normal, archive and pending-revision boundaries, refused category),
`tests/unit/explore-catalog.test.ts:30` (BR-001 hides unverified, unpublished, archived,
inactive-village, disabled-provider), `tests/storage/provider-publication.test.ts:26`,
`tests/prf/unit/provider-versioning.test.ts`, `tests/integration/ait-exp-br-gaps.test.ts:33`.

### Disagreements

1. **Eligibility rule is not stated in spec-EXP.** spec-EXP BR-001 "only Experiences/Providers
   eligible for discovery according to verification rules" (spec-EXP.md:304) and FR-001 "all
   verified experiences" (spec-EXP.md:260) do not name the conditions that code applies
   (account Active, village active, version Verified — `catalog.ts:61-65`); spec-PRF BR-007
   (spec-PRF.md:357) and AIT BR-003 (spec-AIT.md:276) define "published Verified version" only.
2. **Three readers, three predicates (code vs code).** EXP `catalog.ts:61-65` (all five checks);
   AIT `src/lib/db/seed-loader.ts:65-68` (`archived_at`, `verification_status`,
   `published_version_no` only — no account, village or `version_status` check); handoff
   `src/lib/demo/commercial-handoff-service.ts:54-57` (`archived_at` and `verification_status`
   only). Spec side: AIT BR-003 "eligible Verified Local Providers with a currently published
   Verified profile version" (spec-AIT.md:276).
3. **Published-version states.** consistency-contract.md:53 "Published Provider version | None /
   Verified" vs schema `provider_version_status_chk` including `'Superseded'` (schema.sql:320) and
   PRF #32 "marks the previous published version Superseded" (spec-PRF.md:438).
4. **Category vocabulary (fixed).** spec-PRF FR-006 / Q19 Enum[Workshop/Hands-on, Sightseeing,
   Culinary/Tasting, Cultural Show, Combo] and schema `experience_category_chk` vs the PRF schema,
   which accepted any string, so a bad value reached PostgreSQL as a 500 (issue #88). Fixed by PR #90
   (`EXPERIENCE_CATEGORIES` in `src/lib/prf/validators.ts`); EXP filters by the same values.

---

## 5. EXP → IAC: Quote Request / Chat handoff

- **Sender:** EXP (Experience card, detail page, Provider page). **Receiver:** IAC (pair Chat).
- **Mechanism:** `POST /api/demo/handoff` (`src/app/api/demo/handoff/route.ts:5-32`) →
  `createQuoteHandoff` / `createChatHandoff` (`src/lib/demo/commercial-handoff-service.ts:90-143`)
  under `withChatWriteLock`, using `pairChatPlan` / `messageOperations` (`src/lib/iac/chat-pairs.ts:64-107`).
  The ports interface `src/lib/explore/handoff.ts` is used only by tests.

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| `action` | `'quote' \| 'chat'` | yes | code `handoff/route.ts:7-9`; spec silent on the transport |
| `experience_id` | ID | yes | EXP FR-011 / FR-012 I/O (spec-EXP.md:292-293) |
| `agency_id` | ID from session | yes | EXP FR-011 `agency_id (ID; Required — from session)` (spec-EXP.md:292); code `requireAgency` (`commercial-handoff-service.ts:46-50`) |
| `source_context` | Enum[Card, Detail Page] | optional | EXP FR-012 `action_context.source: Enum[Card, Detail Page]` (spec-EXP.md:293); code `handoff/route.ts:11-13` |
| `chat_source` | `Explore` \| `Provider Profile` (default Explore) | optional | spec-IAC FR-001 `source` (spec-IAC.md:257), #19 (spec-IAC.md:410); code `handoff/route.ts:15-17`, `:23` |
| `provider_id` | ID | yes (spec) | EXP FR-012 `provider_id (ID; Required)` (spec-EXP.md:293); code derives it from the Experience (`commercial-handoff-service.ts:56`) |
| `known_group_size`, `known_dates` | Integer, Object | optional | EXP FR-012 (spec-EXP.md:293); not accepted by the route (spec optional) |
| Out `quote_request_id`, `is_new_request`, `chat_session_id` | ID, Boolean, ID | yes | EXP FR-011 (spec-EXP.md:292); code `:120` |
| Out `chat_session_id`, `initial_message_id` | ID | yes | EXP FR-012 (spec-EXP.md:293); code `:140` |
| Out `chat_status`, `is_new_session` | Enum[Active], Boolean | yes | spec-IAC FR-001 output (spec-IAC.md:257); code `:120`, `:140` |
| Quote row | `quote_requests` UNIQUE (agency_id, experience_id), `source` ∈ {Matching, Explore} | yes | consistency-contract.md:88; AIT BR-018 (spec-AIT.md:291); schema.sql:563-566; code `:100-110` |
| Context message | `Quote Request` (quote) / `User Text` (chat), sender = Agency user, `experience_id`, `quote_request_id` | yes | spec-IAC #18 (spec-IAC.md:409), #7 (:400), #21 (:412); code `:76-88` |

### Error behaviour

400 `INVALID_HANDOFF` for missing action/experience_id or bad `source_context` / `chat_source`
(`handoff/route.ts:8-17`); 403 not an authenticated Tour Agency (`commercial-handoff-service.ts:48`;
EXP BR-009, spec-EXP.md:312); 404 Experience missing or archived (:55); 409 Provider not Verified (:57);
500 if a Booking count changes (EXP BR-010, spec-EXP.md:313; code :119, :139). Error body
`{ error: { code: 'HANDOFF_FAILED', message } }` (`handoff/route.ts:30`). Success: 201 for quote,
200 for chat, body `{ data }` (`handoff/route.ts:27`). A repeated Request Quote reuses the quote
and adds no message (`commercial-handoff-service.ts:115`); EXP FR-011 hides the button (spec-EXP.md:270).

**FR/BR:** EXP FR-011, FR-012, FR-007, BR-005, BR-009, BR-010, AC-EXP-QUOTE; IAC FR-001, BR-004, #7, #18, #19, #21, #24; AIT BR-018, BR-019.

**Tests:** `tests/contract/exp-iac-handoff.test.ts` (Session 10 contract: one Quote and pair Chat, Quote
reuse, pair reuse across Experiences, refused roles / archived Experience with no write),
`tests/integration/iac-handoff-routes.test.ts` (:25, :32), `tests/unit/iac-handoff.test.ts`,
`tests/integration/exp-handoff-signal.test.ts`, `tests/unit/explore-handoff.test.ts` (ports module only).
Note: `tests/contract/quote-chat-api.test.ts` imports `src/lib/matching/handoff-service.ts`
(in-memory Maps, lines 29-96), which no route uses; its FR-011/BR-018/BR-019 cases do not exercise
the production handoff.

### Disagreements

1. **Content of the initial Chat message.** spec-EXP FR-012 "Auto-sends an initial message
   containing Agency information, the selected Experience and source context" (spec-EXP.md:271)
   vs spec-IAC #7 "Experience Name, link, and a standard greeting" (spec-IAC.md:400) and #18
   (sender = Agency, `User Text`, spec-IAC.md:409). Code follows IAC: name + link + greeting, no
   Agency information or source context (`commercial-handoff-service.ts:76-80`).
2. **Source vocabulary, spec vs data.** spec-IAC FR-001 / #19 `source` values `AI Matching`,
   `Explore`, `Provider Profile` (spec-IAC.md:257, :410; schema `chat_source_chk` schema.sql:717)
   vs `quote_requests.source` CHECK `('Matching', 'Explore')` (schema.sql:563). Code maps
   AI Matching → `Matching` and Provider Profile → `Explore` (`commercial-handoff-service.ts:106`).

---

## 6. AIT → IAC / EXP: matching results to Quote / Chat

- **Sender:** AIT (matching session, recommendations). **Receiver:** IAC (same handoff service as
  §5) and EXP catalog data (shared Experience/Provider tables).
- **Mechanism:** candidates `getVerifiedCandidates` → `loadExperiences`
  (`src/lib/matching/candidate-repo.ts:10-27`, `src/lib/db/seed-loader.ts:55-100`), used by
  `POST /api/ait/matching` (`src/app/api/ait/matching/route.ts:49`). Handoff:
  `POST /api/ait/sessions/[id]/quote` and `/chat` (`src/app/api/ait/sessions/[id]/quote/route.ts:6-30`,
  `.../chat/route.ts:6-30`) → `createQuoteHandoff` / `createChatHandoff` with
  `{ source: 'AI Matching', matchingSessionId }`.

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| Path `id` (matching_session_id) | ID, owned by the Agency | yes | AIT FR-011 `matching_session_id (ID; Optional)` (spec-AIT.md:263); IAC #19 "AI Matching with the `matching_session_id`" (spec-IAC.md:410); schema `chat_matching_link_chk` (schema.sql:718); code ownership check `quote/route.ts:15-18` |
| `experience_id` | ID | yes | AIT FR-011 I/O (spec-AIT.md:263) |
| `agency_id` | from session | yes | AIT FR-011 (spec-AIT.md:263); BR-001 |
| `action_source` | Enum[Request Quote, Chat] | yes (spec) | AIT FR-011 (spec-AIT.md:263); code uses two routes instead |
| Out `chat_session_id` | ID | yes | spec-AIT.md:263 |
| Out `quote_request_id`, `is_new_request` | ID, Boolean | optional (quote only) | spec-AIT.md:263 |
| Candidate `experience_id, provider_id, village_id` | IDs | yes | AIT FR-005 I/O (spec-AIT.md:257) |
| Candidate `distance_km`, `travel_time_minutes` | number | yes | AIT FR-006 I/O "calculated using the configured Google Maps routing service" (spec-AIT.md:258) |

### Error behaviour

401 Guest, 403 non-Agency, 403 "Matching session access denied" when the session is missing or
owned by another Agency, 400 missing `experience_id` (`quote/route.ts:13-24`); then the §5 handoff
errors (403/404/409/500). Success 200 with an unwrapped body (`quote/route.ts:26`) — spec silent;
Explore returns 201/200 wrapped in `{ data }` (§5). Spec silent on whether `experience_id` must be
one of that session's recommendations — code does not check it.

**FR/BR:** AIT BR-001, BR-003, BR-009, BR-010, BR-018, BR-019, FR-005, FR-006, FR-011, AC-AIT-FAIL; IAC FR-001, #19.

**Tests:** `tests/contract/ait-iac-exp-handoff.test.ts` (Session 10 contract: Matching source and session
link, reuse of an Explore Chat with the new Quote context, unverified Provider leaves candidates and
is refused, another Agency's session / Guest / missing field with no write),
`tests/integration/iac-handoff-routes.test.ts:42`, `tests/integration/ait-exp-br-gaps.test.ts`
(:33 excludes Draft/Revision Required, :72, :81, :94, :102), `tests/integration/ait-flow.test.ts`,
`tests/integration/ait-matching-api.test.ts`, `tests/integration/matching-scenarios.test.ts`.

### Disagreements

1. **Candidate eligibility (spec vs code).** AIT BR-003 "eligible Verified Local Providers with a
   currently published Verified profile version" (spec-AIT.md:276) and FR-005 (spec-AIT.md:236) vs
   `seed-loader.ts:65-68`, which does not check the published version's `version_status`, the
   Provider account status or `villages.is_active` (EXP does, `catalog.ts:65`), and
   `candidate-repo.ts:19` defaults a missing `village_id` to a fixed Bát Tràng ID.
2. **Fabricated distance / rating (spec vs code).** spec-AIT FR-006 route distance from "the
   configured Google Maps routing service" (spec-AIT.md:258); consistency-contract.md:100
   "Required external-distance failure never produces fabricated distance"; consistency-contract.md:82
   "Unknown rating/review values are omitted, not synthesized" vs constants in
   `seed-loader.ts:91-94` (`location {lat 20.9994, lng 105.8888}`, `distance_km: 12`,
   `travel_time_minutes: 30`, `provider_quality_rating: 0.95`).
3. **Context message on a reused Quote.** AIT FR-011 "If an Active Chat already exists ... reuse
   that Chat and append the new Experience/Quote Request context as a message" (spec-AIT.md:242)
   vs code: a second Request Quote for the same Agency–Experience reuses the quote and appends no
   message (`commercial-handoff-service.ts:115`); spec-EXP FR-011 instead hides the button
   (spec-EXP.md:270).

---

## 7. BKG → ADM: dashboard booking metrics

- **Sender:** BKG tables `bookings`, `booking_status_history` (plus `quote_requests`,
  `chat_sessions` for activity). **Receiver:** ADM079 dashboard.
- **Mechanism:** `GET /api/adm/dashboard` (`src/app/api/adm/dashboard/route.ts:8-60`) →
  `filterDashboardMetrics` (`src/lib/adm/metrics-service.ts`), scope from `resolveAdminScope`
  (`src/lib/adm/scope-guard.ts:17-59`). Read-only.

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| Query `preset` | Enum[Last 7 days, Last 30 days, Last 90 days, Last year, Custom] | optional (default Last 30 days) | ADM FR-004 I/O (spec-ADM.md:198); code `route.ts:26` |
| Query `startDate`, `endDate` | Date | optional (Custom) | spec-ADM.md:198; code `route.ts:27-28` |
| Query `villageId` | ID | optional (forced for UBND) | ADM FR-005 (spec-ADM.md:199), BR-003 (:212), AC-ADM-SCOPE (:136); code `scope-guard.ts:42-55` |
| Query `agencyId`, `providerId` | ID list | optional, AND | ADM FR-006 (spec-ADM.md:200), BR-014 (:223), AC-ADM-FILTER (:138); code `route.ts:30-36` |
| Query `sortBy` | Enum[Frequency, Recency] | yes (spec) / optional (code) | ADM FR-010 (spec-ADM.md:204); code `route.ts:38` |
| Booking period basis | `bookings.created_at` in [start, end] | yes | consistency-contract.md:110 "Booking totals, status breakdowns and trends use Booking created_at"; code `metrics-service.ts:55-57` |
| `status_counts` | Map<Enum[On hold, Booked, Completed, Cancelled], Integer> | yes | ADM FR-009 (spec-ADM.md:203), BR-007 (:216); consistency-contract.md:54; code `metrics-service.ts:524-530` |
| `trend_chart_data` | Array<{period_start, count}>, Daily/Weekly/Monthly | yes | FR-009 (spec-ADM.md:188, :203), BR-019 (:228); code `metrics-service.ts:545-548` |
| `booking_table` | Array<{date, agency_name, provider_name, experience_name, status, price}> | yes | FR-009 (spec-ADM.md:203); `date` = spec silent — code `b.start_at` (`metrics-service.ts:629`) |
| Active Collaborations | count of pairs with On hold/Booked at end date | yes | consistency-contract.md:110; code `activePairsAt` from history (`metrics-service.ts:74-84`, `:211-213`) |
| `top_pairs` | max 10 of {agency_name, provider_name, booking_count, last_date} | yes | FR-010 (spec-ADM.md:189, :204), BR-018 (:227); code `metrics-service.ts:660-665`, `:733`; `last_date` = spec silent — code `start_at` (:702) |

### Error behaviour

401 no session, 403 not ADMIN or no `admin_type` (`route.ts:10-22`); scope errors "Forbidden: ..."
→ 403, other errors → 500 with `{ error: message }` (`route.ts:53-58`). UBND village request is
ignored and forced to the assigned village (`scope-guard.ts:48-55`, AC-ADM-SCOPE). Trend omitted
without a comparable period (BR-011, spec-ADM.md:220).

**FR/BR:** ADM FR-002, FR-003, FR-004, FR-005, FR-006, FR-009, FR-010, BR-002, BR-003, BR-007, BR-010, BR-011, BR-013, BR-014, BR-017, BR-018, BR-019, AC-ADM-SCOPE, AC-ADM-PAIR, AC-ADM-FILTER.

**Tests:** `tests/adm/unit/booking-metrics.test.ts`, `tests/adm/unit/booking-table.test.ts`,
`tests/adm/unit/collaboration-metrics.test.ts`, `tests/adm/unit/metric-cards.test.ts`,
`tests/adm/unit/trend-calculator.test.ts`, `tests/adm/unit/filter-metrics.test.ts`,
`tests/adm/unit/adm-br-gaps.test.ts`, `tests/adm/unit/scope-guard.test.ts`,
`tests/adm/contract/dashboard-api.test.ts`, `tests/adm/integration/dashboard-scope.test.ts`,
`tests/adm/integration/adm-runtime-api.test.ts`.

### Disagreements

1. **Active Collaboration time basis.** spec-ADM FR-003 "at least one Booking currently in On
   hold or Booked status within the selected reporting scope" (spec-ADM.md:182) and BR-017 "in
   the selected reporting scope" (spec-ADM.md:226) vs consistency-contract.md:110 "with at least
   one On hold or Booked Booking at the selected end date". Code follows the contract
   (`metrics-service.ts:211-213`).
2. **Number of summary cards.** spec-ADM FR-001 "summary cards (agency count, provider count,
   booking count)" (spec-ADM.md:180) vs FR-003 four cards incl. Active Collaborations
   (spec-ADM.md:182) and consistency-contract.md:108 "four cards".

---

## 8. PRF → ADM: pending verification list

- **Sender:** PRF (`provider_profiles`, `provider_profile_versions`) and AUT
  (`agency_registration_requests`). **Receiver:** ADM079 "Pending Verification" panel (read-only).
- **Mechanism:** `listPendingVerification(session, villageId)` (`src/lib/adm/pending-service.ts:19-46`),
  returned as `pendingVerification` by `/api/adm/dashboard` (feature contract
  `specs/003-adm-core/contracts/admin-dashboard-api.md:175`, task A6).

### Fields (`PendingVerificationItem`, `pending-service.ts:10-16`)

| Field | Type | Required | Source |
|---|---|---|---|
| `kind` | `'Provider' \| 'Agency'` | yes | feature contract admin-dashboard-api.md:175; spec silent |
| `id` | provider_id / registration_request_id | yes | same |
| `name` | current version `business_name` / latest submission `company_name` | yes | same; code `pending-service.ts:29`, `:37-40` |
| `villageId` | ID \| null (null for Agency) | yes | same |
| `submittedAt` | DateTime | yes | same; Provider from current version `submitted_at` (:29) |
| Provider filter | `provider_profiles.verification_status = 'Pending Verification'` | yes | code `pending-service.ts:26`; states from PRF BR-006 (spec-PRF.md:356), ADM FR-008 (spec-ADM.md:187) |
| Agency filter | `agency_registration_requests.current_status = 'Pending Approval'`, HDT / All Villages only | yes | code `pending-service.ts:35`; consistency-contract.md:50 |

### Error behaviour

Non-admin → `resolveAdminScope` throws "Forbidden" → 403 (`scope-guard.ts:26-28`, route :55-56).
UBND sees only its village's Providers and no Agencies (`pending-service.ts:27`, `:35`). No
actions/buttons (ADM BR-012, spec-ADM.md:221).

**FR/BR:** ADM FR-008, BR-002, BR-009, BR-012; PRF BR-005, BR-006, BR-007, BR-018, #32; screen ADM079 (screen-spec-ADM079.md:97).

**Tests:** `tests/adm/unit/pending-verification.test.ts` (:17, :24, :44).

### Disagreements

1. **Revisions of published Providers are not listed (spec vs code).** spec-PRF #32 "The review
   state of a later revision is provider_profile_versions.version_status (Pending Verification /
   Revision Required) of current_version_no" while `provider_profiles.verification_status stays
   Verified` (spec-PRF.md:438, :477) vs `pending-service.ts:26`, which filters only
   `provider_profiles.verification_status`. A major revision (PRF BR-018, spec-PRF.md:368; code
   `provider-service.ts:236-266`) is therefore not shown.
2. **No contract in spec-ADM for the list.** spec-ADM §5/§5.1 has no FR for a pending list; only
   screen-spec-ADM079.md:97 names a "Pending Verification" panel. The field contract exists only in
   the feature folder (`specs/003-adm-core/contracts/admin-dashboard-api.md:175`). Related: AUT
   FR-018 says HDT reviews registrations "and (2) pending major Agency profile changes"
   (spec-AUT.md:374), but the panel reads only `agency_registration_requests`
   (`pending-service.ts:35`) — spec silent on whether the panel must include them.

---

## 9. AUT ↔ PRF: Agency major legal change review

- **Sender:** PRF (Agency Owner edits Company Name / Tax ID). **Receiver:** AUT (HDT review).
- **Mechanism:** `PATCH /api/prf/agency/[agencyId]` → `updateAgencyProfile`
  (`src/lib/prf/agency-service.ts:52-141`) inserts `agency_major_change_requests` (`:104-111`).
  HDT: `GET/POST /api/auth/agency-reviews` (`src/app/api/auth/agency-reviews/route.ts:5-12`) →
  `agencyReviews` / `reviewAgency` (`src/lib/auth/agency-review.ts:10-68`). Table schema.sql:244-259.

### Fields

| Field | Type | Required | Source |
|---|---|---|---|
| `company_name` | String ≤ 255 | optional | PRF FR-002 I/O (spec-PRF.md:340); major per BR-017 (spec-PRF.md:367), #6 (:451) |
| `tax_id` | 10 or 13 digits | optional | PRF FR-002 I/O (spec-PRF.md:340); schema `major_change_tax_chk` |
| Stored `proposed_company_name`, `proposed_tax_id` | string, at least one | yes | schema `major_change_value_chk`; code `agency-service.ts:104-110` |
| `review_status` | Pending Review / Request More Information / Approved / Rejected | yes | schema `major_change_status_chk` (schema.sql:254) |
| PRF out `requires_hdt_rereview` | Boolean | yes | spec-PRF.md:340; code `agency-service.ts:136` |
| PRF out `major_change_review_status` | Enum[Not Required, Pending Review, Approved, Rejected] | yes | spec-PRF.md:340; code: not returned |
| PRF out `account_status` | Enum[Approved] | yes while pending | spec-PRF.md:340; code `agency-service.ts:137` |
| AUT in `review_type` | Enum[Initial Registration, Major Profile Change] | yes | AUT FR-018 (spec-AUT.md:405); code `kind: 'registration' \| 'change'` (`agency-review.ts:23`) |
| AUT in `decision` | Enum[Approve, Request More Information, Reject] | yes | spec-AUT.md:405; code `agency-review.ts:25` |
| AUT in `review_comment` | Text | required unless Approve | spec-AUT.md:405; code `agency-review.ts:25` |
| AUT out `decision_record` | {decision, hdt_user_id, decided_at} | yes | spec-AUT.md:405; code `agency_review_records` row (`agency-review.ts:63`) |
| AUT out `major_change_review_status` | Enum[Not Applicable, Pending Review, Approved, Rejected] | yes | spec-AUT.md:405 |
| AUT out `notification_status` | {in_app, email: Enum[Success, Fail]} | yes | spec-AUT.md:405; code `{ email_delivery_status: 'Dev outbox' \| 'Not configured', in_app_status: 'Success' }` (`agency-review.ts:66`) |

### Error behaviour

PRF: 403 not the owning Agency (`agency-service.ts:65-71`), 404 profile missing (:75), 400 schema
validation (route). Account stays Approved and approved values stay on the profile until review
(PRF FR-002, spec-PRF.md:328; code writes only `proposed_*`). AUT: 403 `FORBIDDEN` unless HDT
with `manage_users` (`agency-review.ts:8`; route :11); 409 for `STALE_REVIEW`, `INVALID_REVIEW`,
`DUPLICATE_TAX_ID`, `MISSING_PROFILE` (route :11, generic message for the last three). Approve
copies proposed values and checks Tax ID uniqueness (`agency-review.ts:36-41`); Reject keeps the
approved values (AUT FR-018 "rejected changes are discarded", spec-AUT.md:374).

**FR/BR:** PRF FR-002, BR-001, BR-017, #6; AUT FR-018, BR-010, BR-014; consistency-contract.md:22.

**Tests:** `tests/unit/agency-review.test.ts` (:11, :24), `tests/prf/unit/agency-service.test.ts`,
`tests/prf/integration/agency-routes.test.ts`.

### Disagreements

1. **Enum label for "no review".** spec-PRF FR-002 `major_change_review_status (Enum[Not Required,
   Pending Review, Approved, Rejected])` (spec-PRF.md:340) vs spec-AUT FR-018
   `major_change_review_status (Enum[Not Applicable, Pending Review, Approved, Rejected])`
   (spec-AUT.md:405).
2. **"Request More Information" for a major change.** spec-AUT FR-018 allows decision
   `Request More Information` for both review types (spec-AUT.md:405) but neither output enum
   (spec-PRF.md:340, spec-AUT.md:405) contains it; schema has it (schema.sql:254).
3. **Code vs schema on that state.** `reviewAgency` writes `review_status = 'Request More
   Information'` and `reviewed_at = now` (`agency-review.ts:42-43`) vs schema
   `major_change_reviewed_chk` (issue #83): Pending Review / Request More Information require `reviewed_at IS
   NULL` (schema.sql:255-258; table at :244). Would fail on PostgreSQL; the JSON runtime does not enforce it
   (inferred, not run).
4. **PRF outputs missing (spec vs code).** spec-PRF FR-002 requires `updated_profile`,
   `success_message`, `updated_at`, `change_log_entry`, `major_change_review_status`
   (spec-PRF.md:340); `updateAgencyProfile` returns only `success, agency_id,
   requires_hdt_rereview, account_status` (`agency-service.ts:133-138`).
5. **Stub route** (issue #84). `POST /api/prf/agency/[agencyId]/major-change` answers 201 "Major change review
   request created for HDT" but writes nothing (`src/app/api/prf/agency/[agencyId]/major-change/route.ts:15-24`),
   while the real request is created by the profile update (`agency-service.ts:106-111`).
   Also spec silent — code allows several Pending Review rows for one Agency (one insert per save,
   :106) and stores the notification with `event_type: 'Registration Reviewed'` for a change review
   (`agency-review.ts:64`).

---

## Interfaces without a specification contract

- §2 lock: spec-BKG has no rule; only spec-IAC #38/#47 decide the shared lock.
- §8 pending list: no FR in spec-ADM; only screen-spec-ADM079.md:97 and the feature contract.
- §4 eligibility: the exact predicate (account Active, village active) is not in spec-EXP.
