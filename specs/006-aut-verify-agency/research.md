# Research & Design Decisions: US-6 Verify Agency

## Decisions & Alternatives

### 1. Routes for Screens VER119 and VER146
- **Decision**: 
  - `VER119`: `src/app/admin/verify/account/page.tsx` (`/admin/verify/account?agencyId=<id>`)
  - `VER146`: `src/app/admin/verify/review/page.tsx` (`/admin/verify/review?agencyId=<id>`)
  - `ADM095`: `src/app/admin/users/page.tsx` (`/admin/users` - minimal placeholder per Anti-invention rule 4)
- **Why chosen**: Clear URL hierarchy under `/admin/verify/` reflecting the review workflow.

### 2. Review Decision & Status Updates (FR-018)
- **Decision**:
  - `Approve`:
    - `agency_registration_requests.current_status = 'Approved'`
    - `user_accounts.account_status = 'Approved'`
    - `account_status_history` row recorded
    - `agency_review_records` row inserted
    - Email written to `var/outbox/`
  - `Request More Information`:
    - `agency_registration_requests.current_status = 'Request More Information'`
    - `user_accounts.account_status` remains `'Pending Approval'` (BR-014)
    - `agency_review_records` row inserted with mandatory comment (Open question 12)
    - Generate single-use token in `registration_resubmission_tokens` (valid for 24h)
    - Email written to `var/outbox/` with edit link
  - `Reject`:
    - `agency_registration_requests.current_status = 'Rejected'`
    - `user_accounts.account_status = 'Rejected'`
    - `account_status_history` row recorded
    - `agency_review_records` row inserted with mandatory comment (Open question 12)
    - Email written to `var/outbox/`
- **Why chosen**: Directly satisfies FR-018, BR-002, BR-003, BR-014, BR-016 and Open Question 12.

---

## Interpretations & Proposed Open Questions

### Interpretations
1. **Notifications Delivery**: Open Question 13 specifies notifications are sent via email + in-app notification. Since in-app notification tables are out of AUT scope, notification status is logged and outgoing email is written to `var/outbox/`.

---

## Traceability Table

| Scope ID | Component / Route / Export | File | Notes |
|---|---|---|---|
| **F-AUTH-18** / **FR-018** | `reviewAgencyRegistration(...)` | `src/lib/agency-review.ts` | Handles Approve, Request More Information, Reject decisions |
| **F-AUTH-18** / **FR-018** | `getAgencyReviewDetails(agencyId)` | `src/lib/agency-review.ts` | Loads profile, documents, review history for review |
| **F-AUTH-18** / **FR-018** | `POST /api/admin/agency-reviews` | `src/app/api/admin/agency-reviews/route.ts` | Decision submission endpoint |
| **F-AUTH-18** / **FR-018** | `GET /api/admin/agency-reviews` | `src/app/api/admin/agency-reviews/route.ts` | Fetch review details endpoint |
| **VER119** | Account Information Screen | `src/app/admin/verify/account/page.tsx` | Read-only account overview |
| **VER146** | View Pending Profile Screen | `src/app/admin/verify/review/page.tsx` | Review decision form & submitted profile |
| **ADM095** | User Management (Placeholder) | `src/app/admin/users/page.tsx` | Minimal placeholder |
| **AS-1** | Acceptance Scenario 1 (Approve) | `tests/business/fr018-verify-agency.test.ts` | Verifies Approved status & login eligibility |
| **AS-2** | Acceptance Scenario 2 (More Info) | `tests/business/fr018-verify-agency.test.ts` | Verifies Pending Approval stays & token created |
| **AS-3** | Acceptance Scenario 3 (Reject) | `tests/business/fr018-verify-agency.test.ts` | Verifies Rejected status & comment recorded |
