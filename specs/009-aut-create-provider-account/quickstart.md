# Quickstart: Run US-8 on localhost

## Prerequisites

1. PostgreSQL database running with schema and seed loaded.
2. An active session with role `ADMIN` and `admin_type` = `UBND` (or login as an existing UBND user from seed).
   - In seed data: Seed password hashes are placeholders. To obtain a known password for a seed account on localhost, use the forgot password flow (`/forgot-password`) with the seed email and retrieve the reset link from `var/outbox/`.

## Screen URLs

- Create Account (UBND view): `http://localhost:3000/admin/create-account`
- Cancel target / Accounts list: `http://localhost:3000/admin/users`

## Demo Steps

1. Log in as an UBND admin user.
2. Navigate to `/admin/create-account`.
3. Notice the form renders the Local Provider onboarding fields:
   - Provider Name
   - Address
   - Contact Person Name
   - Phone
   - Email
   - Assigned Village (automatically populated from the logged-in UBND's assignment)
4. Enter valid provider details and click **Create**.
5. The provider account is created with `account_status = 'Active'` and temporary credentials generated.
6. Check `var/outbox/` for the sent credentials JSON file.
7. Verification status of the created Provider Profile is `Draft` (BR-015).
