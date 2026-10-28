# Research & Design Decisions: US-5 Change Password

## Decisions & Alternatives

### 1. Route Path for ACC129
- **Decision**: Screen ACC129 represents "My Account". In Next.js App Router, the page is mapped to `src/app/account/page.tsx` (`/account`), implementing the Change Password panel per Anti-invention rule 3.
- **Why chosen**: Intuitive and conforms to Next.js conventions while adhering to ACC129 screen spec.

### 2. Audit Trail Logging (F-AUTH-14 / FR-014)
- **Decision**: When the password is successfully updated, an entry is inserted into `audit_logs`:
  - `action`: `PASSWORD_CHANGED`
  - `actor_user_id`: user's `user_id`
  - `target_type`: `UserAccount`
  - `target_id`: user's `user_id`
  - `details`: JSON string `{ "action": "change_password", "source": "ACC129" }`
- **Why chosen**: Conforms to `data/schema.sql` `audit_logs` table constraints and satisfies FR-014 ("Logs change in audit trail for all user types").

### 3. Clearing `must_change_password` (FR-008)
- **Decision**: Setting new password updates `must_change_password = false` in `user_accounts`.
- **Why chosen**: Explicitly required by FR-008 / SR-003 so subsequent logins route directly to the user's role landing screen.

---

## Interpretations & Proposed Open Questions

### Interpretations
1. **Change Password Form Security Reminder**: Screen spec ACC129 and FR-013 mention `security_reminder_text`. We display: "Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols. Never share your password."

---

## Traceability Table

| Scope ID | Component / Route / Export | File | Notes |
|---|---|---|---|
| **F-AUTH-13** / **FR-013** | Change Password Panel on ACC129 | `src/app/account/page.tsx` | Change password UI with current, new, confirm inputs |
| **F-AUTH-14** / **FR-014** | `changePassword(...)` | `src/lib/password-change.ts` | Validates complexity, verifies current hash, writes audit row |
| **F-AUTH-14** / **FR-014** | `POST /api/auth/change-password` | `src/app/api/auth/change-password/route.ts` | Authenticated API endpoint |
| **FR-008** | Post-change landing redirect | `src/lib/password-change.ts` | Directs Admin -> ADM079, Agency -> EXP017, Provider -> DSH018 |
| **AS-1** | Acceptance Scenario 1 | `tests/business/fr014-change-password.test.ts` | Tests successful change and audit logging |
| **AS-2** | Acceptance Scenario 2 | `tests/business/fr014-change-password.test.ts` | Tests wrong current password rejection |
