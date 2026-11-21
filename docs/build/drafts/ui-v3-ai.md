# Draft: ui/v3-ai — screen 22 Ghép tour AI (AIT121)

## Done
- `/ai-matching` restyled to mockup 22: left rail (new conversation), conversation column (user bubble, AI avatar + plain text), recommendation cards, suggestion pills, rounded composer with arrow send, disclaimer line.
- Card reuses `.v3-card` / `.v3r` of screen 02 (`explore-v3.css`), without the image (see below). View model in `src/app/ai-matching/card-view.ts` (test first: `tests/unit/ai-matching-card-view.test.ts`).
- AI logic untouched: `matching-view.ts`, API calls, handlers, ids (`matching-prompt-input`, `send-message-btn`, `quote-btn-*`, `chat-btn-*`, `retry-analysis-btn`, `understood-date`, `clarification-box`, `recommendations-container`) are unchanged.

## Differs from the mockup (data or logic not available; kept simple)
- No image on the card: the matching API returns no image, craft, duration, highlights or availability.
- No group total / old price / discount / "2 ca liên tiếp" / "Còn trống ngày…": not returned by the API, and the 15/11 decision says suggest single experiences, never combine them into an itinerary. Only "/khách" price and "Tối đa N khách/ca" are shown.
- No "AI đã hiểu" chips and no conversation title in the top bar: the extraction fields are not mapped; the understood date stays as a line in the message. h1 stays "AI Tour Matching" (test of #188).
- Left rail has only "Cuộc ghép tour mới" (reloads the page); no search and no history: there is no API for past conversations.
- Mockup follow-up chips ("Xem 2 ca liên tiếp…", "Đổi sang Thứ Năm…") are replaced by the three existing quick prompts.
- "Yêu cầu báo giá" kept as a secondary button (existing function, not in the mockup).
- AI texts from `matching-view.ts` and the quick prompt texts sent to the AI stay English (tested strings, AI logic).
