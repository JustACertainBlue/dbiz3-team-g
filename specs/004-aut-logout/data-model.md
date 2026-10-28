# Data Model: US-3 Log Out

## Entities Used

### `sessions`
Existing table defined in `data/schema.sql`:

| Column | Type | Constraints | Description |
|---|---|---|---|
| `session_id` | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | Unique session identifier |
| `user_id` | UUID | NOT NULL, REFERENCES user_accounts(user_id) | Owning user account |
| `role_context` | VARCHAR(50) | NOT NULL | User role context at login |
| `token_hash` | VARCHAR(255) | NOT NULL UNIQUE | SHA-256 hash of opaque token |
| `expires_at` | TIMESTAMP WITH TIME ZONE | NOT NULL | Session expiration timestamp |
| `revoked_at` | TIMESTAMP WITH TIME ZONE | NULL | Timestamp when session was revoked / logged out |
| `created_at` | TIMESTAMP WITH TIME ZONE | NOT NULL DEFAULT CURRENT_TIMESTAMP | Creation timestamp |

### State Transitions on Logout (F-AUTH-09 / FR-009)
- Before logout: `revoked_at IS NULL` and `expires_at > CURRENT_TIMESTAMP` (Active).
- After logout: `revoked_at = CURRENT_TIMESTAMP` (Terminated).
