# Data Model: US-9 Manage Accounts

## Entities and Tables Used

### `user_accounts`
- `user_id`: uuid PRIMARY KEY
- `email`: varchar(254)
- `account_status`: varchar(24) ('Active', 'Disabled', 'Pending Approval', 'Approved', 'Rejected')
- `role_code`: varchar(32) ('ADMIN', 'Tour_Agency', 'Local_Provider')
- `admin_type`: varchar(8) ('HDT', 'UBND')
- `full_name`: varchar(100)
- `must_change_password`: boolean
- `password_hash`: text
- `last_login`: timestamptz
- `created_at`: timestamptz
- `updated_at`: timestamptz

### `account_status_history`
- `history_id`: uuid PRIMARY KEY
- `user_id`: uuid REFERENCES user_accounts(user_id)
- `from_status`: varchar(24)
- `to_status`: varchar(24)
- `changed_by`: uuid REFERENCES user_accounts(user_id)
- `changed_at`: timestamptz
- `reason`: text

### `sessions`
- `session_id`: uuid PRIMARY KEY
- `user_id`: uuid REFERENCES user_accounts(user_id)
- `revoked_at`: timestamptz (set to `now()` when account is disabled)

### `provider_profiles`
- `provider_id`: uuid PRIMARY KEY
- `user_id`: uuid REFERENCES user_accounts(user_id)
- `village_id`: uuid REFERENCES villages(village_id)

### `ubnd_village_assignments`
- `ubnd_user_id`: uuid PRIMARY KEY REFERENCES user_accounts(user_id)
- `village_id`: uuid REFERENCES villages(village_id)

### `audit_logs`
- `audit_id`: uuid PRIMARY KEY
- `actor_user_id`: uuid
- `action`: varchar(80) (`ACCOUNT_STATUS_CHANGED`, `PASSWORD_RESET_ADMIN`)
- `target_type`: varchar(80) (`UserAccount`)
- `target_id`: uuid
- `change_or_result`: jsonb
- `occurred_at`: timestamptz
