# Quickstart: US-7 Create UBND Account

## Run US-7 on localhost

### Prerequisites

1. PostgreSQL running with the test DB loaded (see `specs/001-aut-registration/quickstart.md`).
2. `.env` configured with `DATABASE_URL`.
3. Dev server started by human: `npm run dev`.

### Seed accounts

- HDT admin: use an ADMIN/HDT seed account. Seed password hashes are placeholders and cannot be used for direct login.
- To get a working password: trigger the Forgot Password flow (US-4) for an HDT account email, read the token from `var/outbox/`, and reset the password via PAS142.

### Screen URLs

| Screen | URL | Notes |
|---|---|---|
| ADM117 Create Account | `http://localhost:3000/admin/create-account` | Visible to HDT only |
| ADM095 User Management | `http://localhost:3000/admin/users` | Returns after success |

### Demo steps

1. Log in as HDT admin (use forgot-password flow for a working password).
2. Navigate to `http://localhost:3000/admin/create-account`.
3. Fill in Name, Email, Phone, and Assigned Village ID from seed data (see `data/seed/villages.csv`).
4. Click **Create** → account is created with `account_status=Active`, `must_change_password=true`.
5. Check `var/outbox/` for the credential email written by the outbox pattern.
6. Redirected to `/admin/users` (ADM095 placeholder).

### Seed data note

The seed file `data/seed/villages.csv` contains real village IDs. Use one of those as `assigned_village_id`.
If the seed village already has a UBND assignment in the seed data, the create call will return 409. In that case, use a village not already in `data/seed/ubnd_village_assignments.csv`.

### Note on seed passwords

Seed password hashes are placeholders. Tests create their own users with real bcrypt hashes inside the disposable test database only.
