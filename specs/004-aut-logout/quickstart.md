# Quickstart: US-3 Log Out

## Run US-3 on localhost

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
   (Agent never starts this command; started by human).

### Screens & URLs
- **AUT026 Logout Confirmation**: `http://localhost:3000/logout`
- **AUT009 Login**: `http://localhost:3000/login`

### Demo Steps
1. Log in via `http://localhost:3000/login` using any active account (e.g. recover password for a seed account via `/forgot-password` flow first).
2. Navigate to `http://localhost:3000/logout`.
3. The page displays the "Logout Confirmation" dialog with:
   - "Confirm logout" button
   - "Cancel" button
4. Click "Cancel": User remains on screen or returns to previous page without terminating session.
5. Click "Confirm logout": Session is invalidated in the database (`revoked_at` populated), session cookie is cleared, and user is redirected to `/login` (AUT009).
6. Attempting to use the old session token returns an invalid session result.
