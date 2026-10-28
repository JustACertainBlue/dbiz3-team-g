# API Contracts: US-2 Log In

## 1. POST `/api/auth/login` (F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-15)

Authenticates user credentials, validates account status, initializes RBAC permissions, creates an authenticated session, and returns role landing details.

### Request

- **Method**: `POST`
- **Content-Type**: `application/json`

```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

#### Field Validations (FR-006)
- `email`: Required, valid email format
- `password`: Required, non-empty

### Response

#### 200 OK (Success)
Returned when credentials are valid and account status is eligible (`Approved` for Agency, `Active` for ADMIN / Local Provider).

```json
{
  "session_token": "c7a8b6e2-4f1d-48d6-95f7-6e46a781b2c4",
  "role": "Tour_Agency",
  "admin_type": null,
  "permission_set": ["browse", "match", "booking"],
  "must_change_password": false,
  "landing_screen_id": "EXP017",
  "redirect_url": "/explore"
}
```

Sets `Set-Cookie: session_token=...; HttpOnly; Path=/; SameSite=Lax`.

#### 400 Bad Request
Returned when validation fails (empty fields per FR-006).

```json
{
  "error_message": "Email and password are required",
  "empty_field_errors": ["email", "password"]
}
```

#### 401 Unauthorized
Returned when email does not exist or password does not match.

```json
{
  "error_message": "Invalid credentials"
}
```

#### 403 Forbidden
Returned when credentials match, but account status is not eligible for login:
- For Tour_Agency with status `Pending Approval` or `Rejected`:
  ```json
  {
    "error_message": "Account not approved"
  }
  ```
- For any user with status `Disabled`:
  ```json
  {
    "error_message": "Account disabled"
  }
  ```

---

## 2. GET `/api/auth/session` (F-AUTH-17)

Verifies active session token, checks account status and role consistency, and returns session context or forces logout.

### Request
- **Method**: `GET`
- **Headers**:
  - `Cookie: session_token=<token>` or `Authorization: Bearer <token>`

### Response

#### 200 OK (Valid Session)
```json
{
  "validation_result": "Valid",
  "force_logout": false,
  "user_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "email": "agency@example.com",
  "role": "Tour_Agency",
  "admin_type": null,
  "permission_set": ["browse", "match", "booking"]
}
```

#### 401 / 403 (Invalid, Expired, Revoked, or Disabled Account)
```json
{
  "validation_result": "Account Disabled",
  "force_logout": true,
  "error_message": "Session invalid or account disabled"
}
```
