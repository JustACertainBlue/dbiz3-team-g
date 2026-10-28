# Research & Design Decisions: US-3 Log Out

## Decisions & Alternatives

### 1. Session Invalidation Mechanism (F-AUTH-09 / FR-009)
- **Decision**: Update `sessions` table by setting `revoked_at = CURRENT_TIMESTAMP` for the row matching `token_hash = sha256(session_token)`.
- **Alternative considered**: Deleting the session row.
- **Why chosen**: The `sessions` schema in `data/schema.sql` explicitly provides `revoked_at TIMESTAMP WITH TIME ZONE`. Preserving the revoked row provides auditability and distinct detection of revoked vs nonexistent tokens.

### 2. Browser Session Clearance
- **Decision**: Set cookie `session_token` with `maxAge: 0`, `path: '/'`, `httpOnly: true`, `sameSite: 'lax'`, clearing it in the user's browser.
- **Why chosen**: Matches the cookie set during `POST /api/auth/login`.

### 3. Screen AUT026 Implementation
- **Decision**: Create `src/app/logout/page.tsx` rendering the dialog with heading "Logout Confirmation", "Confirm logout" button (which posts to `/api/auth/logout` and redirects to `/login`), and "Cancel" button (which uses `window.history.back()` or falls back to `/login`).
- **Why chosen**: Matches element inventory and navigation defined in `docs/spec/screens/screen-spec-AUT026.md`.

---

## Interpretations & Proposed Open Questions

### Interpretations
1. **Cancel navigation**: `screen-spec-AUT026.md` interactions table specifies `Cancel` user action results in `stay` or returning to previous screen. In Next.js client component, `router.back()` with fallback to `/login` if no history is the safest non-invasive behavior.

---

## Traceability Table

| Scope ID | Component / Route / Export | File | Notes |
|---|---|---|---|
| **F-AUTH-09** / **FR-009** | `logoutSession(sessionToken: string)` | `src/lib/auth.ts` | Sets `revoked_at = CURRENT_TIMESTAMP` |
| **F-AUTH-09** / **FR-009** | `POST /api/auth/logout` | `src/app/api/auth/logout/route.ts` | Invalidates session, clears cookie, returns redirect_url |
| **AUT026** | `LogoutPage` | `src/app/logout/page.tsx` | Logout Confirmation dialog |
| **AS-1** | Acceptance Scenario 1 | `tests/business/fr009-logout.test.ts` | Verifies active session termination and redirect |
| **AS-2** | Acceptance Scenario 2 | `tests/business/fr009-logout.test.ts` | Verifies terminated session reuse is denied |
| **BR-012** / **BR-013** | Business Rules | `tests/business/fr009-logout.test.ts` | Verifies `verifySession` flags revoked token |
