# Data Model: US-10 Revise and Resubmit Agency Registration

## Entities Used

### `registration_resubmission_tokens`
- Validated: `token_verifier = $1 AND used_at IS NULL AND invalidated_at IS NULL AND expires_at > now()`
- Marked on use: `used_at = now()`
- Older tokens for same request: `invalidated_at = now()`

### `registration_submission_versions`
- New row inserted for `version_no = current_version_no + 1`.
- Contains revised `company_name`, `company_type`, `tax_id`, `location`, `contact_information`, `team_size`, `tour_types`.

### `agency_registration_requests`
- Updated: `current_version_no = current_version_no + 1`, `current_status = 'Pending Approval'`, `updated_at = now()`.

### `agency_profiles`
- Updated with revised submission data.
