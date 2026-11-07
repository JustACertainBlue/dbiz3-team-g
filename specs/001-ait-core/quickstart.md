# Quickstart: 001-ait-core (AI Tour Matching)

Requires Node.js 22 or newer, Git 2.40 or newer and Python 3.11 (or `uv`). Run from the repository
root; commands are the same on macOS and Windows (PowerShell: type `curl.exe`). AIT is merged into
`main`; the old `001-ait-core` branch is stale and is not used.

No `.env` is needed for this slice: AI extraction is a local mock (no OpenAI call) and route distance is
mocked (no Google Maps call). All data comes from the shared JSON runtime seeded from `data/seed/`.

---

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch main
npm ci
uv run tools/start_feature.py --use specs/001-ait-core
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

Expected: `--check` prints `OK`; `validate_seed.py` prints `PASS: 47 CSVs/load headers; …`; `npm test`
ends with all tests passed; `npm run lint` prints no error. `npm run demo:reset` copies `data/seed/*.csv`
to `.demo-data/runtime.json` (git-ignored). Run **only one** dev server and stop it before any
`demo:reset` (the runtime is loaded once per process).

Useful test subsets:

```text
npx vitest run tests/integration/ait-matching-api.test.ts
npx vitest run tests/contract/ tests/unit/clarification.test.ts tests/unit/recommendations.test.ts
```

Seed facts used below (Experiences of Verified Providers with a published profile version):

| Village | Experience | Max pax | Price / pax | Provider `craft_type` |
|---|---|---|---|---|
| Vạn Phúc | Dệt lụa truyền thống | 13 | 175,000 | Silk/Textile |
| Bát Tràng | Nặn gốm thủ công | 12 | 150,000 | Ceramics |
| Phú Vinh | Đan mây tre | 14 | 200,000 | Other |
| Chuông | Làm nón lá | 15 | 225,000 | Other |
| Quất Động | Thêu họa tiết | 16 | 250,000 | Silk/Textile |

Demo Agency: log in at `/login` as `thanhvien13@example.invalid` (Công ty Du lịch Tràng An,
`02e568d8-d65e-54b1-a554-b411150d1dcb`); change role with **Đăng xuất** and a new login. Accounts, password
and the curl cookie `.demo-data/agency.jar`: [`docs/build/demo-login.md`](../../docs/build/demo-login.md).

## 2. Demo path (one Matching Session, AIT121)

> The expected results in §2 and §3 are the behaviour after `tasks.md` Phase 5 (Round 3 fixes, spec
> #23–#34). Until T054 is checked, parts of this path (origin follow-up, Budget suggestion, redirect,
> Retry, opening Messages) do not match `main`.

Log in as the demo Agency, open `http://localhost:3000/explore`, then **AI Tour Matching**
(`http://localhost:3000/ai-matching`). Send each line in the same conversation:

| # | Message | Expected |
|---|---|---|
| 1 | `Silk weaving` | Follow-up questions for group size, date and origin (OQ #4, #29); no cards |
| 2 | `10 pax on 2026-11-20 from Hoàn Kiếm` | 5 cards, Vạn Phúc #1; scores differ; each explanation names only evaluated factors (#25) |
| 3 | `Change to 15 pax` | Only Quất Động and Chuông |
| 4 | `Change to 13 pax` | 4 cards, no Bát Tràng (max 12) |
| 5 | `Change to 200 pax` | No match; the message names capacity (largest group 16); no Budget suggestion (#24) |
| 6 | `Change to 10 pax, budget 20,000 VND per person` | No match; Budget suggestion 150,000 (#23) |
| 7 | `Change budget to 150,000 VND per person` | At least one card (Bát Tràng) |

On a card: **Request Quote** twice keeps the same Quote Request and opens Messages (COM048) with that
Chat selected (#31); **Chat** opens the same Chat for that Provider; no Booking is created (BR-009,
BR-010, BR-018, BR-019). A fresh session with message 1 + `15 pax on 2026-11-20 from Hoàn Kiếm` gives
the same list as row 3.

Access: as **Guest**, `http://localhost:3000/ai-matching` redirects to `/login` (BR-002, #28); as
**Local Provider** or an Admin, an access-restricted page is shown.

Failure: stop the dev server and send a message from an open AIT121 page. Expected: "Temporary AI
Failure — we couldn't process your request right now. Your conversation is saved." with **Retry**, and
no cards (FR-003, BR-017, #27).

## 3. Same path with curl (API)

Log in first and save the cookie (`docs/build/demo-login.md`), then:

```text
curl -s -X POST http://localhost:3000/api/ait/sessions -b .demo-data/agency.jar -H "Content-Type: application/json" -d "{}"
curl -s -X POST http://localhost:3000/api/ait/sessions/<session_id>/messages -b .demo-data/agency.jar -H "Content-Type: application/json" -d "{\"sender\":\"Agency\",\"text\":\"Silk weaving, 10 pax on 2026-11-20 from Hoàn Kiếm\"}"
curl -s -X POST http://localhost:3000/api/ait/matching -b .demo-data/agency.jar -H "Content-Type: application/json" -d "{\"session_id\":\"<session_id>\",\"tour_preference_profile\":<tour_preference_profile from the previous response>}"
curl -s -X POST http://localhost:3000/api/ait/sessions/<session_id>/quote -b .demo-data/agency.jar -H "Content-Type: application/json" -d "{\"experience_id\":\"c8281688-2dc1-5cb1-9ff6-139df04ba562\"}"
curl -s -X POST http://localhost:3000/api/ait/sessions/<session_id>/chat -b .demo-data/agency.jar -H "Content-Type: application/json" -d "{\"experience_id\":\"c8281688-2dc1-5cb1-9ff6-139df04ba562\"}"
```

Expected: session `201` with `session_id`; the messages response has `extraction.is_complete =
true` and a `tour_preference_profile`; matching returns `top_matches` with Vạn Phúc #1; running quote or
chat twice returns the same `quote_request_id` / `chat_session_id`. Without `-b` (Guest) every AIT route
returns `401`; with `.demo-data/provider.jar` it returns `403`.

Afterwards: stop the dev server; `npm run demo:reset` restores the seed.
