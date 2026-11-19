# A-BIS-2 follow-up report [MOCK]

## Scope and commits

Local-only work on `feat/ait-conversational-llm`; starting HEAD `5d90ce7`. No real model, secrets,
`.env*`, Supabase, or push was used.

| Slice | Commit | Contents |
|---|---|---|
| Race lock | `961a323` | `session-service.ts` plus the race-only route hunks. |
| Invalid group/radius | `2909c27` | `conversation-state.ts` plus the invalid-input route hunks. |
| Tests/replay | `664df22` | AIT test files and replay harness. |
| Initial evidence | `eb0446f` | 30-conversation and 114-case artifacts plus initial build-log entry. |
| Mutation-killer assertion | `e022d02` | Added explicit assertion for `Đang lọc:` after that mutant survived the first selector. |

`route.ts` was deliberately split by staging only its race hunks in the first production commit;
the invalid-input changes went into the second. The report and mutation audit are follow-up docs.
This report was generated at HEAD `e022d02`; the final report commit is recorded in the response.

## Runtime and race-lock boundary

`src/app/api/ait/sessions/[id]/messages/route.ts` uses Next.js 14 App Router's default Node.js
runtime: it has no `runtime = 'edge'` export and imports Node `fs` (line 93). The per-session
`Map` queue in `src/lib/matching/session-service.ts:27-45` serializes requests only within one
Node.js process. It is not a distributed lock and does not coordinate Workers or multiple
processes. No expansion beyond that boundary was made.

The race probe first observed the `group_size=20` update being lost while a concurrent radius
update survived. With the lock, both slots survive. This is verified by the [MOCK] concurrent
route test; it does not establish cross-process safety.

## BUG-21 and “Còn N làng khác”

- **BUG-21:** this replay's earlier `deltaFor` mock hardcoded `budget_per_person=20000` from a
  kilometer-only input, manufacturing the symptom. The special case was removed in
  `tests/harness/ait-bug-repro-table.test.ts`; the regenerated replay no longer creates that
  budget. A separate [MOCK] route test supplies the malformed budget delta and confirms the
  validator rejects it as `budget_not_explicitly_stated`. Current evidence points to a mock
  defect, not proof of a production-model defect or fix.
- **Overflow count:** `src/lib/ait/messages.ts:266-270` prints `overflowCards.length`; this count
  is based on the post-filter overflow list passed by the route. The seed and fixture test
  constructs post-filter sets of 0, 3, 4, and all available villages: 0/3 show no overflow line,
  4 shows `N=1`, and larger sets show `N=count-3`. The test passed. `card-resolver.ts` was not
  changed for this check.

## Four cases reported as invariant failures

The 114-case artifact has `auto_fail=0`, `fail_count=0`, and 126 rows marked `REVIEW`; therefore
SYS06, DATA01, BOOK01, and CHAT02 are not recorded as invariant `FAIL`s. Semantic expected
answers are not auto-scored. No oracle was changed to match code, and `card-resolver.ts` was not
changed.

| Case | [MOCK] evidence | Classification |
|---|---|---|
| SYS06 | Expected an explanation of AIT's value; route returned five experience results. `isSystemHelpRequest` does not match “được lợi gì”. | Route/help-intent mismatch on this deterministic [MOCK] path, not a runner failure; no real-model claim. The runner correctly leaves it `REVIEW`, not `PASS` or invariant `FAIL`. |
| DATA01 | Expected the full eight Seed villages; route returned five matching experiences. | The route output is five catalog results. The runner has no semantic assertion for an all-eight directory; absent a spec contract requiring all eight, classify the reported `FAIL` as runner expectation not encoded as an invariant, not a confirmed production defect. |
| BOOK01 | Expected contact guidance; route returned five experience results. The deterministic booking-help expression does not match “liên hệ với ai”; KB content exists but this phrase did not reach it in this mocked run. | Route/help-intent mismatch on this deterministic [MOCK] path, not a runner failure; real-model classification remains unverified. Runner leaves it `REVIEW`. |
| CHAT02 | All three turns return the Silk experience; “Gần trung tâm ấy” retains Silk and returns Vạn Phúc (9.9 km); the experience turn still returns the Silk activity. | No mismatch observed in these outputs. Any reported `FAIL` is a runner semantic-scoring gap: the case remains `REVIEW` because semantic scores are intentionally unassigned. |

