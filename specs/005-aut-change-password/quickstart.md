# Quickstart: US-5 Change Password

## Run US-5 on localhost

### Prerequisites
1. PostgreSQL running and seeded:
   ```bash
   python data/scripts/generate_seed.py
   python data/scripts/validate_seed.py
   ```
2. Development server running:
   ```bash
   npm run dev
   ```
   (Started by the human).

### Screens & URLs
- **Change Password Panel (ACC129)**: `http://localhost:3000/account`
- **Login (AUT009)**: `http://localhost:3000/login`

### Demo Steps
1. Log in via `http://localhost:3000/login` with any active account (use `/forgot-password` flow to set a known password if using a synthetic seed account).
2. Navigate to `http://localhost:3000/account`.
3. Fill in:
   - Current password
   - New password (e.g. `NewSecret123!`)
   - Confirm new password
4. Click "Change Password".
5. Observe the success confirmation and redirect to the permitted role landing screen (e.g., `/explore` for Tour Agency, `/admin/dashboard` for HDT/UBND, `/provider/dashboard` for Local Provider).
6. Next login requires the new password; old password is no longer accepted.
