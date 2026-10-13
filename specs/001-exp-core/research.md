# EXP US-1 research and decisions

## Local data access

**Decision:** Read canonical seed CSV through one server-side repository; map it to the columns in `data/schema.sql`. **Reason:** Session 8 needs a runnable seeded demo on Windows and macOS without local PostgreSQL. The design remains read-only and preserves a clear replacement point for PostgreSQL. **Alternative:** require a local PostgreSQL service; rejected for this workshop because not every member has `psql` or a running server.

## Visibility and local Agency context

**Decision:** The public page defaults to Guest. In development only, a known approved synthetic Agency ID can be selected to exercise Agency visibility. Validate its approval before exposing price. **Reason:** login is outside the Session 8 slice, yet US-1 requires both roles. **Alternative:** hard-code Agency pricing into a public page; rejected because it would break BR-003.

## Eligibility and ordering

**Decision:** An Experience is discoverable only when unarchived and linked to an active Village and a Provider with `verification_status=Verified`, `published_version_no` pointing to a `Verified` version, and active Provider account. Use stable name/ID order. Existing `agency_preference_profiles` may be used for initial order according to the spec, but no scoring formula is defined, so this optional path waits for the ranking slice. **Reason:** follows BR-001 without inventing a formula. **Alternative:** show all Experience rows; rejected because draft/rejected content exists in seed.

## Images

**Decision:** Expose media metadata from `profile_media`/`stored_files` and render a text/colour placeholder until the actual image objects exist. **Reason:** CSV contains storage keys, not binaries. This is a documented demo limitation, not a replacement field or fabricated photo.

## Integration with other modules

**Decision:** The minimal detail destination provides navigation only. Quote, chat, full Provider detail, analytics and re-ranking belong to later stories. **Reason:** the guide requires one independently demoable story at a time.

No open question in `docs/spec/specs/spec-EXP.md` is marked Blocking: Yes. Product interpretations beyond the spec have not been added.
