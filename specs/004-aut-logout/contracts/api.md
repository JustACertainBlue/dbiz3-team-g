# API Contract: US-3 Log Out

## POST `/api/auth/logout`

Implements F-AUTH-09 / FR-009.

### Request
- **Headers**:
  - `Cookie: session_token=<token>` (optional if header present)
  - `Authorization: Bearer <token>` (optional if cookie present)
- **Body**: (empty JSON object or empty body)

### Responses

#### 200 OK
Session terminated successfully.

```json
{
  "session_terminated": true,
  "confirmation_message": "Logged out successfully",
  "redirect_url": "/login"
}
```

**Headers**:
- `Set-Cookie: session_token=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`

#### 401 Unauthorized / 400 Bad Request
If no session token is provided.

```json
{
  "error": "No active session found"
}
```
