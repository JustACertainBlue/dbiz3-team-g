# API Contract: US-10 Revise and Resubmit Agency Registration

## GET `/api/register/resubmit?token=<token>`

Fetches existing registration request data for secure edit mode on REG003.

### Responses
#### 200 OK
```json
{
  "registration_request_id": "uuid",
  "version_no": 1,
  "email": "agency@test.com",
  "data": {
    "full_name": "Full Name",
    "company_name": "Company Name",
    "company_type": "Tour Operator",
    "tax_id": "0101234567",
    "location": { "street": "...", "ward": "...", "district": "...", "city_province": "..." },
    "contact_information": { "contact_person_name": "...", "phone_number": "..." },
    "team_size": 10,
    "tour_types": ["Cultural/Heritage"]
  }
}
```

#### 400 / 404 Bad Request
When token is invalid, expired, or already used.
```json
{
  "error": "Resubmission token is invalid or expired"
}
```

---

## POST `/api/register/resubmit`

Submits the revised registration data (FR-026).

### Request
```json
{
  "resubmission_token": "token-string",
  "registration_request_id": "uuid",
  "updated_registration_data": {
    "full_name": "Updated Name",
    "company_name": "Updated Company",
    "company_type": "Tour Operator",
    "tax_id": "0101234567",
    "location": { ... },
    "contact_information": { ... },
    "team_size": 12,
    "tour_types": ["Cultural/Heritage"]
  }
}
```

### Responses
#### 200 OK
```json
{
  "registration_request_id": "uuid",
  "submission_version": 2,
  "review_status": "Pending Approval",
  "success_message": "Registration resubmitted successfully",
  "notification_status": {
    "in_app": "Success",
    "email": "Success"
  }
}
```
