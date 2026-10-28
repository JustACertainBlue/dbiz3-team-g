# API Contracts: US-7 Create UBND Account

## POST /api/admin/accounts/ubnd

**Auth**: Session token in Cookie header; role=ADMIN, admin_type=HDT required (FR-019, FR-016)

### Request

```json
{
  "name": "Nguyen Van A",
  "email": "ubnd@village.vn",
  "phone": "0912345678",
  "assigned_village_id": "uuid-of-village"
}
```

**Validation** (FR-019):
- `name`: String, required
- `email`: Email format, required, must be unique in user_accounts
- `phone`: 10-15 digits with optional leading +, required
- `assigned_village_id`: UUID, required; village must exist and be active; must not already have a UBND assignment

### Response 201 — Success

```json
{
  "user_id": "uuid",
  "account_status": "Active",
  "must_change_password": true,
  "credential_email_status": "Success",
  "village_assignment": {
    "ubnd_user_id": "uuid",
    "village_id": "uuid"
  },
  "success_notification": "UBND account created and credentials sent."
}
```

### Response 400 — Validation error

```json
{
  "error_message": "...",
  "field_errors": [{ "field": "email", "message": "Email already exists" }]
}
```

### Response 403 — Forbidden (not HDT)

```json
{ "error_message": "Forbidden: only HDT admins can create UBND accounts" }
```

### Response 409 — Village already assigned

```json
{ "error_message": "Village already has an assigned UBND account" }
```
