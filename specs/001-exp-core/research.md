# EXP research and decisions

The first four decisions below explain the committed US-1 slice. The later user-requested prototype extension is recorded after them; this file is not evidence that the extension followed a test-first sequence.

## Local data access

**Decision:** Read canonical seed CSV through one server-side repository; map it to the columns in `data/schema.sql`. **Reason:** Session 8 needs a runnable seeded demo on Windows and macOS without local PostgreSQL. The design remains read-only and preserves a clear replacement point for PostgreSQL. **Alternative:** require a local PostgreSQL service; rejected for this workshop because not every member has `psql` or a running server.

## Visibility and local Agency context

**Decision:** The public page defaults to Guest. In development only, a known approved synthetic Agency ID can be selected to exercise Agency visibility. Validate its approval before exposing price. **Reason:** login is outside the Session 8 slice, yet US-1 requires both roles. **Alternative:** hard-code Agency pricing into a public page; rejected because it would break BR-003.

## Eligibility and ordering

**Initial decision:** An Experience is discoverable only when unarchived and linked to an active Village and a Provider with `verification_status=Verified`, `published_version_no` pointing to a `Verified` version, and active Provider account. Use stable name/ID order in the US-1 baseline. Existing `agency_preference_profiles` may be used for initial order according to the spec; its ranking interpretation was deferred until the later extension. **Reason:** follows BR-001 without inventing a formula in the initial slice. **Alternative:** show all Experience rows; rejected because draft/rejected content exists in seed.

## Images

**Decision:** Expose media metadata from `profile_media`/`stored_files` and render a text/colour placeholder until the actual image objects exist. **Reason:** CSV contains storage keys, not binaries. This is a documented demo limitation, not a replacement field or fabricated photo.

## Integration with other modules

**Initial decision:** The minimal detail destination provides navigation only. Quote, chat, full Provider detail, analytics and re-ranking belonged to later stories. The later user request extended the prototype beyond this initial slice; live Quote/Chat still await their modules. **Reason:** the guide starts with one independently demoable story.

## Later prototype extension

**Ranking interpretation:** The user selected a deterministic formula from available data. The demo combines an Agency's category/provider preference weights with quality normalized from historical eligible seed interactions, using the Active seed ranking version's `relevance` and `quality` weights. This is a prototype interpretation, not a new canonical data rule or an AI API call.

**Interaction storage:** Consent-aware Guest events and Agency-specific signals use a development-only in-memory runtime. The user chose to leave `data/` unchanged. Full FR-006 detail-visit fields and FR-007 source context therefore remain unresolved for durable storage; see spec §10 open questions 28–29.

**Related results:** Same-Provider and same-craft suggestions use existing IDs and categories. Nearby within the defined 20 km radius cannot be computed without an authoritative coordinate source; see open question 30.

**Ranking activation:** The user chose automatic System promotion under BR-015. SC-011 in the source spec now follows that decision. Pure tests cover gates and rollback threshold; no scheduler, atomic database transaction or audit writer runs in this prototype.

**Handoff:** Auth/Quote/Chat ports allow permission-first and reuse rules to be tested without inventing live adapters. The UI leaves Agency actions unavailable until those modules exist. No Booking is created by Explore.
