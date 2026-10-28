# Research: US-9 Manage Accounts

## Decisions and Interpretations

### Interpretation 1: UBND data scope for F-AUTH-21 and F-AUTH-22 (BR-009, AS-1, AS-3)
**Decision**:
- For listing (`F-AUTH-21`): When actor is `ADMIN/UBND`, lookup assigned `village_id` from `ubnd_village_assignments`. Restrict query to `user_accounts` where `role_code = 'Local_Provider'` AND `user_id IN (SELECT user_id FROM provider_profiles WHERE village_id = assigned_village_id)`.
- For actions (`F-AUTH-22`): When actor is `ADMIN/UBND`, verify that target user has role `Local_Provider` and their provider profile belongs to the actor's assigned village. If not, reject with `403 Forbidden` ("Forbidden: target account is outside assigned village scope").
- When actor is `ADMIN/HDT`: Platform-wide scope; can view and perform management actions on any account.
**Rationale**: FR-021 explicitly states: "(1) HDT: Views ALL user accounts... (2) UBND: Views ONLY Local Provider accounts within assigned village. Cannot view Agency accounts, other UBND accounts, or Local Providers from other villages." FR-022 and BR-009 restrict UBND actions to their assigned village.

### Interpretation 2: Session revocation on Disable (BR-013, AS-2)
**Decision**: When `action_type === 'disable'`, execute `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL` immediately within the same transaction/operation.
**Rationale**: Spec states "Disabling an account immediately sets the account to Disabled and invalidates all active sessions rather than waiting for the next periodic validation" (FR-017, FR-022, BR-013, AS-2).

### Interpretation 3: Status restoration on Enable (FR-022)
**Decision**: When `action_type === 'enable'`, lookup the latest `from_status` in `account_status_history` where `user_id = $targetUserId` and `to_status = 'Disabled'`. If found, restore that status. If no prior status is recorded, default to `'Active'` (or `'Approved'` if Tour Agency).
**Rationale**: FR-022 states: "Enable restores the account status that was effective immediately before Disable; it does not automatically approve an account that had not previously been approved."

### Interpretation 4: Profile content immutability (BR-010, AS-4)
**Decision**: No SQL query in account management touches profile fields (description, images, pricing, booking conditions). Only account status, sessions, and credential resets are updated.
**Rationale**: BR-010 / AS-4 mandate that neither HDT nor UBND can modify business/profile content.

---

## References

- `docs/spec/specs/spec-AUT.md`: §3 US-9, §5 FR-016, FR-021, FR-022, §5.1 I/O contracts, §5.2 BR-009, BR-010, BR-011, BR-013
- `docs/spec/screens/screen-spec-ADM095.md`
- `docs/spec/screens/screen-spec-ADM118.md`
- `data/schema.sql`: `user_accounts`, `account_status_history`, `sessions`, `provider_profiles`, `agency_profiles`, `audit_logs`

---

## Traceability Table

| Artifact | Scope ID |
|---|---|
| `src/lib/account-management.ts` → `listAccounts()` | F-AUTH-21, FR-021, BR-009, BR-011 |
| `src/lib/account-management.ts` → `applyAccountAction()` | F-AUTH-22, FR-022, BR-009, BR-010, BR-013 |
| `src/lib/account-management.ts` → `getAccountDetails()` | F-AUTH-21, F-AUTH-22, ADM118 |
| `src/app/api/admin/accounts/route.ts` → GET handler | F-AUTH-21, FR-021, FR-016 |
| `src/app/api/admin/accounts/[userId]/action/route.ts` → POST handler | F-AUTH-22, FR-022, FR-016 |
| `src/app/admin/users/page.tsx` → ADM095 screen | ADM095 |
| `src/app/admin/users/[userId]/actions/page.tsx` → ADM118 screen | ADM118 |
| `src/app/admin/view-account/page.tsx` → ADM145 placeholder | ADM145 (Anti-invention rule 4) |
| Audit log INSERT `ACCOUNT_STATUS_CHANGED` / `PASSWORD_RESET_ADMIN` | SC-008 |
