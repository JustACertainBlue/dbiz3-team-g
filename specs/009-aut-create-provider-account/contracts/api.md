# API Contract: US-8 Create Local Provider Account

## POST /api/admin/accounts/provider

Creates a new Local Provider account and an initial draft Provider Profile within the authenticated UBND's assigned village.

### Headers

| Header | Value | Description |
|---|---|---|
| `Content-Type` | `application/json` | Required |
| `Cookie` | `session_token=<token>` | Required session cookie |

### Request Body

```json
{
  "provider_name": "Bat Trang Pottery Workshop",
  "address": "123 Bat Trang Village, Gia Lam, Hanoi",
  "contact": {
    "contact_person_name": "Nguyen Van A",
    "phone_number": "+84912345678"
  },
  "email": "provider@battrang.vn",
  "requested_village_id": "optional-uuid"
}
```

### Validation Rules

- `provider_name`: string, required, non-empty.
- `address`: string, required, non-empty.
- `contact`: object, required.
  - `contact.contact_person_name`: string, required, non-empty.
  - `contact.phone_number`: string, required, 10–15 digits with optional leading `+`.
- `email`: string, required, valid email format, max 254 chars, unique in `user_accounts`.
- `requested_village_id`: optional. If provided and does not equal the actor's assigned village, return `403 Forbidden`.

### Responses

#### 201 Created

```json
{
  "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "account_status": "Active",
  "must_change_password": true,
  "credential_email_status": "Success",
  "success_notification": "Local Provider account created and credentials sent.",
  "provider_profile_id": "3c2e1f4a-5b6c-7d8e-9f0a-1b2c3d4e5f6a",
  "profile_verification_status": "Draft"
}
```

#### 400 Bad Request

```json
{
  "error_message": "Email already exists",
  "field_errors": [
    {
      "field": "email",
      "message": "Email already exists"
    }
  ]
}
```

#### 401 Unauthorized

```json
{
  "error_message": "Unauthorized"
}
```

#### 403 Forbidden

```json
{
  "error_message": "Forbidden: only UBND admins can create Local Provider accounts"
}
```
or
```json
{
  "error_message": "Forbidden: Provider belongs to another village"
}
```
