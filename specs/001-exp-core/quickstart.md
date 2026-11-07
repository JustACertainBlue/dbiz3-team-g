# Run the EXP prototype

Requires Node.js 22 or newer and Python 3 or `uv`. Run from the repository root (macOS or Windows):

```text
npm ci
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:seed
npm run dev
```

If the laptop uses `uv` instead of standalone Python, run `uv run data/scripts/validate_seed.py`.
`npm run demo:seed` copies `data/seed/*.csv` once to `.demo-data/runtime.json` (git-ignored), the shared
JSON runtime that every module reads and writes. To start again from the seed, **stop the dev server first**
(it keeps the data in memory and would write it back), then run `npm run demo:reset` and start it again.

## Demo path (`http://localhost:3000/explore`)

Roles: log in at `http://localhost:3000/login` with a demo account and log out from the header to change role
(see [`docs/build/demo-login.md`](../../docs/build/demo-login.md); the old Role Switcher works only in tests).

1. **Guest** (not logged in, or after **Đăng xuất**): browse the catalog, open a Provider and an
   Experience. Prices and contact stay hidden; Quote/Chat lead to Login. Guest analytics need the opt-in
   checkbox; without it browsing works and no non-essential event is recorded.
2. **Tour Agency** (log in as `thanhvien13@example.invalid`, Lý Gia Hân, Công ty Du lịch
   Tràng An): Agency prices and contact appear; select a category to create an explicit preference signal and
   see Agency-only re-ranking.
3. On an Experience page, **Yêu cầu báo giá** creates or reuses one Quote Request for this Agency and Experience,
   opens the pair Chat in `/messages` and logs one `request_quote` strong action with
   `filter_values.source_context = "Detail Page"` in the Explore session (FR-007, spec-EXP #29, #32). Back on the
   Experience page, the button is replaced by "Đã gửi yêu cầu báo giá" (FR-011).
4. **Chat với Provider** (Experience or Provider page) opens the pair Chat and logs `open_chat` with
   `source_context = "Detail Page"` (spec-EXP #33). No Booking is created by either action.

New Explore sessions, interactions, preference weights and ranking exposures live in the dev server's memory
(`src/lib/explore/demo-runtime.ts`) and disappear on restart; Quote Requests and Chats are stored in the JSON
runtime. `data/schema.sql` remains the canonical PostgreSQL schema. Image binaries are not supplied, so the UI
shows placeholders.

Read [implementation-status.md](implementation-status.md) before marking any EXP story complete. Weekly
scheduling, atomic ranking promotion (BR-014, F-EXPLORE-17, not in the Alpha), complete detail-visit capture and
live rollback are not wired in this prototype.
