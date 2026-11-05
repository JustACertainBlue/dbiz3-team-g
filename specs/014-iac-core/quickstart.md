# Quickstart: IAC core (F-CHAT-01..03)

Requires Node.js 22 or newer and Python 3 (or `uv`). Run from the repository root; commands are the
same on macOS and Windows (PowerShell: type `curl.exe`, and put JSON bodies in a file with `-d @body.json`).

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 014-iac-core
npm ci
uv run tools/start_feature.py --use specs/014-iac-core
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

`npm run demo:reset` is required once: it removes rows that older code wrote with `Open` / `Text` /
`Experience Context` (Q2). Stop the dev server before any later reset and run only one server (lesson #19).

Seed facts used below: demo Agency (cookie `agency`, user Lý Gia Hân, Công ty Du lịch Tràng An) has one
Active Chat `a0b57355-8142-5b47-be08-6130aa21c021` with Xưởng thủ công Phú Vinh (user Quách Minh Tâm) and a
Completed Booking `0971a1b6-32e2-5581-a02d-d9636e22e1b6` with the same Provider. Demo Provider (cookie
`provider`, user Kiều Anh Thư, Bát Tràng) has Active Chat `35ed4094-fa5a-55a6-ba1d-c03e56adfe79` with Công ty
Du lịch Sông Hồng (user Chu Nhật Minh) and 5 unread messages there. Experience
`c9f9faf7-2987-5ae4-b1ed-95c095fcce69` "Nặn gốm thủ công" belongs to the demo Provider; the demo pair has no Chat yet.

## 2. Phase A — API

1. Provider list. Expect `HTTP 200`; a row for `35ed4094…` with `participant_name` "Chu Nhật Minh",
   `organization` "Công ty Du lịch Sông Hồng", `unread_count` 5.

```bash
curl -s "http://localhost:3000/api/iac/chats" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

2. Open that history. Expect `HTTP 200`, one message, `has_more_messages` false; repeat step 1: `unread_count` 0.

```bash
curl -s "http://localhost:3000/api/iac/chats/35ed4094-fa5a-55a6-ba1d-c03e56adfe79/messages" -H "Cookie: hab_demo_account=provider" -w "\nHTTP %{http_code}\n"
```

3. Send. Expect `HTTP 201` with `message_id`, `sent_at`, `last_message_timestamp`; the Chat moves to the top of step 1.

```bash
curl -s -X POST "http://localhost:3000/api/iac/chats/35ed4094-fa5a-55a6-ba1d-c03e56adfe79/messages" -H "Cookie: hab_demo_account=provider" -H "content-type: application/json" -d "{\"message_text\":\"Xưởng xác nhận **15 khách** vào *sáng thứ Bảy*.\"}" -w "\nHTTP %{http_code}\n"
```

4. Errors (nothing written): `message_text` `"   "` → `400`; 4001 characters → `400`; the same history
   as `agency` (not a participant) → `403`; an unknown Chat id → `403` (#27); `ubnd` / `hdt` / `guest` → `403`.
5. Agency opens from its Booking. Expect `HTTP 200`, `chat_session_id` `a0b57355…`, `is_new_session` false.

```bash
curl -s -X POST "http://localhost:3000/api/iac/chats" -H "Cookie: hab_demo_account=agency" -H "content-type: application/json" -d "{\"source\":\"Booking\",\"booking_id\":\"0971a1b6-32e2-5581-a02d-d9636e22e1b6\"}" -w "\nHTTP %{http_code}\n"
```

6. Same Booking as `provider` (not its Booking) → `403`.

## 3. Phase B — screens

1. Tour Agency → Explore → "Nặn gốm thủ công" → "Chat với Provider": `/messages` opens the new Chat with
   the context message "Xin chào, tôi quan tâm đến trải nghiệm này: **Nặn gốm thủ công** (…)" sent by the
   Agency. Click it again: same Chat, one more context message, no second Chat.
2. Same Experience → "Yêu cầu báo giá": same Chat, a Quote Request message.
3. AI Tour Matching → Chat on a Bát Tràng result: same Chat again (pair already Active).
4. Local Provider → `/messages`: the Chat with Công ty Du lịch Tràng An shows an unread badge; open it →
   badge gone; reply with `**đậm**` and `*nghiêng*` → rendered bold/italic; `<b>x</b>` shows as text.
5. Composer: counter `n/4000`, Send disabled while sending and over 4000.
6. Agency → Bookings → `0971a1b6…` (BKG138) → Chat → `/messages` with the Phú Vinh Chat selected.
   Provider → a Booking on BKG135 → Chat → that Agency's Chat.
7. Provider creates a Booking for the demo Agency (BKG134) → the Booking Update message lands in the same
   Chat as steps 1–3 (one Active Chat per pair).

Expected shapes: [contracts/chat-api.md](contracts/chat-api.md), tables: [data-model.md](data-model.md).
