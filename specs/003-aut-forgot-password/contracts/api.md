# API Contracts: US-4 Forgot Password

## 1. POST `/api/auth/forgot-password` (F-AUTH-11 / FR-011)

Requests a 15-minute secure password reset link.

### Request
- **Method**: `POST`
- **Content-Type**: `application/json`

```json
{
  "email": "user@example.com"
}
```

### Response
#### 200 OK (Always returned for known/unknown emails)
```json
{
  "result_message": "If an account exists for this email, a password reset link has been sent.",
  "email_delivery_status": "Success"
}
```

#### 400 Bad Request
When email format is invalid or missing:
```json
{
  "error_message": "A valid email address is required"
}
```

#### 429 Too Many Requests
When rate limit exceeded (more than 3 per email or 5 per IP per 15 minutes):
```json
{
  "error_message": "Rate limit exceeded. Please wait 15 minutes before trying again."
}
```

---

## 2. POST `/api/auth/reset-password` (F-AUTH-12 / FR-012)

Submits a new password using the unexpired, unused recovery token.

### Request
- **Method**: `POST`
- **Content-Type**: `application/json`

```json
{
  "token": "4f1d48d695f76e46a781b2c4c7a8b6e2",
  "new_password": "NewValidPassword123!",
  "confirm_password": "NewValidPassword123!"
}
```

### Response
#### 200 OK (Password Reset Success)
```json
{
  "success_message": "Password updated successfully",
  "redirect_url": "/reset-password/success"
}
```

#### 400 Bad Request
When password complexity fails or passwords do not match:
```json
{
  "error_message": "Password does not meet requirements"
}
```
or
```json
{
  "error_message": "Passwords do not match"
}
```

#### 404 / 410 Gone / 400 Bad Request
When token is invalid, expired, or already used:
```json
{
  "error_message": "Token invalid"
}
```
or
```json
{
  "error_message": "Token expired"
}
```
