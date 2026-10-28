# Research & Technical Decisions: US-2 Log In

## Decisions & Rationale

### 1. Password Verification & Hashing
- **Decision**: Use existing `src/lib/password.ts` which uses `bcryptjs` (cost factor 12) for verifying password hashes against `user_accounts.password_hash`.
- **Rationale**: Keeps implementation consistent with US-1 registration without adding any new dependencies.

### 2. Session Management & Opaque Session Token (F-AUTH-07, F-AUTH-17)
- **Decision**: Generate cryptographically random opaque session tokens (UUID or 32-byte hex). Store in PostgreSQL `sessions` table (`session_id = gen_random_uuid()`, `user_id`, `role_context`, `token_hash = sha256(token)`, `expires_at = now() + interval '24 hours'`, `created_at = now()`).
- **Rationale**: Direct compliance with schema.sql `sessions` table and FR-007 / FR-017 contracts.

### 3. Status Checking Rules (BR-003, BR-004)
- **Decision**:
  - `Tour_Agency`: must have `account_status = 'Approved'`. If `'Pending Approval'` or `'Rejected'`, return 403 with `error_message: "Account not approved"`. If `'Disabled'`, return 403 with `error_message: "Account disabled"`.
  - `ADMIN` and `Local_Provider`: must have `account_status = 'Active'`. If `'Disabled'`, return 403 with `error_message: "Account disabled"`.
  - Unknown email or wrong password: return 401 with `error_message: "Invalid credentials"`.
- **Rationale**: Exact requirement from FR-007, BR-003, BR-004.

### 4. RBAC Permission Loading (F-AUTH-15 / FR-015)
- **Decision**: Query `role_permissions` joined with `permissions` on `role_code` (and `admin_type` if `role_code = 'ADMIN'`). Construct `permission_set: string[]`.
- **Rationale**: Directly reflects the database schema tables `roles`, `permissions`, and `role_permissions`.

### 5. Role Landing Routing (F-AUTH-08 / FR-008)
- **Decision**:
  - `Tour_Agency` -> `landing_screen_id: 'EXP017'`, `redirect_url: '/explore'`
  - `ADMIN` (HDT or UBND) -> `landing_screen_id: 'ADM079'`, `redirect_url: '/admin/dashboard'`
  - `Local_Provider` -> `landing_screen_id: 'DSH018'`, `redirect_url: '/provider/dashboard'`
  - If `must_change_password = true` per FR-008: returns `landing_screen_id: 'ACC129'`. Note that ACC129 Change Password screen is only built when US-5 is in the run per Anti-Invention Rule 3.
- **Rationale**: Follows screen contracts and anti-invention rules.

### 6. Interpretations
- **Session Duration**: The spec states sessions are invalidated on logout or disable, and revalidated periodically. Default session expiry is set to 24 hours. Status: "Proposed, not yet in spec".

---

## Traceability Check

| Route / File / Exported Symbol | Type | Scope Table ID | Function / Requirement Description |
|---|---|---|---|
| `src/lib/auth.ts`: `authenticate` | Exported function | `F-AUTH-06`, `F-AUTH-07`, `F-AUTH-08`, `F-AUTH-15`, `BR-003`, `BR-004` | Credential validation, status checking, session creation, permission loading, landing resolution |
| `src/lib/auth.ts`: `verifySession` | Exported function | `F-AUTH-17`, `BR-011`, `BR-012` | Revalidates active session, account status and role consistency |
| `src/app/api/auth/login/route.ts`: `POST` | Route handler | `FR-006`, `FR-007`, `FR-008` | HTTP API for user login |
| `src/app/api/auth/session/route.ts`: `GET` | Route handler | `FR-017` | HTTP API for session verification |
| `src/app/login/page.tsx`: `LoginPage` | Page component | `AUT009`, `FR-005` | UI screen for login |
| `src/app/admin/dashboard/page.tsx`: `AdminDashboardPage` | Page component (Placeholder) | `ADM079` | Minimal placeholder for Admin Dashboard landing |
| `src/app/explore/page.tsx`: `ExplorePage` | Page component (Placeholder) | `EXP017` | Minimal placeholder for Tour Agency Explore landing |
| `src/app/provider/dashboard/page.tsx`: `ProviderDashboardPage` | Page component (Placeholder) | `DSH018` | Minimal placeholder for Local Provider Dashboard landing |
