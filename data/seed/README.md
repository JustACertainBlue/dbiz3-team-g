# Synthetic seed-data plan

Seed records must be fictional. Do not include real people's names, contact details, legal certificates or real operating businesses. The current `DEMO-HN-*` Village rows are explicit test fixtures. Production Village IDs/names must come from the approved source requested by Q-11 in [`model/05-review.md`](../model/05-review.md).

## Required scenarios

| Scenario | Minimum synthetic rows | Source / expected assertion |
|---|---|---|
| Ordinary | At least 5 linked Agency–Provider–Experience records, with valid users and village references | F-AUTH-04/20, F-PROFILE-06, F-EXPLORE-01 |
| Registration boundary | One OTP at 10-minute expiry boundary, one failed fifth attempt, one third resend; one Request More Information with versioned resubmission | F-AUTH-23/26; exact token rules Q-01/Q-02 |
| Empty state | One seeded Village with zero Providers; one Provider with zero Experiences; one Agency with zero Bookings | F-PROFILE-03, F-EXPLORE-01, F-SCHED-02 |
| Exceptional state | Rejected registration, Revision Required Provider, expired/cancelled On hold Booking, Closed Chat | F-AUTH-18, F-PROFILE-05, F-SCHED-05/08, F-CHAT-04 |
| Booking conflict | Two attempted overlapping On hold/Booked slots for one Provider; only the first accepted | F-SCHED-03/04/09 |
| Permissions | HDT platform view, UBND assigned-village view, unrelated Agency/Provider denied private Booking/Chat | F-AUTH-16, F-ADMIN-02, F-SCHED-07, F-CHAT-03 |
| KPI period | Booking created inside/outside selected period, state changed later, and prior-period comparison | F-ADMIN-03/04/09/10 and consistency contract §Dashboard |

## Executable package after model approval

Run from the repository root:

```powershell
python data/scripts/generate_seed.py
```

The generator recreates `data/seed/generated/` using deterministic synthetic UUIDs. It writes a scenario manifest and asserts foreign-key integrity, unique email/business keys, unique Agency–Experience Quote Requests, one Active Agency–Provider Chat, Experience ownership, exact 72-hour holds, no overlapping active Bookings, all Booking statuses, and required empty-state rows.

All people, organizations, contact details and village entries carry demo identities and use reserved `example.invalid` email addresses. The Village rows are test fixtures with `DEMO-HN-*` source codes; they must be replaced by the approved authoritative catalog before production use (Q-11).
