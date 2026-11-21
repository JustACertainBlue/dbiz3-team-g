# UI v3 booking: draft notes (not the build log)

## Part A (server), 21/11
- One guard `assertTransition` (`src/lib/booking/transitions.ts`): On hold -> Booked | Cancelled; Booked -> Completed | Cancelled. Provider takes every edge; Tour Agency only cancels On hold. A cancellation needs a reason. Used by `change-status.ts` and `mark-arrival.ts`.
- `createBooking`: only for an Agency that has a Chat (any status) with the Provider; slot capacity checked inside the write lock (`slotOccupancy`).
- Capacity (decision 7) with the schema's EXCLUDE gist kept (human choice): one booking per provider time slot, so the check is group_size <= max_participants in the transaction.
- Hold expiry reason is now "Hết hạn giữ chỗ". `docs/spec/specs/spec-BKG.md` lines 453 and 542 (#46) still say "Automatic expiry: 72-hour On hold elapsed": the spec owner must update them.
- Scanner moved to `src/instrumentation.ts` (needs `experimental.instrumentationHook` in Next 14). Reads still expire due holds. No scanner existed in Explore.
- Migration `20261121100000_hab_booking_contact_fields.sql`: contact_name, contact_phone, note (nullable). Applied to DEV by the human on 21/11.
- Test fixture shim `tests/setup/booking-pair-chat.ts`: the seed has no chat for the demo agency/provider pair. Proper fix: a seed row (data/ owner), then delete the shim.
