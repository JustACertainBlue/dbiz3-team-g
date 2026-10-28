# Quickstart: US-2 Log In

## Prerequisites
- Node.js ≥ 22.0.0
- PostgreSQL with `DATABASE_URL` configured in `.env`
- Dependencies installed: `npm install`

---

## Run US-2 on localhost

### Screen URLs
- **Login screen (AUT009)**: `http://localhost:3000/login`
- **Tour Agency Landing (EXP017 Placeholder)**: `http://localhost:3000/explore`
- **Admin Landing (ADM079 Placeholder)**: `http://localhost:3000/admin/dashboard`
- **Local Provider Landing (DSH018 Placeholder)**: `http://localhost:3000/provider/dashboard`

### Testing & Demo Accounts
> **Note**: Seed password hashes in `data/seed/user_accounts.csv` are synthetic placeholders (`$2b$12$seedhash...`). For local demonstration or tests, accounts with known passwords must be inserted or updated with real bcrypt hashes, or set via the recovery flow once US-4 is implemented. No passwords are stored in repository files.

**Representative seed accounts for verification**:
- **Tour Agency (Approved)**: `thanhvien11@example.invalid` -> routes to `/explore` (EXP017)
- **Tour Agency (Disabled)**: `thanhvien18@example.invalid` -> rejected with `"Account disabled"`
- **ADMIN HDT (Active)**: `thanhvien10@example.invalid` -> routes to `/admin/dashboard` (ADM079)
- **ADMIN UBND (Active)**: `thanhvien2@example.invalid` -> routes to `/admin/dashboard` (ADM079)
- **Local Provider (Active)**: `thanhvien23@example.invalid` -> routes to `/provider/dashboard` (DSH018)
- **Local Provider (Disabled)**: `thanhvien26@example.invalid` -> rejected with `"Account disabled"`

### Acceptance Scenarios Verification
1. **Valid Credentials & Eligible Status**:
   - Log in with an Approved Tour Agency -> redirects to `/explore` (EXP017).
   - Log in with an Active HDT Admin -> redirects to `/admin/dashboard` (ADM079).
   - Log in with an Active Local Provider -> redirects to `/provider/dashboard` (DSH018).
2. **Pending Approval / Rejected Agency**:
   - Attempting login displays: `"Account not approved"`.
3. **Disabled Account**:
   - Attempting login displays: `"Account disabled"`.
4. **Invalid Credentials / Empty Fields**:
   - Missing fields display validation messages.
   - Wrong password displays `"Invalid credentials"`.

### Run Automated Tests
```bash
npm test
```
