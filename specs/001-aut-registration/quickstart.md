# Quickstart: AUT — Register Tour Agency Account (US-1)

*From a fresh clone on macOS or Windows (all tools free).*

---

## Prerequisites

You need:

- **Git** (any recent version)
- **Node.js ≥ 22.0.0** — [nodejs.org](https://nodejs.org)
- **npm ≥ 11** (bundled with Node 22)
- **PostgreSQL ≥ 16** with `psql` on your PATH (see §1 below)

---

## 1 — Install PostgreSQL client tools

### macOS (Homebrew)

```bash
# Install Homebrew first if not present: https://brew.sh
brew install postgresql@17
# Add psql to PATH (add this line to ~/.zshrc or ~/.bash_profile too)
export PATH="/opt/homebrew/opt/postgresql@17/bin:$PATH"
psql --version
```

### Windows (installer)

1. Download the **PostgreSQL 17 Windows installer** (free) from:
   <https://www.postgresql.org/download/windows/>
2. Run the installer. At the "Select Components" step, you only need
   **PostgreSQL Server** and **Command Line Tools**.
3. Note the superuser password you set during installation.
4. Add the PostgreSQL `bin` folder to your PATH, for example:
   ```
   C:\Program Files\PostgreSQL\17\bin
   ```
   (Settings → System → Advanced system settings → Environment Variables →
   Path → New)
5. Open a **new** PowerShell window and verify:
   ```powershell
   psql --version
   ```

---

## 2 — Clone and install

```bash
git clone <repo-url>
cd dbiz3-team-g
npm install
```

---

## 3 — Configure environment

```bash
# macOS / Linux
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Edit `.env` and fill in your values:

```dotenv
# Application connection string
DATABASE_URL=postgresql://artisan:secret@localhost:5432/artisan_bridge

# Admin connection used by tests to create/drop disposable databases
ADMIN_DATABASE_URL=postgresql://postgres:secret@localhost:5432/postgres
```

Adjust username, password, host and port to match your local PostgreSQL setup.

---

## 4 — Create the application database and load the schema + seed

### macOS / Linux

```bash
# Create the database (replace 'artisan' with your user, 'artisan_bridge' with your DB name)
psql "$ADMIN_DATABASE_URL" -c "CREATE DATABASE artisan_bridge;"

# Load the schema (from repo root — data/ must not be modified)
psql "$DATABASE_URL" -f data/schema.sql

# Load the seed data
psql "$DATABASE_URL" -f data/seed/load_seed.sql
```

### Windows PowerShell

```powershell
$env:PGPASSWORD = "secret"   # replace with your password

# Create the database
psql -U postgres -h localhost -c "CREATE DATABASE artisan_bridge;"

# Load the schema
psql -U artisan -h localhost -d artisan_bridge -f data/schema.sql

# Load the seed data
psql -U artisan -h localhost -d artisan_bridge -f data/seed/load_seed.sql
```

> **Note**: `data/schema.sql` and `data/seed/load_seed.sql` are **read-only
> inputs**. Never edit or regenerate files in `data/` from application code.

---

## 5 — Run the business-rule tests

Tests create a **disposable** test database, run the schema and seed, execute
all assertions, then drop the database. They do not modify files in `data/`.

```bash
npm test
```

Expected output (all green):

```
✓ fr002-validation: field validation rules
✓ fr003-duplicate-email: duplicate email is rejected
✓ fr004-create-account: Pending Approval account is created exactly once
✓ fr023-otp: OTP issue / verify / resend / expiry / attempt limits
```

If a test fails on database connectivity, verify that `ADMIN_DATABASE_URL` in
`.env` points to a superuser account that can `CREATE DATABASE`.

---

## 6 — Start the development server

```bash
npm run dev
```

Open your browser at <http://localhost:3000/register> to reach the Agency
Registration form (REG003).

**Dev OTP flow**:

1. Fill in the registration form and submit.
2. Open the OTP file written to `var/outbox/` to read the 6-digit code:
   ```bash
   # macOS / Linux
   ls -t var/outbox/ | head -1 | xargs -I{} cat "var/outbox/{}"

   # Windows PowerShell
   Get-ChildItem var\outbox | Sort-Object LastWriteTime -Descending |
     Select-Object -First 1 | Get-Content
   ```
3. Enter the OTP on REG115 and submit.
4. You are redirected to REG116 (Registration Status — Pending Approval).

---

## 7 — Validate the end-to-end scenario (manual)

After completing the OTP step, confirm in the database:

```sql
-- macOS / Linux
psql "$DATABASE_URL" -c "
  SELECT u.user_id, u.email, u.account_status, r.current_status
  FROM user_accounts u
  JOIN agency_registration_requests r ON r.agency_user_id = u.user_id
  WHERE u.role_code = 'Tour_Agency'
  ORDER BY u.created_at DESC
  LIMIT 1;
"
```

Expected result:
```
 user_id  | email | account_status  | current_status
----------+-------+-----------------+----------------
 <uuid>   | ...   | Pending Approval| Pending Approval
```

---

## 8 — Acceptance scenarios checklist (US-1)

| # | Scenario | How to verify |
|---|---|---|
| 1 | Valid data → Pending Approval exactly once | Run `npm test` (fr004); manual flow above |
| 2 | Duplicate email → error, no account created | Run `npm test` (fr003); try submitting twice with same email |
| 3 | Local Provider self-registration not offered | Confirm `/register` form has no "Local Provider" option |

---

## Useful references

| Artifact | Path |
|---|---|
| Feature spec | `docs/spec/specs/spec-AUT.md` |
| Canonical data model | `data/04-data-model.md` |
| Schema | `data/schema.sql` |
| Seed | `data/seed/load_seed.sql` |
| API contracts | `specs/001-aut-registration/contracts/api.md` |
| OTP outbox contract | `specs/001-aut-registration/contracts/otp.md` |
| Data model (slice) | `specs/001-aut-registration/data-model.md` |
| Research & decisions | `specs/001-aut-registration/research.md` |
