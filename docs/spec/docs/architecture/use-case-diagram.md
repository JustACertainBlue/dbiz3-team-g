# Use Case Table

The table format is the required course deliverable. Admin is one actor: HDT and UBND identify its authorization subtypes, not independent top-level actors. Member denotes a registered Admin, Tour Agency or Local Provider; login/recovery can occur while signed out, and protected actions require authentication. System denotes supporting automation. F-AUTH-16 protects every restricted use case, not only UC-ACC-09. Provider/Admin profile views use UC-PRO-02/03, not the Agency/Guest Explore functions.

| Use Case ID | Use case | Primary actor | Other actors | Subfunctions (Function List IDs) |
|---|---|---|---|---|
| UC-ACC-01 | Register Tour Agency Account | Guest |  | F-AUTH-01, F-AUTH-02, F-AUTH-03, F-AUTH-23, F-AUTH-04 |
| UC-ACC-02 | Login | Member |  | F-AUTH-05, F-AUTH-06, F-AUTH-07, F-AUTH-08, F-AUTH-15, F-AUTH-17 |
| UC-ACC-03 | Logout | Member |  | F-AUTH-09 |
| UC-ACC-04 | Forgot Password | Member |  | F-AUTH-10, F-AUTH-11, F-AUTH-12 |
| UC-ACC-05 | Change Password | Member |  | F-AUTH-13, F-AUTH-14 |
| UC-ACC-06 | Verify Agency / Resubmit Registration | Admin (HDT) / Tour Agency |  | F-AUTH-18, F-AUTH-26 |
| UC-ACC-07 | Create UBND Account | Admin (HDT) | Admin (UBND) | F-AUTH-19 |
| UC-ACC-08 | Create Provider Account | Admin (UBND) | Local Provider | F-AUTH-20 |
| UC-ACC-09 | Manage Accounts | Admin (HDT / UBND) |  | F-AUTH-21, F-AUTH-22, F-AUTH-16 |
| UC-PRO-01 | Manage Agency Profile | Tour Agency |  | F-PROFILE-01, F-PROFILE-02 |
| UC-PRO-02 | View Agency Profile | Local Provider | Guest, Admin (HDT), Admin (UBND) | F-PROFILE-01 |
| UC-PRO-03 | View Local Provider Profile | Tour Agency | Guest, Local Provider, Admin (HDT), Admin (UBND) | F-PROFILE-03 |
| UC-PRO-04 | Manage Provider Profile | Local Provider |  | F-PROFILE-03, F-PROFILE-04, F-PROFILE-07 |
| UC-PRO-05 | Manage Experiences | Local Provider |  | F-PROFILE-06, F-PROFILE-07 |
| UC-PRO-06 | Verify Provider Profile | Admin (UBND) | Local Provider | F-PROFILE-05 |
| UC-DIS-01 | Browse Explore | Guest / Tour Agency |  | F-EXPLORE-01, F-EXPLORE-02 |
| UC-DIS-02 | Explore Experiences | Tour Agency | System | F-EXPLORE-05, F-EXPLORE-06, F-EXPLORE-07, F-EXPLORE-08, F-EXPLORE-09, F-EXPLORE-10, F-EXPLORE-13, F-EXPLORE-14, F-EXPLORE-15, F-EXPLORE-16, F-EXPLORE-17 |
| UC-DIS-03 | View Provider | Tour Agency | Guest | F-EXPLORE-03 |
| UC-DIS-04 | View Experience | Tour Agency | Guest | F-EXPLORE-03, F-EXPLORE-04, F-EXPLORE-11, F-EXPLORE-12 |
| UC-DIS-05 | AI Tour Matching | Tour Agency | System | F-MATCH-01, F-MATCH-02, F-MATCH-03, F-MATCH-04, F-MATCH-05, F-MATCH-06, F-MATCH-07, F-MATCH-08, F-MATCH-09, F-MATCH-10, F-MATCH-11, F-MATCH-12, F-MATCH-13, F-MATCH-14, F-MATCH-15, F-MATCH-16 |
| UC-COM-01 | Chat | Tour Agency / Local Provider |  | F-CHAT-01, F-CHAT-02, F-CHAT-03, F-CHAT-04, F-CHAT-05 |
| UC-BOOK-01 | View Schedule | Tour Agency / Local Provider |  | F-SCHED-01, F-SCHED-02 |
| UC-BOOK-02 | View Calculated Availability | Local Provider / Tour Agency | System | F-SCHED-09 |
| UC-BOOK-03 | View Bookings | Tour Agency / Local Provider |  | F-SCHED-07 |
| UC-BOOK-04 | Create Booking | Local Provider | Tour Agency | F-SCHED-03, F-SCHED-08 |
| UC-BOOK-05 | Manage Booking | Local Provider | Tour Agency | F-SCHED-04, F-SCHED-05, F-SCHED-06, F-SCHED-07, F-SCHED-08 |
| UC-ADM-01 | View Dashboard | Admin (HDT / UBND) |  | F-ADMIN-01, F-ADMIN-02, F-ADMIN-03, F-ADMIN-04, F-ADMIN-05, F-ADMIN-06, F-ADMIN-07, F-ADMIN-08, F-ADMIN-09, F-ADMIN-10 |
| UC-BOOK-06 | List Provider Bookings | Local Provider | System | F-SCHED-10 |
| UC-ACC-10 | Manage Personal Account | Member | | F-AUTH-24, F-AUTH-25 |
