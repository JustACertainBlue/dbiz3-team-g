# Quickstart: US-4 Forgot Password

## Prerequisites
- Node.js ≥ 22.0.0
- PostgreSQL with `DATABASE_URL` configured in `.env`
- Dependencies installed: `npm install`

---

## Run US-4 on localhost

### Screen URLs
- **Forgot Password initiation (PAS011)**: `http://localhost:3000/forgot-password`
- **Email Sent Confirmation (PAS014)**: `http://localhost:3000/forgot-password/sent`
- **Set New Password (PAS142)**: `http://localhost:3000/reset-password?token=<token>`
- **Password Updated Success (PAS143)**: `http://localhost:3000/reset-password/success`
- **Login Screen (AUT009)**: `http://localhost:3000/login`

### Demo Steps with Seed Accounts
1. Open `http://localhost:3000/forgot-password`.
2. Enter a registered seed account email (e.g. `thanhvien11@example.invalid`).
3. Click "Send reset link". Screen navigates to PAS014.
4. Read the generated reset link and token from `var/outbox/`:
   ```powershell
   Get-ChildItem var\outbox -Filter "reset-*.txt" | Sort-Object LastWriteTime -Descending | Select-Object -First 1 | Get-Content
   ```
5. Open the link in the browser (PAS142: `/reset-password?token=<token>`).
6. Enter and confirm a new valid password (e.g. `NewSecurePass123!`).
7. Click "Reset password" -> navigates to PAS143.
8. Click "Sign in" -> navigates to `/login` (AUT009). Log in with the new password.

### Run Automated Tests
```bash
npm test
```
