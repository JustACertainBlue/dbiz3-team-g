# Data Model: US-6 Verify Agency

## Entities Used

### `agency_review_records`
Defined in `data/schema.sql`:

| Column | Type | Constraints | Description |
|---|---|---|---|
| `review_id` | UUID | PRIMARY KEY, gen_random_uuid() | Unique review ID |
| `registration_request_id` | UUID | REFERENCES registration_submission_versions | Target request |
| `registration_version_no` | INTEGER | REFERENCES registration_submission_versions | Target version |
| `major_change_id` | UUID | NULL for initial registration | Major change request |
| `hdt_user_id` | UUID | REFERENCES user_accounts(user_id) | HDT Admin reviewer |
| `decision` | VARCHAR(32) | CHECK ('Approve', 'Request More Information', 'Reject') | Decision |
| `comments` | TEXT | Required if decision != 'Approve' | Review comments |
| `decided_at` | TIMESTAMPTZ | NOT NULL | Decision timestamp |

### `registration_resubmission_tokens`
Defined in `data/schema.sql`:

| Column | Type | Constraints | Description |
|---|---|---|---|
| `token_id` | UUID | PRIMARY KEY, gen_random_uuid() | Unique token ID |
| `registration_request_id` | UUID | REFERENCES agency_registration_requests | Target request |
| `token_verifier` | TEXT | UNIQUE | Opaque secret token string |
| `issued_at` | TIMESTAMPTZ | NOT NULL | Issued time |
| `expires_at` | TIMESTAMPTZ | NOT NULL, issued_at + interval '24 hours' | 24-hour expiration |
| `used_at` | TIMESTAMPTZ | NULL | Marked when used |
| `invalidated_at` | TIMESTAMPTZ | NULL | Marked when invalidated |

### `user_accounts` & `agency_registration_requests`
Updated to reflect the decision:
- `Approve`: `user_accounts.account_status = 'Approved'`, `agency_registration_requests.current_status = 'Approved'`
- `Request More Information`: `user_accounts.account_status = 'Pending Approval'`, `agency_registration_requests.current_status = 'Request More Information'`
- `Reject`: `user_accounts.account_status = 'Rejected'`, `agency_registration_requests.current_status = 'Rejected'`