No `card-resolver.ts` change was made for these cases. The only runner change relevant to this batch was removing the BUG-21 hard-coded budget delta; it did not alter these four cases or their oracle. The 114-runner itself still records them as `REVIEW`, not `FAIL`.

## Anti suites

These are [MOCK] results from the tester worktree at revision `71aed19`, with tests configured to
exercise the current AIT source. They are not real-model results.

| Suite | Count and failures | BUG mapping / limits |
|---|---|---|
| Fuzz | 500 generated inputs; 0 crashes, 2 blank responses, 0 NaN text, 0 kilometer-only budget assignments, 0 duplicate villages observed. The suite's eight tests passed; the two blank responses were not assertions/fails. | The two blanks have no assigned BUG ID in the report. Earlier tester-baseline findings were 3 NaN responses (BUG-20) and 219 false budgets (BUG-21); the corrected mock no longer manufactures the latter. This delta is not real-model evidence. |
| Pairwise/boundaries | 36 pairwise combinations; 5 tests passed, 0 asserted failures. | Oracle limitation: empty `village_cards` can hide results in `top_matches`, and tester `readState` returned `{}`. No BUG can be assigned to an asserted failure because none was reported. |
| Personas | 7 tests passed, 0 crashes. | Observations, not suite failures: booking phrase can still return catalog results (BUG-27); Persona 6 includes a fallback/classifier-confidence-0 turn (BUG-29). |

## BUG-01..29 status

The row-by-row [MOCK] route inputs, state, response text, and limitations are in
[`bug-repro-table.md`](./bug-repro-table.md). “Not reproduced” is not a claim that the real model
is correct. No item below is called “fixed” without a recorded red/green test pair.

| ID | Current conclusion |
|---|---|
| BUG-01 | Not reproduced at function level for invalid coordinates/distances; no BUG-01 route replay. |
| BUG-02 | Not reproduced at function level; negative-radius route validation is separately covered. |
| BUG-03 | Not reproduced on [MOCK]; zero radius now returns the invalid-radius explanation. |
| BUG-04 | Not reproduced on [MOCK]; unsupported minimum/range request receives the explicit unsupported response. |
| BUG-05 | Not reproduced on [MOCK] for “10 cây số”. |
| BUG-06 | Not reproduced on [MOCK]; unsupported facility query is refused. |
| BUG-07 | Not reproduced on [MOCK]; unsupported craft does not become an unrelated match. |
| BUG-08 | Not reproduced on [MOCK]; distance phrase is not stored as origin. |
| BUG-09 | Inconclusive in the generic replay; a separate route test covers unknown explicit origin. |
| BUG-10 | Not reproduced on [MOCK]; budget-first no-results test covers budget/radius conflict. |
| BUG-11 | Generic replay inconclusive; dedicated route test checks comma-formatted kilometers. |
| BUG-12 | Generic replay inconclusive; dedicated route test checks Vietnamese craft labels. |
| BUG-13 | Not reproduced on [MOCK] for “ho guom”. |
| BUG-14 | Not reproduced on [MOCK] for invalid date input. |
| BUG-15 | Not reproduced on [MOCK] for adult-plus-child group size. |
| BUG-16 | Not reproduced on [MOCK]; zero/negative group-size route cases expect one validation sentence. |
| BUG-17 | Behavior follows JQ-03 in the classifier-forced probe; not evidence about real classification. |
| BUG-18 | Not reproduced on [MOCK] for total-budget input. |
| BUG-19 | Not reproduced on [MOCK] for “1e3 km”. |
| BUG-20 | Not reproduced on [MOCK]; NaN distance injection is checked separately. |
| BUG-21 | Not reproduced by the corrected mock; the old hardcoded budget was a runner artifact. |
| BUG-22 | Not reproduced on [MOCK]; displayed one-decimal radius boundary is covered separately. |
| BUG-23 | Not reproduced on [MOCK] for a long decimal radius. |
| BUG-24 | Not reproduced on [MOCK]; pure-English request receives an unsupported-language response. |
| BUG-25 | Not reproduced on [MOCK]; unsupported currency receives an explanation. |
| BUG-26 | Not reproduced on [MOCK]; unsupported facility claims are rejected. |
| BUG-27 | Still reproduced on [MOCK]: “đặt tour luôn cho tôi” can reach catalog matching; no new rule was added. |
| BUG-28 | Not reproduced on [MOCK] for the GPS question. |
| BUG-29 | Inconclusive on [MOCK]; Persona 6 transcript is available, but real-model/fallback semantics are not adjudicated. |

