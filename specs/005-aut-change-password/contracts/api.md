# API Contract: US-5 Change Password

## POST `/api/auth/change-password`

Implements F-AUTH-14 / FR-014.

### Request
- **Headers**:
  - `Cookie: session_token=<token>` OR `Authorization: Bearer <token>`
  - `Content-Type: application/json`
- **Body**:
  ```json
  {
    "current_password": "CurrentPassword123!",
    "new_password": "NewSecurePassword456!",
    "confirm_new_password": "NewSecurePassword456!"
  }
  ```

### Responses

#### 200 OK
Password successfully updated.

```json
{
  "success_message": "Password changed successfully",
  "password_updated_at": "2026-10-28T16:20:00Z",
  "audit_log_id": "uuid-of-audit-log-entry",
  "redirect_url": "/explore"
}
```

#### 400 Bad Request
Validation failure or incorrect current password.

```json
{
  "error_message": "Current password incorrect"
}
```
or
```json
{
  "error_message": "New password does not meet requirements"
}
```
or
```json
{
  "error_message": "Passwords do not match"
}
```

#### 401 Unauthorized
If session token is missing, expired, or invalid.
