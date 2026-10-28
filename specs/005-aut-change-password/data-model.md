# Data Model: US-5 Change Password

## Tables Used

### `user_accounts`
Defined in `data/schema.sql`:

| Column | Type | Modified | Description |
|---|---|---|---|
| `password_hash` | VARCHAR(255) | Updated | New bcrypt hash of updated password |
| `must_change_password` | BOOLEAN | Set to `false` | Cleared upon successful password change |
| `updated_at` | TIMESTAMP WITH TIME ZONE | Set to `now()` | Update timestamp |

### `audit_logs`
Defined in `data/schema.sql`:

| Column | Type | Value | Description |
|---|---|---|---|
| `log_id` | UUID | `gen_random_uuid()` | Unique log ID |
| `actor_user_id` | UUID | `user_id` | User performing password change |
| `action` | VARCHAR(50) | `'PASSWORD_CHANGED'` | Security action identifier |
| `target_type` | VARCHAR(50) | `'UserAccount'` | Target entity type |
| `target_id` | VARCHAR(255) | `user_id` | Target entity ID |
| `details` | JSONB | `'{"action": "change_password", "source": "ACC129"}'` | Structured action details |
| `created_at` | TIMESTAMP WITH TIME ZONE | `now()` | Log creation timestamp |
