# Data Model: US-8 Create Local Provider Account

## Tables Used

### `user_accounts`
- `user_id`: uuid PRIMARY KEY
- `email`: varchar(254) UNIQUE
- `password_hash`: text (hashed temporary password)
- `role_code`: 'Local_Provider'
- `admin_type`: NULL
- `account_status`: 'Active'
- `full_name`: provider_name (or contact_person_name)
- `phone`: contact.phone_number
- `must_change_password`: true
- `created_at`: timestamptz
- `updated_at`: timestamptz

### `provider_profiles`
- `provider_id`: uuid PRIMARY KEY
- `user_id`: uuid REFERENCES user_accounts(user_id) UNIQUE
- `village_id`: uuid REFERENCES villages(village_id) (taken from actor's assigned village)
- `current_version_no`: 1
- `published_version_no`: NULL
- `verification_status`: 'Draft' (BR-015: separate from Active account status)
- `created_at`: timestamptz
- `updated_at`: timestamptz

### `provider_profile_versions`
- `provider_id`: uuid REFERENCES provider_profiles(provider_id)
- `version_no`: 1
- `version_status`: 'Draft'
- `business_name`: provider_name
- `location_address`: address
- `contact_information`: jsonb `{ contact_person_name, phone_number }`
- `submitted_at`: NULL
- `published_at`: NULL

### `ubnd_village_assignments`
- Looked up by `ubnd_user_id` to determine actor's assigned `village_id`.

### `audit_logs`
- Records `LOCAL_PROVIDER_ACCOUNT_CREATED` with actor, target user_id, provider_id, and details.
