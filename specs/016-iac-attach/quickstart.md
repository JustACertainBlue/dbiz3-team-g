# Quickstart: IAC round 3 — F-CHAT-05 attachments

Requires Node.js 22 or newer and Python 3 (or `uv`). Run from the repository root; commands are the same
on macOS and Windows (PowerShell: type `curl.exe`).

## 1. Fresh clone, checks, one dev server

```text
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 016-iac-attach
npm ci
uv run tools/start_feature.py --use specs/016-iac-attach
uv run tools/start_feature.py --check
python data/scripts/validate_seed.py
npm test
npm run lint
npm run demo:reset
npm run dev
```

`npm run demo:reset` also removes `.demo-data/chat-files` (#39). Stop the dev server before a reset.

Seed facts: demo Agency (cookie `agency`) has Active Chat `a0b57355-8142-5b47-be08-6130aa21c021` with
Xưởng thủ công Phú Vinh; it holds seed attachment `e64a4f0b…` (metadata only). Demo Provider (cookie
`provider`) has Active Chat `35ed4094-fa5a-55a6-ba1d-c03e56adfe79` with Công ty Du lịch Sông Hồng.

## 2. Phase A — API

Make two small test files first. macOS: `printf 'demo' > bao-gia.pdf` and `printf 'x' > note.txt`.
Windows PowerShell: `Set-Content bao-gia.pdf demo -NoNewline` and `Set-Content note.txt x -NoNewline`.

1. Send. Expect `HTTP 201`, one attachment with `file_type` `application/pdf`, `file_size` 4.

```bash
curl -s -X POST "http://localhost:3000/api/iac/chats/a0b57355-8142-5b47-be08-6130aa21c021/attachments" -H "Cookie: hab_demo_account=agency" -F "files=@bao-gia.pdf" -w "\nHTTP %{http_code}\n"
```

2. History shows the new message with `attachments`; the Chat list preview is "Tệp đính kèm: bao-gia.pdf".
3. Download with the `attachment_id` from step 1. Expect `HTTP 200`, `content-disposition: attachment…`, body `demo`.

```bash
curl -s -D - "http://localhost:3000/api/iac/chats/a0b57355-8142-5b47-be08-6130aa21c021/attachments/<attachment_id>" -H "Cookie: hab_demo_account=agency"
```

4. Errors, nothing stored: `note.txt` → 400 `file_errors` `UNSUPPORTED_FORMAT`; six files → 400; as
   `provider` (not a participant) → 403 for upload and download; seed attachment `e64a4f0b-…` download → 404.
5. Close the Chat (`POST …/close`), then upload → 409; download from step 3 still → 200.

## 3. Phase B — screens

1. Tour Agency → `/messages` → the Phú Vinh Chat → "Đính kèm": choose a PDF and an XLSX → both listed with
   type and size → "Gửi tệp" → the message shows two download links.
2. Choose a `.txt` or a file over 10 MB → that row shows the error and "Gửi tệp" stays disabled; "Hủy"
   sends nothing.
3. Local Provider → `/messages` → the Chat shows the preview "Tệp đính kèm: …" (COM126 same dialog).
4. A Closed Chat shows no "Đính kèm" button; its attachment links still download.

Expected shapes: [contracts/attach-api.md](contracts/attach-api.md), tables: [data-model.md](data-model.md).
