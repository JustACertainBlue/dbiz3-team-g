# Quickstart: Run US-9 on localhost

## Prerequisites

1. PostgreSQL database running with schema and seed loaded.
2. An active session with role `ADMIN`:
   - Either HDT admin (platform-wide scope)
   - Or UBND admin (scoped to assigned village)
   - Note: In seed data, password hashes are synthetic placeholders. To log in on localhost, use the forgot password flow (`/forgot-password`) with a seed account email and grab the reset link from `var/outbox/`.

## Screen URLs

- User Management: `http://localhost:3000/admin/users` (ADM095)
- Account Access Actions: `http://localhost:3000/admin/users/<userId>/actions` (ADM118)
- View Account placeholder: `http://localhost:3000/admin/view-account` (ADM145)

## Demo Steps

1. Log in as an HDT admin.
2. Navigate to `/admin/users` (ADM095):
   - Notice the complete list of accounts across all roles (Agency, Provider, Admin).
   - Use the Role and Status filters to narrow the list.
3. Click "Manage access" next to an active user:
   - Navigates to ADM118 (`/admin/users/<userId>/actions`).
   - Select "disable", provide a reason, and click "Save account action".
   - The user's status transitions to "Disabled" and all open sessions are revoked immediately.
4. Log in as an UBND admin:
   - Navigate to `/admin/users`.
   - Notice that ONLY Local Providers within your assigned village are visible.
   - Agency accounts and other administrators are hidden.
   - Performing a password reset generates temporary credentials delivered to `var/outbox/`.
