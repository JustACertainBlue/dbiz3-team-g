# Draft: ui/v3-ai — screen 22 Ghép tour AI (AIT121)

## Done (commits on ui/v3-ai)
1. `1a7a324` first restyle of /ai-matching to mockup 22 (left rail, conversation column, composer, suggestion pills).
2. `245a1a9` API `/api/ait/matching`: every recommendation (top_matches, additional_suggestions) gets an added `card`
   = ResultView of screen 02 (cover image ref, craft label via rowCraft, tags incl. duration, 3 highlights, price). Built by
   `src/lib/matching/card-data.ts` with the existing `resultView` / `eligibleRows`. No existing field changed; selection and ranking untouched; no migration.
3. `64de4bd` price: group size the AI understood (`hard_constraints.group_size`) goes to the existing `priceFor` → group price,
   struck-through old price, "Giảm X% giá đoàn"; no group size → "Giá từ … /khách". "2 ca liên tiếp" and "còn trống ngày…" dropped.
4. `00d21b9` Vietnamese copy in `matching-view.ts` + `understoodChips` ("AI đã hiểu").
5. `f517e33` card with image (CoverImage + RESULT_SIZES, same helper as 02), craft, tags, highlights, group price; chips in the top bar;
   "Yêu cầu báo giá" button removed from the card (no behaviour test depended on it; full suite passes); h1 "Ghép tour AI"; page copy in Vietnamese.

## Test lines changed (assert wording only)
- tests/unit/ai-matching-view.test.ts: `AI_FAILURE_TEXT` expected text; `HANDOFF_FAILURE_TEXT` expected text; noMatchView `lines` expectation
  (`'Ngân sách: 150.000 ₫/khách'`, `'Ngày: Consider flexible dates (+/- 2 days)'`). New tests added for `understoodChips`.
- tests/unit/ait-date-year.test.ts: line 77 `understoodDateLine` expected text (Vietnamese).
- tests/unit/ait121-additional-suggestions.test.ts: test title and the `<h1>` regex ("Ghép tour AI").
- New: tests/unit/ait-matching-card-data.test.ts, tests/unit/ai-matching-card-view.test.ts.

## Accepted differences from mockup 22
- Left rail: only "Cuộc ghép tour mới"; no history, no search (no API).
- Quick prompts (3, label in Vietnamese, text sent to the AI unchanged) replace the follow-up chips of the mockup.
- Rank / match score badge is not in the mockup and was removed from the card.

## Round 3 (21/11)
- A: `/api/ait/matching` already blocks non-Agency: Guest → 401, provider/ubnd/hdt → 403 (route checks `actor.authenticated`, `role === 'Tour_Agency'`).
  Proof: tests/integration/ait-matching-api.test.ts "Guest → 401 and non-Agency → 403 on sessions, messages and matching (BR-001, BR-002)" (passes). Guests never get group prices.
- B: relaxation values mapped to Vietnamese in the view (`matching-view.ts`, `VALUE_TEXT`, `CRITERION_LABELS`); server untouched.
- C: `recommendation-service.ts` is imported only by `/api/ait/matching` (AI module) and `src/lib/ai/extractor.ts` only by `/api/ait/sessions/[id]/messages`.
  Questions and prompts are constants/templates → translated to Vietnamese. Test wording lines changed:
  - tests/unit/clarification.test.ts lines 29, 38, 100, 107, 125 (regex on question wording → Vietnamese words).
  - tests/unit/ait-date-year.test.ts line 70 (`/date/i` → `/ngày/i`).
  - tests/integration/ait-matching-api.test.ts line 189 (`/start|origin|from/i` → `/xuất phát/i`).
  - tests/unit/ai-matching-view.test.ts: noMatchView line expectation for Dates (`'Ngày: Có thể linh hoạt ngày đi (± 2 ngày)'`).
  New tests: tests/unit/ait-vietnamese-copy.test.ts, noMatchView value mapping in ai-matching-view.test.ts.
- Still English: the card text "Vì sao hợp" (`explain()` in recommendation-service.ts: "Match score 91/100. Matches your … preference …"). Tests assert its wording
  (ait-matching-api.test.ts:214-215 `group of 10`, `estimated`; multi-turn-api.test.ts:54 `silk weaving`), not in the scope of this round.
- D: screenshots NOT taken: screen 22 needs an Agency login (DEV `/api/auth/login` returned 401 for the sample Agency). Per human decision 21/11
  login-only screens are skipped and shot in one batch script at the end of the day. Screen 22: **chưa chụp vì cần đăng nhập**.
- Desktop only (human decision 21/11); phone layout left as it is.

## Round 4: new-conversation state and structure test
- Added the mockup's new-conversation state (no message yet): greeting "Chào {tên liên hệ}, đoàn tiếp theo cần gì?" (name from `sessionDisplayName`
  in `layout.tsx`, passed by `agency-name.tsx`), composer with pills "Số khách / Ngày đi / Ngân sách" (they append a hint to the input),
  four example chips (fill the input, never send), note "AI chỉ gợi ý…". The old assistant welcome bubble is removed.
- Test `tests/unit/ai-matching-mockup22.test.ts`: blocks, order and wording of `source/GhepTourAI.dc.html` (also checked against the file when the
  mockup folder is on the machine), no English left, no "Yêu cầu báo giá".
- Accepted differences: no history/search in the left rail; quick prompts instead of follow-up chips in the chat state; chat title h1 stays "Ghép tour AI".
- Chips "buổi sáng", "Có sản phẩm mang về", "Tiếng Việt" of the mockup are not produced (the AI does not extract them).

## Round 5: explain() ("Vì sao hợp") in Vietnamese
- `explanation` from `explain()` is shown on the card as "Vì sao hợp:", so it was translated; prices use `viNumber` (vi-VN, `₫/khách`); the unused en-US `vnd` was removed.
- The craft label inside the sentence (`craftLabel`, e.g. "silk weaving", `src/lib/matching/craft-taxonomy.ts`) and the experience categories are still English (shared taxonomy values, not templates).
- Test wording lines changed:
  - tests/unit/recommendations.test.ts: `up to 13` → `tối đa 13 khách`; `group of 10` → `đoàn 10 khách`; `estimated` → `ước tính`; `175,000` → `175\.000`; `200,000` → `200\.000`; `budget` → `ngân sách`.
  - tests/integration/ait-matching-api.test.ts (T039): `group of 10` → `đoàn 10 khách`; `estimated` → `ước tính`.
  - Unchanged and still passing: `silk weaving` (multi-turn-api.test.ts:54) and `/silk/i` (recommendations.test.ts), because the craft label stays English.