## JQ-01..08 decisions

| ID | Decision/status |
|---|---|
| JQ-01 | Store a group-total budget as a per-person amount when group size is known; covered by the group-total delta test. |
| JQ-02 | Reject nonpositive group size and radius with one explanatory sentence; current route tests pass. |
| JQ-03 | Entity-first precedence; BUG-17 behavior follows this decision. |
| JQ-04 | One-decimal display/comparison boundary; 8.14 km is within displayed 8.1 km. |
| JQ-05 | Prioritize real coordinates over district estimates; waiting for Jade confirmation. |
| JQ-06 | Answer in Vietnamese that English-only input is unsupported; not changed for Stage B. |
| JQ-07 | Refuse statistics/GPS requests with “Hiện chưa có dữ liệu”; not changed for Stage B. |
| JQ-08 | Refuse scientific-notation radius input; not changed for Stage B. |

## Oracle and expectation changes

| Test/oracle | Old → new | Basis and evidence |
|---|---|---|
| `tests/integration/ait-geography-pipeline.test.ts` — `explains that a zero-kilometer radius is invalid on %s data` | Expected `no_results` → expected `answer` with one invalid-radius sentence. | JQ-02/approved nonpositive-input decision. The assertion was aligned with that decision; this run did not capture a pre-production-change red result, so it is not presented as red/green proof of a fix. |
| `tests/integration/ait-geography-pipeline.test.ts` — BUG-11/12 display test | Added an assertion that the result text contains `Đang lọc:`. | Added only after the corresponding mutant survived; the new assertion failed under that mutant, then passed on baseline. |
| `tests/harness/ait-state-replay.test.ts` — literal `source_turn` oracle | Earlier oracle counted each user utterance; now only an accepted state delta advances a slot's source turn, while metadata-only guide-language relax leaves it unchanged. | Changed after the first replay showed rejected deltas/relax were being counted as slot updates. This basis follows accepted-state-write semantics but was not tied to a quoted spec line in the earlier run; Jade review is required before treating that oracle as authoritative. |
| `tests/integration/ait-invariant-matrix.test.ts` mock protocol | Mock `extracted_context` → mock `conversation_delta`; invariant expectations unchanged. | Validator contract wiring, recorded in build-log Entry 72 after Jade approval. |

## Test/build status and manual review package

- Focused AIT run: 3 files, 159 tests passed. Race-only: 1 passed, 2 gated tests skipped.
- Final HEAD verification: `npm.cmd run lint` passed; `npm.cmd run build` passed and printed the existing `/ai-matching` dynamic-server-usage diagnostic. Full `npm.cmd test -- --reporter=dot`: 267 files passed, 2 failed, 7 skipped; 1,963 passed, 3 failed, 34 skipped. Failures: T037 and T039 in `ait-matching-api.test.ts`, and `village-display-name.test.ts` for `"lang gom bat trang"`. T037/T039 were also red on baseline `6898bff` per build-log Entry 75.
- Manual package: [`ait-30-conversation-replay.json`](./ait-30-conversation-replay.json) contains 10 seeded-random transcripts, 5 highest-risk scenarios, and all red replay cases (0). The 114-case CSV keeps all 126 semantic answers at `REVIEW`; it does not classify them as passes.
