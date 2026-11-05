# PR notes: IAC round 1 (`014-iac-core`)

- Scope: F-CHAT-01..03 (US-1 round 1). Close Chat (F-CHAT-04) → `015-iac-close`; attachments (F-CHAT-05) → `016-iac-attach`.
- Replaces PR #16 (`003-iac-core`, mizaki311) — reference only. `src/lib/iac/markdown-utils.ts` and
  `tests/unit/chat-markdown.test.ts` were taken from its commit `814ac5b` with the author kept (`57e8d24`);
  `_text_` italic removed per spec-IAC #20. PR #16 can be closed when this PR is merged (human).
- Spec decisions: spec-IAC #18–#28 (Decided by Vũ Khánh Linh, 2026-11-05).
- Shared files of other modules (behaviour unchanged except Chat `source` / message values):
  - BKG: `src/lib/booking/agency-sync.ts` (pair lookup and new Chat via `src/lib/iac/chat-pairs.ts`),
    BKG135 / BKG138 pages (Chat button opens `source = Booking`). Chat writes share `withBookingWriteLock`.
  - AIT: `src/app/api/ait/sessions/[id]/chat|quote/route.ts` (`source AI Matching` + matching session; Quote `Matching`).
  - EXP: `src/app/api/demo/handoff/route.ts` (`chat_source`), `src/app/explore/ProviderChatAction.tsx` (`Provider Profile`),
    `src/lib/demo/commercial-handoff-service.ts` (async, shared lock, results add `chat_status`, `is_new_session`).
- Removed: `/api/demo/conversations*` (Q10).
- Existing tests changed (approved, build-log Entry 45): `auth-no-header`, `chat-markdown`, `ait-exp-br-gaps`,
  `demo-functional-flow`, `exp-handoff-signal` (`await` only).
- After pulling: `npm run demo:reset` once (old runtime rows `Open` / `Text` / `Experience Context`).
