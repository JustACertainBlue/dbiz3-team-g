# API Contracts: US-9 Manage Accounts

## GET /api/admin/accounts

Lists accounts permitted within the authenticated admin's scope with optional filtering and pagination.

### Headers

- `Cookie`: `session_token=<token>` (Required)

### Query Parameters

| Param | Type | Description |
|---|---|---|
| `organization_id` | string | Optional filter |
| `role` | string | Optional filter (e.g. `Tour_Agency`, `Local_Provider`, `ADMIN`) |
| `status` | string | Optional filter (`Active`, `Disabled`, `Approved`, `Pending Approval`, `Rejected`) |
| `date_from` | string | Optional ISO date filter |
| `date_to` | string | Optional ISO date filter |
| `page` | number | Optional page number (default 1) |
| `page_size` | number | Optional page size (default 50) |

### Response 200 OK

```json
{
  "users": [
    {
      "user_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
      "email": "provider@battrang.vn",
      "name": "Bat Trang Pottery Workshop",
      "organization": "Bat Trang Pottery Workshop",
      "role": "Local_Provider",
      "status": "Active",
      "last_login": null,
      "created_date": "2026-10-29T00:00:00.000Z",
      "available_actions": ["Disable", "Reset Password"]
    }
  ],
  "total_count": 1
}
```

---

## POST /api/admin/accounts/[userId]/action

Performs an administrative access action (`disable`, `enable`, `reset_password`) on a target user account within scope.

### Headers

- `Content-Type`: `application/json` (Required)
- `Cookie`: `session_token=<token>` (Required)

### Request Body

```json
{
  "action_type": "disable",
  "reason": "Administrative suspension"
}
```

### Responses

#### 200 OK

```json
{
  "account_status": "Disabled",
  "sessions_invalidated": true,
  "temporary_password_email_status": "Success",
  "user_notification_status": "Success",
  "audit_log_id": "3c2e1f4a-5b6c-7d8e-9f0a-1b2c3d4e5f6a"
}
```

#### 403 Forbidden

```json
{
  "error_message": "Forbidden: target account is outside assigned village scope"
}
```

#### 404 Not Found

```json
{
  "error_message": "User not found"
}
```
