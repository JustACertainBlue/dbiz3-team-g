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

## Round 6: review of the real screen (21/11)
1. Suggestions: the old three quick prompts are removed; only the four mockup examples of the new-conversation state remain. Deviation: no follow-up
   chips in the chat state (mockup has them) because there is no data to build them.
2. Scroll: the whole page scrolls (no own scroll frame, no 100vh); only composer + note stick to the bottom (`position: sticky; bottom: 0`, white fade
   `linear-gradient(180deg, rgba(255,255,255,0), #FFF 28%)`, padding 20px 0 16px) as in the mockup. Test: tests/unit/ai-matching-layout.test.ts.
3. Phone (< 768 px): the card no longer has its own phone layout; it uses the `.v3r` rules of screen 02 (image 112 px, 5:8; own desktop padding only from 768 px).
   Chat composer: one-line textarea that grows while typing (max 160 px) and the send button on the same row.
4. `explain()` ("Vì sao hợp"): no "Điểm phù hợp xx/100"; the craft is the Vietnamese label of the card (`craft_display` = villages.editorial_craft, else the label of
   craft_type, added by `/api/ait/matching` before building recommendations; fallback label of the wanted craft_type). Never the raw "pottery"/"Ceramics".
   When no factor was evaluated the text is "Đáp ứng các yêu cầu bắt buộc của đoàn." (BR-007: never empty).
5. "AI đã hiểu" chip for the craft shows the Vietnamese label ("Gốm sứ", "Dệt lụa"); an unknown preference is shown as written.
- Test wording lines changed in this round: tests/unit/recommendations.test.ts ("silk preference" line: `/silk/i` → `/Dệt lụa/`);
  tests/integration/multi-turn-api.test.ts:54 (`silk weaving` → `Dệt lụa`); tests/unit/ai-matching-view.test.ts (understoodChips input `craft_preference: 'pottery'`, expected `Gốm sứ`).
  New tests: recommendations.test.ts "explanation wording (screen 22)", ai-matching-view.test.ts craft chip, ait-matching-card-data.test.ts `craftDisplay`, ai-matching-layout.test.ts.
- The "Still English" note of Round 5 (craft label in the explanation) is resolved by item 4.

## Round 7: security check
- Forms: both composer forms of screen 22 now have `method="post"` (before: no method → a submit before hydration would GET `/ai-matching`). The inputs have no `name`, so no data could reach a URL either way. No other `<form>` in the screen.
- Temporary-password sessions: no new API route was added; `/api/ait/matching` uses `sessionContextFromRequest`, which turns a `must_change_password` session into a Guest for every path except change-password/session/logout → 401, no recommendations or prices. The screen layout uses `currentServerSession` (same function, path `/internal/session`) → Guest → redirect to `/login`.
- Tests: tests/unit/ai-matching-security.test.ts (forms POST; matching 401 and layout Guest for a must-change session, with a normal-session control).

## Round 8: pills removed, history ("Gần đây")

**A. Phone.** Screen 22 phone layout is not finished (result cards push the text into the right column). Not touched, per decision 21/11 (desktop focus).

**B. Mockup change.** The new-conversation composer has no "Số khách / Ngày đi / Ngân sách" pills any more; only the textarea and the send button remain. Removed from `page.tsx` and `ai-matching.css`. Test change: `tests/unit/ai-matching-mockup22.test.ts` — removed the line `'Số khách', 'Ngày đi', 'Ngân sách', 'Gửi',` → `'Gửi',` in `EMPTY_STATE`, and added `'Gần đây'` to `SIDEBAR` (plus the header comment).

**C. History.**
1. What is stored (checked in `data/schema.sql` and `src/lib/matching/session-service.ts`):
   - `matching_sessions`: `matching_session_id`, `agency_id`, `conversation_context` (jsonb, always `{}`), `started_at`, `last_activity_at`.
   - `matching_messages`: `message_id`, `matching_session_id`, `sender` (`Agency` | `Assistant`), `text`, `sent_at`.
   - Only the Agency's messages are written (`/api/ait/sessions/[id]/messages` POST). The assistant's replies, the cards and the "AI đã hiểu" chips are built in the browser and never saved. `recommendation_results` exists in the schema but no code writes it.
   - Enough for the sidebar (first Agency message + date) and for continuing (extraction reads all Agency messages). Not enough to show the old assistant replies as they were: they are rebuilt by re-running the analysis on the stored messages (`retry: true`, adds no message). The extractor and matching are rule-based, so the result is the same unless the catalogue or prices changed since. No migration.
2. API (read-only, same access as `/api/ait/matching`): `GET /api/ait/sessions` (own company, newest first by `last_activity_at`, max 20, only sessions with at least one Agency message) and `GET /api/ait/sessions/[id]` (session + stored messages). 401 Guest; 403 not a Tour_Agency; 403 another company's or unknown session. Tests: `tests/unit/ai-matching-history.test.ts`.
3. Sidebar: each row = first Agency message cut to 42 characters + "Hôm nay" or dd/mm (Hanoi time). A row opens `/ai-matching?session=<id>`: stored messages show, the analysis is re-run, and the next message goes to the same `session_id`. "Cuộc ghép tour mới" is still a plain link and starts a new session; the old one stays in "Gần đây".

**Deviations:** no "Tìm cuộc trò chuyện" (decision); no "đang xem" chevron collapse for "Gần đây" (icon only); old assistant replies are rebuilt, not replayed; one session is created on every page load, but sessions with no message are hidden from the list. Not photographed: needs login.

**Cần sửa chung:** none. Possible later (needs migration, not done): store assistant replies / `recommendation_results` so an old chat shows exactly what was said.

## Round 9: browser test, 6 items
- **6. "Vì sao hợp" for a different craft:** `Không hợp sở thích {nghề} của bạn.` → `Gợi ý thêm, khác nghề {nghề} bạn chọn.` (`recommendation-service.ts` `explain()`). Test wording line changed: `tests/unit/recommendations.test.ts:163` (`toContain('Không hợp sở thích Gốm sứ')` → `toContain('Gợi ý thêm, khác nghề Gốm sứ bạn chọn.')`).
- **5. Card price:** under the group total a line "X ₫/khách" (total ÷ guests, after the group discount; `perGuest()` in `card-view.ts`). "Đã gồm vật liệu và người hướng dẫn" (same text as the card of screen 02) only when `card.included` (the experience has inclusions). Test: `tests/unit/ai-matching-price-line.test.ts`.
