# Quickstart: IAC round 2 — Close Chat (F-CHAT-04)

Requires Node.js 22+ and Python 3 (or `uv`); same commands on macOS and Windows (PowerShell: `curl.exe`,
JSON bodies from a file with `-d @body.json`).

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 015-iac-close
npm ci
uv run tools/start_feature.py --use specs/015-iac-close
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

Seed facts: demo Agency (cookie `.demo-data/agency.jar` (log in first: [`docs/build/demo-login.md`](../../docs/build/demo-login.md)), Lý Gia Hân, Tràng An) has Active Chat
`a0b57355-8142-5b47-be08-6130aa21c021` with Phú Vinh (Quách Minh Tâm). Demo Provider (cookie `.demo-data/provider.jar`,
Kiều Anh Thư, Bát Tràng) has Active Chat `35ed4094-fa5a-55a6-ba1d-c03e56adfe79` with Sông Hồng. The demo
pair Tràng An – Bát Tràng has no Chat; Experience `c9f9faf7-2987-5ae4-b1ed-95c095fcce69` is Bát Tràng's.

## 2. API

1. Agency closes its Phú Vinh Chat. Expect `HTTP 200`, `chat_status "Closed"`, `closed_by` = Agency user, the #32 message.

```bash
curl -s -X POST "http://localhost:3000/api/iac/chats/a0b57355-8142-5b47-be08-6130aa21c021/close" -b .demo-data/agency.jar -H "content-type: application/json" -d "{\"close_reason\":\"Đã chốt lịch\"}" -w "\nHTTP %{http_code}\n"
```

2. Same call again → `409 CHAT_CLOSED`. Send into it → `409`. History → `200` with `closed_at`, `closed_by_name "Lý Gia Hân"`.
3. Provider closes `35ed4094…` without a reason → `200`. As `agency` → `403`; `ubnd` / `hdt` / `guest` → `403`;
   a 501-character reason → `400`.
4. Agency opens from its Booking `0971a1b6-32e2-5581-a02d-d9636e22e1b6` → `200`, a **new** `chat_session_id`, `is_new_session true`.

## 3. Screens

1. Agency → `/explore/experiences/c9f9faf7…` → "Chat với Provider" → `/messages` (Bát Tràng Chat) →
   "Đóng hội thoại" → dialog → "Hủy" (still Active) → again, reason "Xong", "Đóng hội thoại" → success message,
   composer gone, notice "Đã đóng bởi Lý Gia Hân lúc … — chỉ xem", no reopen button.
2. Same Experience → "Chat với Provider" again → a new Active Chat; the list shows both (Closed below/above by time).
3. Provider → `/messages` → close the new Chat → read-only for the Provider; Agency sees Closed too.
4. Provider → BKG134 Booking for Tràng An → BKG135 "Chat" → a new Active Chat holding the Booking Update (#36).
