# Quickstart: In-app Chat (IAC) — Core Slice (US-1)

This guide provides the exact commands to set up, test, and run the In-app Chat module from a clean checkout on macOS and Windows using free tools.

---

## 1. Prerequisites

- **Node.js**: `>= 22.0.0`
- **npm**: `>= 10.0.0`
- **Python**: `>= 3.10` (or `uv`) for seed data scripts

---

## 2. Installation & Setup

From the repository root:

```bash
# 1. Install project dependencies
npm install

# 2. Validate canonical seed data
uv run data/scripts/validate_seed.py
# (or: python data/scripts/validate_seed.py)

# 3. Seed the local JSON runtime (.demo-data/runtime.json)
npm run demo:seed
```

---

## 3. Running Automated Tests

Run the Vitest test suites (no external database server required; runs in-memory):

```bash
# Run all automated tests
npm test

# Or run tests specifically for IAC
npx vitest run tests/contract/chat-api.test.ts tests/unit/chat-*.test.ts
```

All IAC tests must pass:
- Unit tests covering `BR-001` through `BR-021` (participant checks, session reuse, markdown/length validation, unread count reset).
- Contract tests covering `/api/iac/sessions` and `/api/iac/sessions/:id/messages`.

---

## 4. Starting the Development Server

```bash
npm run dev
```

The application will be accessible at `http://localhost:3000`.

---

## 5. End-to-End Demo Path (Verification for Step 7)

Follow these steps to verify User Story `US-1 (P1)` on your workstation:

1. **Sign in as a Tour Agency**:
   - Go to `http://localhost:3000/login`.
   - Select the demo Tour Agency account (e.g. `Hanoi Heritage Travel`).
2. **Access In-app Chat**:
   - Navigate to `/messages` (Screen `COM048`).
   - You will see the Chat List showing existing conversations with Local Providers, sorted by latest message time.
   - Or open Chat directly from an Experience in Explore (`/explore`) by clicking **Chat with Provider**.
3. **Send a Formatted Message**:
   - Open the conversation with Chuong Conical Hat Craft Cooperative.
   - Notice the chronological message history (oldest to newest).
   - In the input box, type a message with bold and italic markdown:
     `"Hello! We would like to confirm **group size: 15** for *next Saturday*."`
   - Click **Send**.
   - Verify: The message appears immediately in the conversation thread, bold and italic text are rendered properly, and the session's preview and timestamp update in the left list.
4. **Verify Provider Perspective & Unread Count**:
   - Open a private/incognito window (or switch demo user at `/login`) and sign in as the Local Provider (`Nguyen Van Chuong`).
   - Navigate to `/messages` (Screen `COM065`).
   - Verify: The conversation with `Hanoi Heritage Travel` shows an unread badge (`1`).
   - Click the conversation to open it.
   - Verify: The unread badge resets to `0`, and the message sent by the Agency is clearly displayed with its timestamp.

