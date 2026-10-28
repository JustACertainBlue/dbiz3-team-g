# Quickstart: US-6 Verify Agency

## Run US-6 on localhost

### Prerequisites
1. Seed database and ensure dev server is running.
2. An HDT Admin account (e.g. `admin_hdt@artisanbridge.local`) and an Agency with status `Pending Approval`.

### Screens & URLs
- **Account Information (VER119)**: `http://localhost:3000/admin/verify/account?agencyId=<id>`
- **View Pending Profile (VER146)**: `http://localhost:3000/admin/verify/review?agencyId=<id>`
- **User Management (ADM095 Placeholder)**: `http://localhost:3000/admin/users`

### Demo Steps
1. Log in as HDT Admin at `http://localhost:3000/login`.
2. Navigate to `http://localhost:3000/admin/verify/review?agencyId=<id>`.
3. View submitted company details, documents, and past review history.
4. Test review actions:
   - Select **Approve**: Agency account status becomes `Approved` and Agency can log in.
   - Select **Request More Information**: Enter required comment. Agency account remains `Pending Approval` (BR-014), resubmission token is generated, and email is dispatched to outbox.
   - Select **Reject**: Enter required comment. Agency account status becomes `Rejected` and access is denied.
