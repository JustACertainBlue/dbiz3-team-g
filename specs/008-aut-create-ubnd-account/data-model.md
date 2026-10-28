# Data Model: US-7 Create UBND Account

## Tables Used (read from data/schema.sql — no changes to schema)

### user_accounts (INSERT)
| Column | Value |
|---|---|
| user_id | gen_random_uuid() |
| email | Input email (lowercased) |
| password_hash | bcrypt hash of auto-generated temp password |
| role_code | 'ADMIN' |
| admin_type | 'UBND' |
| account_status | 'Active' |
| full_name | Input name |
| phone | Input phone |
| must_change_password | true |
| created_at | now() |
| updated_at | now() |

### ubnd_village_assignments (INSERT)
| Column | Value |
|---|---|
| ubnd_user_id | new user_id |
| village_id | Input assigned_village_id |
| assigned_by | HDT actor user_id from session |
| assigned_at | now() |

### villages (SELECT)
- Verify village_id exists and is_active = true.

### audit_logs (INSERT)
| Column | Value |
|---|---|
| audit_id | gen_random_uuid() |
| actor_user_id | HDT user_id from session |
| action | 'UBND_ACCOUNT_CREATED' |
| target_type | 'UserAccount' |
| target_id | new UBND user_id |
| occurred_at | now() |
| change_or_result | { email, assigned_village_id, name } |

## Relationships
- user_accounts.role_code → roles.role_code ('ADMIN')
- ubnd_village_assignments.ubnd_user_id → user_accounts.user_id
- ubnd_village_assignments.village_id → villages.village_id
- ubnd_village_assignments.assigned_by → user_accounts.user_id (HDT actor)
