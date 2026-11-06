# API Contract: US-6 Verify Agency

## GET `/api/admin/agency-reviews?agencyId=<id>`

Fetches review details for screen VER119 and VER146.

### Response 200 OK
```json
{
  "agency_id": "uuid",
  "user_id": "uuid",
  "registration_request_id": "uuid",
  "version_no": 1,
  "role": "Tour_Agency",
  "status": "Pending Approval",
  "organization": "Agency Company Name",
  "created_date": "2026-10-28T10:00:00Z",
  "last_login": null,
  "submitted_profile": {
    "full_name": "Full Name",
    "company_name": "Company Name",
    "company_type": "Tour Operator",
    "tax_id": "0101234567",
    "location": { "street": "...", "ward": "...", "district": "...", "city_province": "..." },
    "contact_information": { "contact_person_name": "...", "phone_number": "..." },
    "team_size": 10,
    "tour_types": ["Cultural/Heritage"]
  },
  "documents": [
    { "document_type": "Business Registration Certificate", "file_name": "license.pdf" }
  ],
  "review_history": []
}
```

---

## POST `/api/admin/agency-reviews`

Submits an HDT review decision (FR-018).

### Request
```json
{
  "agency_id": "uuid",
  "review_type": "Initial Registration",
  "decision": "Approve",
  "review_comment": "All documents verified"
}
```

### Response 200 OK
```json
{
  "decision_record": {
    "decision": "Approve",
    "hdt_user_id": "uuid",
    "decided_at": "2026-10-28T16:00:00Z"
  },
  "account_status": "Approved",
  "major_change_review_status": "Not Applicable",
  "review_history_entry": {
    "decision": "Approve",
    "comments": "All documents verified",
    "decided_at": "2026-10-28T16:00:00Z"
  },
  "notification_status": {
    "in_app": "Success",
    "email": "Success"
  }
}
```

### Response 400 Bad Request
Missing required comment when decision is `Request More Information` or `Reject`, or invalid decision value.
