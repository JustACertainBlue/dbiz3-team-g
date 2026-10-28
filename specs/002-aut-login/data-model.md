# Data Model Slice: US-2 Log In

This document details the database entities and relationships used for **US-2: Log In**. All definitions map directly to `data/schema.sql`.

---

## Entities in Scope

### 1. `user_accounts`
Stores member accounts and credentials.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `user_id` | uuid | PRIMARY KEY | User unique identifier |
| `email` | varchar(254) | NOT NULL, UNIQUE (lower(email)) | Login email |
| `password_hash` | text | NOT NULL | bcrypt hash of password |
| `role_code` | varchar(32) | NOT NULL, REFERENCES roles(role_code) | 'ADMIN', 'Tour_Agency', or 'Local_Provider' |
| `admin_type` | varchar(8) | NULL / 'HDT' / 'UBND' | Subtype if role_code = 'ADMIN' |
| `account_status` | varchar(24) | NOT NULL | Status ('Approved', 'Active', 'Pending Approval', 'Rejected', 'Disabled') |
| `full_name` | varchar(100) | NOT NULL | Full name of user |
| `must_change_password` | boolean | NOT NULL DEFAULT false | Password change requirement flag |
| `last_login` | timestamptz | NULL | Updated upon successful login |

### 2. `roles`, `permissions`, and `role_permissions`
Defines RBAC permission matrix for each role.

- `roles`: `role_code` ('ADMIN', 'Tour_Agency', 'Local_Provider'), `display_name`
- `permissions`: `permission_code`, `action`, `resource`
- `role_permissions`: `role_code`, `permission_code`, `admin_type`

### 3. `sessions`
Stores active authenticated sessions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `session_id` | uuid | PRIMARY KEY | Session ID |
| `user_id` | uuid | NOT NULL, REFERENCES user_accounts(user_id) | User holding session |
| `role_context` | varchar(32) | NOT NULL | Role code active in session |
| `token_hash` | text | NULL | Hash of opaque session token |
| `expires_at` | timestamptz | NOT NULL | Session expiry timestamp |
| `revoked_at` | timestamptz | NULL | Revocation timestamp if terminated/disabled |
| `created_at` | timestamptz | NOT NULL | Session creation timestamp |
