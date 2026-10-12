# Quickstart: Profile Management (PRF) — Core Slice

Validates that PRF is working end-to-end from a fresh clone, on macOS and Windows.
Run every command exactly as written. Do not skip any step.

---

## Prerequisites

- Node.js >= 22.0.0 (`node --version`)
- Python >= 3.11 (`python --version` or `python3 --version`)
- `uv` installed (`uv --version`) — [install](https://docs.astral.sh/uv/getting-started/installation/)
- Git

**Optional (recommended for production-like testing):**
- PostgreSQL 16 running locally — the default test setup uses SQLite; no Postgres required

---

## 1. Clone and install

```bash
# macOS / Windows PowerShell
git clone https://github.com/JustACertainBlue/dbiz3-team-g.git
cd dbiz3-team-g
git switch 002-prf-core
npm install
```

---

## 2. Environment setup

Copy the example env file and fill in values:

```bash
# macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Minimum required values for local dev (SQLite mode — no Cloudinary or OpenAI key needed for tests):

```dotenv
DATABASE_URL=file:./local.db          # SQLite — zero-config
# Leave CLOUDINARY_* and OPENAI_API_KEY blank for tests (mocked by msw)
```

For production-like local dev with Postgres:
```dotenv
DATABASE_URL=postgresql://localhost:5432/hanoi_artisan
```

---

## 3. Load seed data

```bash
# Validate seed coverage first (read-only)
python data/scripts/validate_seed.py

# Load seed into local SQLite (or Postgres if DATABASE_URL points to PG)
python data/scripts/generate_seed.py
```

Expected output: `Seed validation passed. N records validated.`

---

## 4. Run tests

```bash
npm test
# or
npx vitest run
```

All PRF tests live in `tests/prf/`. Expected: all green, including the seed smoke-test
(`tests/prf/seed/prf-seed.test.ts`) that verifies at least one Provider and one Experience
from the seed have correct `verification_status` and `price_per_person` values.

---

## 5. Start the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 6. Demo path — walk through each user story

### US-3: View Local Provider Profile
1. Navigate to `http://localhost:3000/provider/<any-provider-id-from-seed>`
2. As an unauthenticated (Guest) user: only public fields visible — no contact, no pricing.
3. Simulate a Tour Agency session (see test helper `tests/prf/helpers/mockSession.ts`) — full collaboration fields appear.

### US-4: Manage Provider Profile
1. Log in as a Local Provider (mock session or seed user).
2. Navigate to `http://localhost:3000/provider/<own-provider-id>/edit`
3. Submit an incomplete profile → status remains **Draft**.
4. Fill all required fields, click **Save Changes** → status becomes **Pending Verification**.
5. Edit a major field (Business Name) on a Verified provider → previous Verified version remains displayed.

### US-5: Manage Experiences
1. Navigate to `http://localhost:3000/provider/<own-provider-id>/experiences`
2. Create a new Experience: fill all fields, upload one image per required category (Activity, Space, Product) → **Save** succeeds.
3. Attempt to save an Experience with `price_per_person = 0` → validation error shown.
4. Delete an Experience with no bookings → hard-deleted.
5. Delete an Experience with an active booking → blocked with error message.

### US-6: Verify Provider Profile
1. Log in as a UBND Admin (mock session).
2. Navigate to `http://localhost:3000/provider/<pending-provider-id>`
3. Click **Approve** → status becomes **Verified** and the profile is publicly visible.
4. On a different provider in the same village, click **Request Revision** (provide comments) → status becomes **Revision Required**.
5. Attempt to verify a provider in a different village → access denied.

### US-1: Manage Agency Profile
1. Log in as a Tour Agency Owner.
2. Navigate to `http://localhost:3000/agency/<own-agency-id>/edit`
3. Change a non-major field (description) → saved immediately.
4. Change Company Name → `requires_hdt_rereview: true` in response; old name still shown.

### US-2: View Agency Profile
1. As Guest → only name, type, location, team size visible (no Tax ID, no tour_types).
2. As HDT Admin → full detail visible.
3. As another Agency → contact info visible, Tax ID not visible.

---

## 7. Find a test and its business rule

To verify BR-014 (locked fields during active booking):
- Test: `tests/prf/unit/experience-service.test.ts` — search for `BR-014`
- Code: `src/lib/prf/experience-service.ts` — search for `lockedFields`
