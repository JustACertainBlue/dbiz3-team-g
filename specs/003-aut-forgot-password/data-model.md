# Data Model Slice: US-4 Forgot Password

## Entities in Scope

### 1. `password_reset_tokens`
Stores secure time-limited single-use recovery tokens.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `token_id` | uuid | PRIMARY KEY | Unique token record ID |
| `user_id` | uuid | NOT NULL, REFERENCES user_accounts(user_id) | User who requested recovery |
| `token_verifier` | text | NOT NULL, UNIQUE | Secure token verifier |
| `issued_at` | timestamptz | NOT NULL | Token creation timestamp |
| `expires_at` | timestamptz | NOT NULL | Token expiration (`issued_at + 15 minutes`) |
| `used_at` | timestamptz | NULL | Consumption timestamp upon reset |

Schema constraints:
- `CONSTRAINT reset_token_expiry_chk CHECK (expires_at = issued_at + interval '15 minutes')`
- `CONSTRAINT reset_token_used_chk CHECK (used_at IS NULL OR used_at >= issued_at)`

### 2. `user_accounts` (Updated columns)
- `password_hash`: updated with bcrypt hash of new password
- `password_changed_at`: updated to `now()`
- `updated_at`: updated to `now()`
