# AI Use Log

Session 10 deliverable (`docs/build/claude-context/07-session10-11-requirements.md`): which parts were
AI-generated and the name of the person who checked them. One row per change. "Checked by" is filled in only
by the person who actually checked the change; an agent never fills it in for a human.

| Date | PR / branch | Part | AI tool | What the AI did | Checked by | How it was checked |
|---|---|---|---|---|---|---|
| 2026-11-07 | `linh/fix-bkg-chat-order` (issue #66) | `src/lib/booking/agency-sync.ts` (Booking Update `sent_at`), `tests/unit/bkg-iac-message-order.test.ts` | Claude Code (Claude Opus 5.5) | Wrote 5 interface tests first (red: format, same second, same millisecond, refused action, legacy `+07:00` rows), then the fix: `sent_at` = ISO UTC with ms via IAC `nextSentAt`; mutation checks; full suite ×3 | _pending: linhkhanh-vu_ | Agent evidence in build-log Entry 51; human review pending |
| 2026-11-07 | `linh/fix-cost12-test` | `tests/unit/password-cost.test.ts` (cost-12 test only) | Claude Code (Claude Opus 5.5) | Replaced `bcrypt.hashSync(…, 12)` in the test by a precomputed test-only cost-12 hash; added prefix/rounds asserts and a wrong-password `false` check; 15 s timeout for this one test (approved by the human); mutation checks on `verifyPassword` | _pending: linhkhanh-vu_ | Agent evidence in build-log Entry 52; human review pending |
