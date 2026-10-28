# Quickstart: US-10 Revise and Resubmit Agency Registration

## Run US-10 on localhost

### Prerequisites
1. Seed database running with an Agency registration in `Request More Information` status and an active 24-hour resubmission token.

### Screens & URLs
- **Agency Registration (Secure Edit Mode)**: `http://localhost:3000/register?token=<resubmission_token>`
- **Registration Status**: `http://localhost:3000/register/status?requestId=<id>`

### Demo Steps
1. As an HDT Admin on `http://localhost:3000/admin/verify/review?agencyId=<id>`, select "Request More Information", enter a comment, and submit.
2. Check `var/outbox/` for the email containing the secure resubmission token.
3. Open `http://localhost:3000/register?token=<token>` as Guest.
4. Verify that existing company data is prefilled, password fields are not requested, and the "Resubmit registration" button is visible.
5. Edit company details and click "Resubmit registration".
6. Observe redirect to `/register/status` confirming resubmission is in "Pending Approval".
7. Re-opening the same link shows an "invalid or expired token" error.
