# Research: US-8 Create Local Provider Account

## Decisions and Interpretations

### Interpretation 1: Actor authorization (BR-007, BR-009)
**Decision**: Only an authenticated user with role `ADMIN` and `admin_type === 'UBND'` can invoke Local Provider creation. If actor is HDT or non-Admin, return 403 Forbidden.
**Rationale**: Spec states "UBND staff creates a new user account for a Local Provider within its assigned village" (FR-020, BR-007). HDT creates UBND accounts, but does NOT create Local Provider accounts.

### Interpretation 2: Village determination and cross-village denial (BR-009, AS-2)
**Decision**: `village_id` is automatically retrieved from the actor's assignment in `ubnd_village_assignments`. If the actor has no assigned village, account creation is rejected with 400. If the request body contains a `requested_village_id` or `village_id` that does NOT match the actor's assigned village, return 403 Forbidden ("Forbidden: Provider belongs to another village", fulfilling AS-2 / BR-009).
**Rationale**: FR-020 contract notes: `village_id (ID; Required — taken from the UBND assignment, not entered manually)`. AS-2 states: "Given the Provider belongs to another village, when the UBND attempts account creation, then the action is denied."

### Interpretation 3: Provider Profile & Version creation (BR-015, AS-1, AS-3)
**Decision**: In addition to creating the `user_accounts` row with `account_status = 'Active'`, the transaction creates:
1. `provider_profiles` row with `verification_status = 'Draft'`, `current_version_no = 1`, `published_version_no = NULL`, `village_id = assigned_village_id`.
2. `provider_profile_versions` row with `version_no = 1`, `version_status = 'Draft'`, `business_name = provider_name`, `location_address = address`, `contact_information = contact`.
**Rationale**: FR-020 output lists `provider_profile_id (ID; Required — an empty Provider Profile is created automatically)` and `profile_verification_status (Enum[Draft]; Required)`. BR-015 specifies that Active account status is separate from profile verification.

### Interpretation 4: Temporary password and credentials delivery
**Decision**: Re-use `generateTempPassword()` from `account-creation.ts` and outbox pattern to write `provider_credentials_<userId>_<timestamp>.json` into `var/outbox/`. Account is flagged with `must_change_password = true`.
**Rationale**: Matches FR-020 and consistency contract for temporary credentials.

---

## References

- `docs/spec/specs/spec-AUT.md`: §3 US-8, §5 FR-020, §5.1 FR-020 I/O table, §5.2 BR-007, BR-009, BR-015
- `docs/spec/screens/screen-spec-ADM117.md`: elements 8–13
- `data/schema.sql`: `user_accounts`, `provider_profiles`, `provider_profile_versions`, `ubnd_village_assignments`, `audit_logs`

---

## Traceability Table

| Artifact | Scope ID |
|---|---|
| `src/lib/account-creation.ts` → `createLocalProviderAccount()` | FR-020, BR-007, BR-009, BR-015 |
| `src/app/api/admin/accounts/provider/route.ts` → POST handler | FR-020, FR-016 |
| `src/app/admin/create-account/page.tsx` → ADM117 screen (UBND section) | ADM117 (F-AUTH-20) |
| Field: Provider name | FR-020 input `provider_name` / ADM117 elem 8 |
| Field: Address | FR-020 input `address` / ADM117 elem 9 |
| Field: Contact person name | FR-020 input `contact.contact_person_name` / ADM117 elem 10 |
| Field: Contact phone number | FR-020 input `contact.phone_number` / ADM117 elem 10 |
| Field: Email | FR-020 input `email` |
| Field: Village id (read-only) | FR-020 input `village_id` / ADM117 elem 11 |
| Button: Create | ADM117 elem 12 |
| Button: Cancel | ADM117 elem 13 |
| Audit log INSERT `LOCAL_PROVIDER_ACCOUNT_CREATED` | SC-008 |
