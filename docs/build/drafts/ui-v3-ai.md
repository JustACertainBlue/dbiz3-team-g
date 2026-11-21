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

## Not done / open
- Step 6 (screenshots 1440 and 390 with a DEV Agency login): NOT done. The worktree has no `.env.local` (`ls -a` shows only `.env.example`),
  the dev server on 3203 failed on `/api/auth/login` with "DATABASE_APP_URL is not configured". Server stopped. No env file was read.
- Text that still comes from the server and stays English: clarification questions from the AI, the relaxation `conversation_prompt`
  and relaxation values (e.g. "Consider flexible dates (+/- 2 days)") in `src/lib/matching/recommendation-service.ts` / AI extraction.
- Mockup items not built: none of the chips for "buổi sáng" / "Tiếng Việt" (not extracted by the AI).
