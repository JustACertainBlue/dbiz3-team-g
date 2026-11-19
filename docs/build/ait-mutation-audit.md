# AIT mutation audit [MOCK]

Run on `feat/ait-conversational-llm` after the split commits from HEAD `5d90ce7`.
Each mutation was applied temporarily, the named Vitest selector was run, and the original
file bytes were restored. All 20 distinct mutants below were killed. No mutation remains.
The “remove `Đang lọc`” mutant survived the first, insufficient selector; a direct assertion was
added in `tests/integration/ait-geography-pipeline.test.ts`, commit `e022d02`, then that mutant
failed and the unmutated test passed. The first map-overwrite probe used a gated-test selector
that skipped; it was rerun with the correct selector and failed.

| # | Mutation | Production location | Test that killed it | Result |
|---:|---|---|---|---|
| 1 | Bypass delta validation, accepting malformed/out-of-range km and money slots | `src/lib/ait/conversation-delta.ts:224` | `tests/integration/ait-geography-pipeline.test.ts` — “rejects malformed, extra, wrong-clear, and out-of-range model delta fields” | Killed |
| 2 | Replace the conversation state with an empty state instead of merging the current turn | `src/lib/ait/conversation-state.ts:363` | `tests/integration/ait-conversation-state.test.ts` — “merges updates through eight turns without losing untouched fields” | Killed |
| 3 | Skip explicit reset | `src/app/api/ait/sessions/[id]/messages/route.ts:735` | `tests/integration/ait-conversation-state.test.ts` — “clears state only for an explicit reset and answers booking help without losing state (T22, T23)” | Killed |
| 4 | Skip clearing the selected slot | `src/lib/ait/conversation-delta.ts:299` | `tests/unit/ait-conversation-delta.test.ts` — “clears only a slot explicitly cleared by the latest user turn” | Killed |
| 5 | Skip recording a relaxed field | `src/lib/ait/conversation-delta.ts:305` | `tests/unit/ait-conversation-delta.test.ts` — “uses a relax delta and prior user-turn context to waive the English-guide request” | Killed |
| 6 | Write a turn-count change for an FAQ/help turn | `src/app/api/ait/sessions/[id]/messages/route.ts:749` | `tests/integration/ait-conversation-state.test.ts` — “clears state only for an explicit reset and answers booking help without losing state (T22, T23)” | Killed |
| 7 | Record an incorrect `source_turn` | `src/lib/ait/conversation-delta.ts:349` | `tests/unit/ait-conversation-delta.test.ts` — “accepts only grounded, typed set operations and applies them with source turns” | Killed |
| 8 | Increment the “Còn N làng khác” count by one | `src/lib/ait/messages.ts:270` | `tests/ait/ait-geo-distance.test.ts` — “reports exact post-filter overflow counts for zero, 3, 4 and many … villages” | Killed |
| 9 | Remove the “Đang lọc:” line | `src/app/api/ait/sessions/[id]/messages/route.ts:1292` | `tests/integration/ait-geography-pipeline.test.ts` — “localizes craft and renders radius and distance kilometers for BUG-11/12” | Killed after adding the explicit assertion |
| 10 | Use group-total budget as the per-person ceiling without division | `src/lib/ait/conversation-delta.ts:378` | `tests/unit/ait-conversation-delta.test.ts` — “validates a group-total budget basis and stores the per-person ceiling” | Killed |
| 11 | Skip one-decimal radius normalization in conversation state | `src/lib/ait/conversation-delta.ts:328,343` | `tests/integration/ait-geography-pipeline.test.ts` — “rounds long decimal radius values to at most one decimal in state and text” | Killed |
| 12 | Ignore the current-turn dataset marker (mutant forced Fixture for every request) | `src/app/api/ait/sessions/[id]/messages/route.ts:568` | `tests/integration/ait-geography-pipeline.test.ts` — “uses only the current standalone test marker and strips it before parsing” | Killed |
| 13 | Mark unsupported craft as supported | `src/lib/ait/conversation-delta.ts:360` | `tests/unit/ait-conversation-delta.test.ts` — “distinguishes an explicitly requested unsupported craft from an invalid delta” | Killed |
| 14 | Skip budget-first no-results explanation | `src/lib/ait/messages.ts:145` | `tests/ait/ait-geo-distance.test.ts` — “prioritizes the budget reason when both budget and radius exclude all results” | Killed |
| 15 | Remove the per-session write lock | `src/app/api/ait/sessions/[id]/messages/route.ts:1320`; lock implementation `src/lib/matching/session-service.ts:29` | `tests/harness/ait-state-replay.test.ts:586` — “preserves independent slots across concurrent turns in one AIT session [MOCK]” | Killed |
| 16 | Disable the requested-radius exclusion | `src/lib/matching/geo.ts:93` | `tests/ait/ait-geo-distance.test.ts` — “filters known distances outside the requested radius and leaves unknown distances unranked by distance” | Killed |
| 17 | Remove the district/approximate-location uncertainty band | `src/lib/matching/geo.ts:86` | `tests/ait/ait-geo-distance.test.ts` — “uses inclusive bounds for the configured approximate uncertainty” | Killed |
| 18 | Bypass post-check rejection of unverified facility claims | `src/lib/ait/postcheck.ts:178` | `tests/ait/ait-postcheck.test.ts` — “rejects unsupported facility claims when the source cards do not verify them” | Killed |
| 19 | Compare exact distance instead of the displayed one-decimal boundary | `src/lib/matching/geo.ts:87` | `tests/ait/ait-geo-distance.test.ts` — “compares exact-radius candidates using the one-decimal displayed boundary” | Killed |
| 20 | Replace the slot map instead of preserving untouched slots on merge | `src/lib/ait/conversation-delta.ts:352` | `tests/harness/ait-state-replay.test.ts:456` — “runs 30 new 3-4-turn conversations with literal slot oracles [MOCK]” | Killed |

The mutation that removed the route-level post-check initially passed the conversation-state
selector; the direct `ait-postcheck.test.ts` selector above kills the same behavior at its
producer. The zero-survivor result is limited to these 20 mutations and their named tests.
