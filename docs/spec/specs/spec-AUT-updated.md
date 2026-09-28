<span class="comment-start" id="0" author="Khánh Linh Vũ" date="2026-09-22T19:41:54Z"></span>**Spec**<span class="comment-end" id="0"></span> **Document: Authentication, Access & User Management**

| **Field**                 | **Value**                                                                                                                                                                                          |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | AUT                                                                                                                                                                                                |
| Module name               | Authentication, Access & User Management                                                                                                                                                           |
| Spec version              | v0.1                                                                                                                                                                                               |
| Author (team member)      | Group G                                                                                                                                                                                            |
| Date                      | 22/09/2026                                                                                                                                                                                         |
| Status                    | Clarified                                                                                                                                                                                          |
| Approved by (Client role) |                                                                                                                                                                                                    |
| DBIZ2 source              | Function List rows F-AUTH-01 .. F-AUTH-23; Use Case UC-ACC-01 .. UC-ACC-09; Screens AUT009, AUT026, PAS011, PAS014, PAS142, PAS143, REG003, REG115, REG116, ADM095, ADM117, ADM118, ADM145, VER119, VER146, ACC129 |

**1. Purpose and scope (mandatory)**

> The Authentication, Access & User Management module controls how users enter Artisan Bridge, obtain accounts, recover or change credentials, and access functions appropriate to their role and permitted data scope. It also supports the account lifecycle for Tour Agencies, UBND administrators and Local Providers, including Agency approval and administrative account management.

**In scope**

- Tour Agency self-registration, registration-email ownership verification through OTP, and submission for HDT approval.

- Login and logout for Tour Agency, Local Provider, HDT and UBND.

- Password recovery through a **15-minute secure token link**.

- Change password for authenticated members.

- Role-Based Access Control and data-scope validation.

- Periodic account-status and role consistency checks.

- HDT approval / Request More Information / rejection of Agency registrations.

- HDT creation of UBND accounts with one assigned village.

- UBND creation of Local Provider accounts within its assigned village.

- HDT/UBND account listing, disable, enable and permitted password reset.

- Role-specific post-login routing.

**Out of scope**

- Editing Agency or Local Provider **business/profile content** by HDT or UBND.

- Local Provider self-registration.

- OTP-based verification is used only for Tour Agency registration. Password Recovery does not use OTP and continues to use a secure 15-minute token link.

- Local Provider profile verification, which belongs to **Profile Management**.

- Editing general personal account information through ACC130 Edit My Account, because no corresponding F-AUTH function currently exists.

- Creation or manipulation of bookings.

- AI Matching, Explore ranking and Chat business logic.

**Depends on**

| **Dependency**                        | **Purpose**                                                                                                           |
|---------------------------------------|-----------------------------------------------------------------------------------------------------------------------|
| **Profile Management**                | Business/profile information remains owner-managed; LP profile completion/verification occurs after account creation. |
| **Admin Dashboard**                   | HDT/UBND post-login landing and account-management navigation.                                                        |
| **Role-specific application modules** | Destination after successful role-based login.                                                                        |
| **Email Delivery Service**            | Reset links, temporary credentials and Agency approval-status emails.                                                 |

**2. Actors (mandatory)**

| **Actor**          | **Role in this module**                                                           | **Source**            |
|--------------------|-----------------------------------------------------------------------------------|-----------------------|
| **Guest**          | Primary actor for Tour Agency registration and registration-email OTP verification; can open Login and Password Recovery | F-AUTH-01–05, F-AUTH-23 |
| **Member**         | Tour Agency, Local Provider, HDT or UBND using login/logout/password functions    | F-AUTH-05–14          |
| **Tour Agency**    | Account applicant whose registration requires HDT approval                        | UC-ACC-01, UC-ACC-06  |
| **HDT Admin**      | Approves Agency accounts, creates UBND accounts, manages platform-scoped accounts | F-AUTH-18, 19, 21, 22 |
| **UBND Admin**     | Creates and manages Local Provider accounts in its assigned village               | F-AUTH-20–22          |
| **Local Provider** | Receives an admin-created Active account and logs in to complete its profile      | F-AUTH-20             |
| **System**         | Initializes permissions, checks access scope and re-validates account/role status | F-AUTH-15–17          |

**3. User scenarios and acceptance criteria (mandatory)**

**US-1 (P1):** Register Tour Agency Account — UC-ACC-01

**Journey.** As a Guest representing a Tour Agency, I want to submit my account and company information so that HDT can review my registration.

**Acceptance scenarios**

1.  Given the Guest enters all required valid Agency registration data and the email passes duplicate checking, when initial registration validation succeeds, then the system sends a registration OTP to the submitted email.

2.  Given the Guest enters the correct active OTP within its validity period, when email verification succeeds, then the system creates a Tour Agency account with status **Pending Approval**.

3.  Given OTP verification fails or expires, then no Agency account is created.

4.  Given an email already exists, when the Guest submits registration, then no duplicate account is created and an appropriate error is shown.

5.  Given the Guest attempts to register as a Local Provider, then Local Provider self-registration is not offered.

UC-ACC-01 maps to F-AUTH-01–04 and F-AUTH-23.

**US-2 (P2):** Log In — UC-ACC-02

**Journey.** As a registered member, I want to log in so that I can access functions and data permitted for my role.

**Acceptance scenarios**

1.  Given valid credentials and an eligible account status, when the member logs in, then the correct role/permission context is loaded and the member is routed to the permitted landing screen.

2.  Given an Agency is Pending Approval, Rejected or Disabled, when login is attempted, then access is denied.

3.  Given an HDT, UBND or Local Provider account is Disabled, when login is attempted, then access is denied.

**US-3 (P3):** Log Out — UC-ACC-03

**Journey.** As an authenticated member, I want to log out so that my active session is ended.

**Acceptance scenarios**

1.  Given an authenticated member confirms Logout, when logout completes, then the active session is terminated and the member is returned to Login.

2.  Given the terminated session is reused, then protected access is denied.

## **US-4 (P2): Forgot Password — UC-ACC-04**

**Journey.** As a registered member who cannot remember the password, I want a secure reset link so that I can set a new password.

**Acceptance scenarios**

1.  Given a valid registered email, when a password reset is requested, then a secure reset link valid for **15 minutes** is issued by email.

2.  Given a valid unexpired token and valid new password, when the password is reset, then the token becomes unusable and the member can return to Login.

3.  Given an expired or already-used token, when reset is attempted, then the password is not changed.

The Function List explicitly specifies token-link recovery rather than OTP.

## **US-5 (P2): Change Password — UC-ACC-05**

**Journey.** As an authenticated member, I want to change my password so that I can maintain control of my account.

**Acceptance scenarios**

1.  Given the correct current password and a valid new password, when Change Password is submitted, then the password is updated and the action is recorded.

2.  Given the current password is incorrect, then no change is made and an error is shown.

## **US-6 (P1): Verify Agency — UC-ACC-06**

**Journey.** As an HDT Admin, I want to review a pending Agency registration so that only reviewed Agencies receive platform access.

**Acceptance scenarios**

1.  Given a Pending Approval Agency, when HDT selects **Approve**, then status becomes Approved and the Agency becomes eligible to log in.

2.  When HDT selects **Request More Information**, status remains Pending Approval and the Agency is informed what must be revised.

3.  When HDT selects **Reject**, status becomes Rejected and the rejection reason is recorded.

4.  Given an already Approved Agency submits a major change to Company Name or Tax ID, when HDT reviews the proposed change, then the Agency remains Approved and operational during review.

5.  If the major change is approved, then the proposed legal information replaces the current approved information.

6.  If the major change is rejected, then the proposed change is discarded and the last approved information remains effective.

The final Function List defines all three initial-registration decisions and the separate review behavior for major Company Name / Tax ID changes.

## **US-7 (P1): Create UBND Account — UC-ACC-07**

**Journey.** As an HDT Admin, I want to create an UBND account and assign one village so that the Local Authority can manage Providers in that village.

**Acceptance scenarios**

1.  Given valid UBND staff information and an unassigned valid village, when HDT creates the account, then an Active UBND account and fixed village assignment are created.

2.  The new UBND user receives temporary login credentials and must change the password on first login.

3.  A non-HDT actor cannot create an UBND account.

## **US-8 (P1): Create Local Provider Account — UC-ACC-08**

**Journey.** As an UBND Admin, I want to create an account for a Local Provider in my assigned village so that the Provider can log in and complete its profile.

**Acceptance scenarios**

1.  Given valid Provider data within the UBND's assigned village, when UBND creates the account, then an Active Local Provider account with temporary credentials is created.

2.  Given the Provider belongs to another village, when the UBND attempts account creation, then the action is denied.

3.  Account activation does **not** mean that the Provider business profile is already verified.

UC-ACC-07 and UC-ACC-08 map respectively to F-AUTH-19 and F-AUTH-20.

## **US-9 (P1): Manage Accounts — UC-ACC-09**

**Journey.** As an authorized HDT/UBND Admin, I want to view and manage accounts within my administrative scope so that invalid or inaccessible accounts can be controlled.

**Acceptance scenarios**

1.  HDT can view platform-wide accounts; UBND sees only Local Provider accounts in its assigned village.

2.  When an authorized Admin disables an account, then its active sessions become invalid and further access is denied.

3.  UBND may reset passwords only for Local Providers in its assigned village.

4.  Neither HDT nor UBND can modify business/profile content through account management.

UC-ACC-09 maps to F-AUTH-21, F-AUTH-22 and F-AUTH-16.

### **Edge cases**

- Duplicate registration email.

- Email delivery fails after account/reset record has already been created.

- Reset token expires exactly while the user is submitting a new password.

- Two HDT users attempt to review the same Agency registration concurrently.

- An account is disabled while the user is already logged in.

- UBND attempts to act on a Provider from another village.

- A Request More Information Agency resubmits information while another HDT reviewer has the record open.

- Repeated reset-password requests exceed the configured rate limit.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> subgraph Guest_Flow \["Actor: Guest (Registration)"\]
>
> G_Start(\["0. Start: Guest"\])
>
> G1\[/"1. Open Registration Form"/\]
>
> G2\["2. Select 'Tour Agency' Type\n(Local Provider Blocked)"\]
>
> G3\[/"3. Input Company Details"/\]
>
> G4\["4. Submit Registration"\]
>
> G5\["5. Receive 'Pending Approval' Status"\]
>
> G_End(\["6. End"\])
>
> G_Start --\> G1 --\> G2 --\> G3 --\> G4 --\> G5 --\> G_End
>
> end
>
> subgraph Admin_Flow \["Actor: Admin HDT & UBND (Account Creation)"\]
>
> A_Start(\["0. Start: Admin"\])
>
> A1{"1. Switch/Case:\nSelect Admin Action"}
>
> %% Branch 1: Manage Agencies (HDT Only)
>
> A2\["2a. View Pending Agencies \n(HDT Only)"\]
>
> A3{"3a. Decision:\nReview Agency Registration"}
>
> A4\["4a. Approve"\]
>
> A5\["4b. Request More Info"\]
>
> A6\["4c. Reject"\]
>
> A7\["5a. Record Decision & Update Account"\]
>
> A8\["6a. Send Result Email"\]
>
> %% Branch 2: Create Provider (HDT & UBND)
>
> A9\[/"2b. Input Local Provider Data"/\]
>
> A10\["3b. Create Provider Account\n(HDT: All / UBND: Assigned)"\]
>
> A11\["4d. Send Token Link via Email"\]
>
> A_End(\["7. End"\])
>
> %% Connections
>
> A_Start --\> A1
>
> %% Manage Agencies Logic
>
> A1 -- "Action: Manage Agencies" --\> A2 --\> A3
>
> A3 -- "Approve" --\> A4
>
> A3 -- "Need Info" --\> A5
>
> A3 -- "Reject" --\> A6
>
> A4 --\> A7
>
> A5 --\> A7
>
> A6 --\> A7
>
> A7 --\> A8 --\> A_End
>
> %% Create Provider Logic
>
> A1 -- "Action: Create Provider" --\> A9 --\> A10 --\> A11 --\> A_End
>
> end
>
> subgraph Common_Auth \["Actor: All Members (Login & Password)"\]
>
> C_Start(\["0. Start: All"\])
>
> C1{"1. Switch/Case:\nLogin or Recover?"}
>
> %% Branch 1: Login
>
> C2\[/"2a. Input Credentials"/\]
>
> C3\["3a. System Assigns JWT (24h)\n& Refresh Token (7d)"\]
>
> C4\["4a. Redirect to Role Homepage"\]
>
> %% Branch 2: Forgot Password
>
> C5\[/"2b. Input Email Address"/\]
>
> C6\["3b. Receive Token Link in Email\n(No OTP)"\]
>
> C7\[/"4b. Input New Password via Link"/\]
>
> C_End(\["5. End"\])
>
> %% Connections
>
> C_Start --\> C1
>
> C1 -- "Action: Login" --\> C2 --\> C3 --\> C4 --\> C_End
>
> C1 -- "Action: Forgot Password" --\> C5 --\> C6 --\> C7 --\> C_End
>
> end
>
> class G_Start,G_End,A_Start,A_End,C_Start,C_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 1: Authentication, Access & User Management, Actor Local Provider

actor LP

participant Frontend

participant Backend

participant Database

Note over LP, Database: UC-ACC-02: Log In

LP->>Frontend: Enter login credentials

activate Frontend

Frontend->>Backend: login(credentials)

activate Backend

Backend->>Database: checkUserCredentials(credentials)

activate Database

Database-->>Backend: loginResult

deactivate Database

Backend->>Database: getRole(lpId)

activate Database

Database-->>Backend: role

deactivate Database

Backend-->>Frontend: loginSuccess("User")

Frontend-->>LP: Display login status

deactivate Backend

deactivate Frontend

Note over LP, Database: UC-ACC-03: Log Out

LP->>Frontend: Select Logout

activate Frontend

Frontend->>Backend: logout()

activate Backend

Backend->>Backend: terminateSession()

Backend-->>Frontend: logoutSuccess

Frontend-->>LP: Display logout result

deactivate Backend

deactivate Frontend

Note over LP, Database: UC-ACC-04: Forgot Password

LP->>Frontend: Select "Forgot Password"

activate Frontend

Frontend-->>LP: Display password recovery form

LP->>Frontend: Enter account email

Frontend->>Backend: requestPasswordReset(email)

activate Backend

Backend->>Database: findUserByEmail(email)

activate Database

Database-->>Backend: userAccount

deactivate Database

Backend->>Backend: generateResetToken()

Backend->>Database: saveResetToken(userId, resetToken)

activate Database

Database-->>Backend: tokenSaved

deactivate Database

Backend-->>Frontend: resetLinkGenerated

Frontend-->>LP: Display password reset instructions

deactivate Backend

deactivate Frontend

Note over LP, Database: UC-ACC-05: Change Password

LP->>Frontend: Select "Change Password"

activate Frontend

Frontend-->>LP: Display change password form

LP->>Frontend: Enter current password and new password

Frontend->>Backend: changePassword(currentPassword, newPassword)

activate Backend

Backend->>Database: verifyCurrentPassword(lpId, currentPassword)

activate Database

Database-->>Backend: passwordVerified

deactivate Database

alt Current password is correct

Backend->>Backend: hashNewPassword(newPassword)

Backend->>Database: updatePassword(lpId, newPasswordHash)

activate Database

Database-->>Backend: passwordUpdated

deactivate Database

Backend-->>Frontend: changePasswordSuccess

Frontend-->>LP: Display password changed successfully

else Current password is incorrect

Backend-->>Frontend: changePasswordFailed

Frontend-->>LP: Display incorrect current password

end

deactivate Backend

deactivate Frontend

sequenceDiagram

title Module 1: Authentication, Access & User Management, Actor TourAgency

actor Agency as Tour Agency

participant Frontend

participant Backend

participant Database

Note over Agency, Database: UC-ACC-01: Register Account

Agency->>Frontend: Enter account information

activate Agency

activate Frontend

Frontend->>Backend: createAgencyAccount(accountData)

activate Backend

Backend->>Backend: validateAccountData()

Backend->>Database: insertAgencyAccount(accountData, "Pending")

activate Database

Database-->>Backend: accountSaved

deactivate Database

Backend-->>Frontend: registrationPending

Frontend-->>Agency: Display registration pending

deactivate Backend

deactivate Frontend

deactivate Agency

sequenceDiagram

title Module 1: Authentication, Access & User Management

actor Admin

participant Frontend

participant Backend

participant Database

Note over Admin, Database: UC-ACC-07, UC-ACC-08: Create Account

Admin->>Frontend: Enter LP account information

activate Admin

activate Frontend

Frontend->>Backend: createLPAccount(accountData, villageId)

activate Backend

Backend->>Backend: validateAccountData()

Backend->>Database: insertLPAccount(accountData, "User", villageId)

activate Database

Database-->>Backend: accountSaved

deactivate Database

Backend-->>Frontend: accountCreated

Frontend-->>Admin: Display account created

deactivate Backend

deactivate Frontend

deactivate Admin

Note over Admin, Database: UC-ACC-06: Verify Agency

Admin->>Frontend: Select Pending Account

activate Admin

activate Frontend

Frontend->>Backend: getAccountDetails(accountId)

activate Backend

Backend->>Database: getAccountDetails(accountId)

activate Database

Database-->>Backend: accountDetails

deactivate Database

Backend-->>Frontend: accountDetails

Frontend-->>Admin: Display Account Details

deactivate Backend

Admin->>Frontend: Click "Verify"

Frontend->>Backend: verifyAccount(accountId)

activate Backend

Backend->>Database: updateAccountStatus(accountId, "Verified")

activate Database

Database-->>Backend: statusUpdated

deactivate Database

Backend-->>Frontend: verificationSuccess

Frontend-->>Admin: Display account as "Verified"

deactivate Backend

deactivate Frontend

deactivate Admin

Note over Admin, Database: UC-ACC-09: Manage Accounts

Admin->>Frontend: Toggle Enable / Disable

Frontend->>Backend: updateAgencyStatus(agencyId, status)

activate Backend

Backend->>Database: updateAgencyStatus(agencyId, status)

activate Database

Database-->>Backend: statusUpdated

deactivate Database

Backend-->>Frontend: statusUpdateSuccess

Frontend-->>Admin: Display updated account status

deactivate Backend

**5. Functional requirements (mandatory)**

| **FR ID** | **DBIZ2 Subfunction ID** | **Requirement — system MUST...**                                                               | **Actor**      | **Priority** |
|-----------|--------------------------|------------------------------------------------------------------------------------------------|----------------|--------------|
| FR-001    | F-AUTH-01                | display an Agency-only self-registration form to Guests.                                       | Guest          | Must         |
| FR-002    | F-AUTH-02                | capture and validate all required Agency registration data and registration documents.         | Guest          | Must         |
| FR-003    | F-AUTH-03                | reject registration when the submitted email already belongs to an account.                    | Guest          | Must         |
| FR-004    | F-AUTH-04                | create a Tour Agency account with Pending Approval status after valid registration.            | Guest          | Must         |
| FR-005    | F-AUTH-05                | display a shared Login interface to unauthenticated users.                                     | Member / Guest | Must         |
| FR-006    | F-AUTH-06                | capture login email/password and validate required fields before authentication.               | Member         | Must         |
| FR-007    | F-AUTH-07                | authenticate credentials, verify account eligibility and load the member's role context.       | Member         | Must         |
| FR-008    | F-AUTH-08                | route an authenticated member to the permitted role-specific landing screen.                   | Member         | Must         |
| FR-009    | F-AUTH-09                | terminate the authenticated session and return the member to Login.                            | Member         | Must         |
| FR-010    | F-AUTH-10                | provide password-recovery initiation using the registered email.                               | Member         | Must         |
| FR-011    | F-AUTH-11                | validate the recovery email, issue a secure 15-minute token and send a reset link.             | Member         | Must         |
| FR-012    | F-AUTH-12                | validate the reset token and new password, update the password and invalidate the token.       | Member         | Must         |
| FR-013    | F-AUTH-13                | display the authenticated Change Password form.                                                | Member         | Must         |
| FR-014    | F-AUTH-14                | verify the current password and update it when the replacement password is valid.              | Member         | Must         |
| FR-015    | F-AUTH-15                | initialize role, permissions and data scope after successful authentication.                   | System         | Must         |
| FR-016    | F-AUTH-16                | verify permission and data scope before every protected action.                                | System         | Must         |
| FR-017    | F-AUTH-17                | re-check account status and role consistency every five minutes and on critical actions.       | System         | Must         |
| FR-018    | F-AUTH-18                | allow HDT to review both initial Agency registrations and pending major Agency profile changes to Company Name or Tax ID; initial registration supports Approve, Request More Information or Reject, while an already Approved Agency remains operational during major-change review. | HDT Admin      | Must         |
| FR-019    | F-AUTH-19                | allow HDT to create an Active UBND account assigned to one fixed village.                      | HDT Admin      | Must         |
| FR-020    | F-AUTH-20                | allow UBND to create an Active Local Provider account only within its assigned village.        | UBND Admin     | Must         |
| FR-021    | F-AUTH-21                | display account lists and actions restricted to the Admin's permitted scope.                   | HDT / UBND     | Must         |
| FR-022    | F-AUTH-22                | allow authorized Admins to disable, enable or reset passwords without editing profile content; Disable immediately invalidates active sessions and Enable restores the status that was effective immediately before Disable. | HDT / UBND     | Must         |
| FR-023    | F-AUTH-23                | verify ownership of the Tour Agency registration email using a 6-digit OTP before F-AUTH-04 may create the Agency account. | Guest          | Must         |

**5.1 Input / Output contract**

| **FR ID** | **Input fields** | **Required** | **Output fields** | **Notes / validation** |
|-----------|------------------|--------------|-------------------|------------------------|
| FR-001 | None | — | registration_form:UI View | Agency registration only. |
| FR-002 | full_name:String(max 100); email:Email(max 254); password:String(8–64); confirm_password:String; company_name:String(≤255); company_type:Enum\[Travel Agency, Tour Operator, TMC\]; tax_id:String; location:Object{street, ward, district, city_province}; contact_information:Object{contact_person_name, phone_number, business_email?}; team_size:Integer>0; tour_types:Array<Enum\[Cultural/Heritage, Craft Village/Experiential, Culinary, Educational/Study Tour, Corporate/MICE, Family/Leisure, Other\]>; registration_documents:Array<File> | All listed fields Required except business_email | is_valid:Boolean; validated_registration_data:Object?; validation_errors:Array<Object{field,message}>? | Password must contain uppercase, lowercase, number and special character; whitespace not allowed. tax_id must contain 10 or 13 numeric digits. phone accepts 10–15 digits with optional leading +. At least 1 tour type. Business Registration Certificate required; Travel Service Business License required when applicable; formats PDF/JPG/JPEG/PNG; max 10 MB/file; max 5 files. |
| FR-003 | email:Email | Yes | is_duplicate:Boolean; error_message:String? | No account creation occurs here. |
| FR-004 | email_verified:Boolean; validated_registration_data:Object; password_hash:String; company_information:Object; registration_documents:Array<File> | Yes | user_id:ID; agency_account_id:ID; account_status:"Pending Approval"; success_message:String; confirmation_email_status:Enum\[Success, Fail\] | email_verified must be true from F-AUTH-23 before the account can be created. Agency only. |
| FR-005 | None | — | login_page:UI View; forgot_password_link:URL | Shared screen. |
| FR-006 | email:Email; password:String | Yes | captured_credentials:Object{email,password}; empty_field_errors:Array<String>? | Empty-field validation only. |
| FR-007 | email:Email; password:String | Yes | session_token:String?; role:Enum\[HDT_Admin, UBND_Admin, Tour_Agency, Local_Provider\]?; permission_set:Array<String>?; error_message:Enum\[Invalid credentials, Account not approved, Account disabled\]? | On success, session_token is a cryptographically random opaque server-side session token. |
| FR-008 | session_token:String; role:Enum | Yes | dashboard_view:UI View | Role-specific routing follows the current F-AUTH-08 Function List definition. |
| FR-009 | session_token:String | Yes | session_terminated:Boolean; confirmation_message:String; redirect_url:URL | Clear client session state. |
| FR-010 | None | — | recovery_page:UI View | Token-link flow only. |
| FR-011 | email:Email | Yes | result_message:String; recovery_token:String?; token_expires_at:DateTime?; email_delivery_status:Enum\[Success, Fail, Not Applicable\]; rate_limit:Object{max_requests_per_email:3,max_requests_per_ip:5,window_minutes:15} | Always return the same generic result message whether or not the email exists. recovery_token is generated/stored only when the email exists and is never returned to the client. Token lifetime = 15 minutes. |
| FR-012 | recovery_token:String; new_password:String(8–64); confirm_password:String | Yes | success_message:String?; redirect_url:URL?; error_message:Enum\[Token invalid, Token expired, Password does not meet requirements, Passwords do not match\]? | New password must contain uppercase, lowercase, number and special character; whitespace not allowed. Token must be valid, unexpired and unused. |
| FR-013 | None | — | change_password_form:UI View; security_reminder_text:String | Authenticated users only. |
| FR-014 | current_password:String; new_password:String(8–64); confirm_new_password:String | Yes | success_message:String?; password_updated_at:DateTime?; error_message:Enum\[Current password incorrect, New password does not meet requirements, Passwords do not match\]?; audit_log_id:ID? | Current password must match. New password follows the same complexity rules and must not contain whitespace. |
| FR-015 | user_id:ID; role_id:ID | Yes | role:Enum; permission_set:Array<String>; data_scope:Enum\[Platform-wide, Assigned village, Own organization\]; assigned_village_id:ID?; acl_matrix:Object{role:Enum\[HDT_Admin, UBND_Admin, Tour_Agency, Local_Provider\], permissions:Array<String>, data_scope:Enum\[Platform-wide, Assigned village, Own organization\], organization_id:ID?, assigned_village_id:ID?} | UBND gets one assigned village. |
| FR-016 | session_context:Object{role, permission_set, data_scope}; required_permission:String; resource_id:ID; resource_owner_org_id:ID?; resource_village_id:ID? | Context-dependent | access_granted:Boolean; error_message:String? | Check role permission plus ownership/village scope. |
| FR-017 | user_id:ID; session_id:String; role_assignment:Object{role_id, organization_id?, village_id?} | Yes | validation_result:Enum\[Valid, Account Disabled, Role Revoked, Status Changed\]; force_logout:Boolean | Periodic + critical-action validation. Disable through F-AUTH-22 invalidates active sessions immediately; the 5-minute check is secondary. |
| FR-018 | agency_id:ID; review_type:Enum\[Initial Registration, Major Profile Change\]; decision:Enum\[Approve, Request More Information, Reject\]; review_comment:Text? | review_type and decision Required; review_comment Required for Request More Information or Reject, Optional for Approve | submitted_registration_or_change_view:UI View(read-only); decision_record:Object{decision,hdt_user_id,decided_at}; account_status:Enum\[Pending Approval, Approved, Rejected\]?; major_change_review_status:Enum\[Not Applicable, Pending Review, Approved, Rejected\]; review_history_entry:Object; notification_status:Object{in_app:Enum\[Success,Fail\], email:Enum\[Success,Fail\]} | account_status output applies to Initial Registration only; an already Approved Agency remains Approved during Major Profile Change review. |
| FR-019 | name:String; email:Email; phone:String; assigned_village_id:ID; role:Enum\[UBND_Admin\] | Yes | user_id:ID; account_status:"Active"; must_change_password:true; credential_email_status:Enum\[Success,Fail\]; village_assignment:Object{ubnd_user_id,village_id}; success_notification:String | phone required, 10–15 digits with optional leading +. Exactly one assigned village. |
| FR-020 | provider_name:String; address:String; contact:Object{contact_person_name,phone_number}; email:Email; role:Enum\[Local_Provider\]; village_id:ID | Yes | user_id:ID; account_status:"Active"; must_change_password:true; credential_email_status:Enum\[Success,Fail\]; success_notification:String; provider_profile_id:ID; profile_verification_status:Enum\[Draft\] | village_id comes from the UBND assignment and is not entered manually. An empty Provider Profile is created automatically. |
| FR-021 | organization_id:ID?; role:Enum?; status:Enum\[Pending Approval, Approved, Rejected, Active, Disabled\]?; date_from:Date?; date_to:Date?; admin_role:Enum\[HDT,UBND\]; page:Integer?; page_size:Integer? | admin_role Required | users:Array<Object{user_id,email,name,organization,role,status,last_login?,created_date,available_actions:Array<Enum\[Disable,Enable,Reset Password\]>}>; total_count:Integer | HDT platform-wide; UBND own-village Local Provider accounts only. available_actions belongs to each returned user row. Default page=1, page_size=50. |
| FR-022 | user_id:ID; action_type:Enum\[disable,enable,reset_password\]; reason:Text?; admin_role:Enum\[HDT,UBND\] | Yes | account_status:Enum\[Pending Approval, Approved, Rejected, Active, Disabled\]?; sessions_invalidated:Boolean?; temporary_password_email_status:Enum\[Success,Fail\]?; user_notification_status:Enum\[Success,Fail\]; audit_log_id:ID | Disable immediately invalidates all active sessions. Enable restores status_before_disable and never auto-approves an account that had not previously been Approved. Does not change profile content. |
| FR-023 | email:Email; otp_code:String(exactly 6 numeric digits); otp_request_id:ID | Yes | otp_verified:Boolean; verified_email:Email?; verified_at:DateTime?; error_message:Enum\[Invalid OTP, Expired OTP, Maximum Attempts Exceeded, Resend Limit Exceeded, Verification Failed\]? | OTP valid for 10 minutes; maximum 5 verification attempts per OTP; maximum 3 resends per email within 15 minutes; issuing a new OTP invalidates the previously active OTP for the same registration request. |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                           | **Why it exists**                                                                  |
|-------------|--------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| **BR-001**  | Guest self-registration is permitted for **Tour Agency only**.                                                     | Local Providers are onboarded through local administration.                        |
| **BR-002**  | Every self-registered Agency starts in Pending Approval.                                                           | HDT review is mandatory before login access.                                       |
| **BR-003**  | Agency login is permitted only when account status is Approved.                                                    | Prevents unreviewed/rejected access.                                               |
| **BR-004**  | HDT, UBND and Local Provider login requires Active status.                                                         | Enforces account status control.                                                   |
| **BR-005**  | Password recovery uses **token link only**, valid for 15 minutes; OTP is not used.                                 | Provides one consistent recovery method.                                           |
| **BR-006**  | A used password-reset token cannot be reused.                                                                      | Prevents repeated reset from one link.                                             |
| **BR-007**  | HDT creates UBND accounts; UBND is the operational creator of Local Provider accounts.                             | Separates platform-level and local administrative duties.                          |
| **BR-008**  | Each UBND account is assigned to exactly one fixed village.                                                        | Defines UBND data scope.                                                           |
| **BR-009**  | UBND may manage only Local Provider accounts in its assigned village.                                              | Prevents cross-village administration.                                             |
| **BR-010**  | Account management and profile-content management are separate. Admins cannot edit owner business/profile content. | Maintains ownership boundaries.                                                    |
| **BR-011**  | Permission checks require both role permission and resource/data scope.                                            | Role alone is insufficient for authorization.                                      |
| **BR-012**  | Account status and role consistency are revalidated every five minutes and on critical actions.                    | Allows mid-session revocation.                                                     |
| **BR-013**  | Disabling an account invalidates active access.                                                                    | Ensures a disabled user cannot continue working.                                   |
| **BR-014**  | Request More Information does not create a new Agency account status; the account remains Pending Approval.        | Keeps the Agency lifecycle simple.                                                 |
| **BR-015**  | Local Provider account Active status is separate from Provider **profile verification**.                           | Allows the Provider to log in and complete its profile before UBND profile review. |
| **BR-016**  | A Tour Agency account may be created only after registration-email ownership has been successfully verified through F-AUTH-23. | Prevents creation before email ownership is verified. |
| **BR-017**  | Disabling an account immediately invalidates all active sessions. The periodic five-minute F-AUTH-17 validation is a secondary safety check, not the primary disable mechanism. | Ensures immediate access revocation. |
| **BR-018**  | Enable restores the account status that was effective immediately before Disable; it does not automatically approve an account that was not previously Approved. | Preserves the pre-disable lifecycle state. |
| **BR-019**  | An Approved Agency remains Approved and operational while an HDT review of a proposed Company Name or Tax ID change is pending. | Separates account access from pending legal-information revision review. |
| **BR-020**  | Registration OTP is a 6-digit numeric code valid for 10 minutes, with a maximum of 5 verification attempts per OTP and 3 resends per email within 15 minutes; issuing a new OTP invalidates the previously active OTP. | Defines the registration-email verification controls. |

**6. Key entities (mandatory)**

| **Entity**                   | **Attributes derived from I/O**                                            | **Relationships**                                   |
|------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------|
| **User Account**             | user_id, email, password_hash, status, last_login, created_date            | has one role; may belong to an organization/village |
| **Role**                     | role_id, role_code                                                         | has many permissions; assigned to users             |
| **Permission**               | permission_code, action/resource definition                                | many-to-many with Role                              |
| **Session**                  | session_id/token, user_id, role context, expiry                            | belongs to one User                                 |
| **Tour Agency Registration** | agency_account_id, company information, tax ID, documents, approval status | belongs to a Tour Agency account; reviewed by HDT   |
| **Agency Review Record**     | decision, comments, hdt_user_id, decided_at                                | belongs to Agency registration                      |
| **Password Reset Token**     | token, user_id, issued_at, expires_at, used flag                           | belongs to User                                     |
| **Registration OTP**        | otp_request_id, email, otp_code, issued_at, expires_at, attempt_count, resend_count, verified_at | verifies Tour Agency registration email before account creation |
| **UBND Village Assignment**  | ubnd_user_id, village_id                                                   | one UBND account ↔ one assigned village             |
| **Local Provider Account**   | provider account/user ID, village ID, account status                       | created by assigned UBND                            |
| **Audit Log**                | actor, action, target, timestamp, change/result                            | records security/account actions                    |

**7. Screens involved**

| **Screen ID** | **Screen name**          | **Priority** | **Screen Spec file**          |
|---------------|--------------------------|--------------|-------------------------------|
| AUT009        | Login                    | Must         | screens/screen-spec-AUT009.md |
| AUT026        | Logout Confirmation      | Must         | screens/screen-spec-AUT026.md |
| PAS011        | Enter Registered Email   | Must         | screens/screen-spec-PAS011.md |
| PAS014        | Check Your Email         | Must         | screens/screen-spec-PAS014.md |
| PAS142        | Set New Password         | Must         | screens/screen-spec-PAS142.md |
| PAS143        | Password Updated         | Must         | screens/screen-spec-PAS143.md |
| REG003        | Agency Registration      | Must         | screens/screen-spec-REG003.md |
| REG115        | OTP Verification Input   | Must         | screens/screen-spec-REG115.md |
| REG116        | Registration Status      | Must         | screens/screen-spec-REG116.md |
| ADM095        | User Management          | Must         | screens/screen-spec-ADM095.md |
| ADM117        | Create Account           | Must         | screens/screen-spec-ADM117.md |
| ADM118        | View Account Information | Must         | screens/screen-spec-ADM118.md |
| ADM145        | View Submitted Profile   | Must         | screens/screen-spec-ADM145.md |
| VER146        | View Submitted Profile   | Must         | screens/screen-spec-VER146.md |
| VER119        | Account Information      | Must         | screens/screen-spec-VER119.md |
| ACC129        | My Account               | Must         | screens/screen-spec-ACC129.md |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                                               | **How it is measured**                                                        |
|------------|-----------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------|
| **SC-001** | A valid Tour Agency registration reaches Pending Approval without manual administrator data entry.                          | End-to-end registration test with complete valid data.                        |
| **SC-002** | Only Approved Agencies and Active HDT/UBND/LP accounts can enter protected areas.                                           | Test all defined account statuses against Login.                              |
| **SC-003** | Users cannot perform actions or access records outside their role/data scope.                                               | Authorization tests across Agency ownership and UBND village boundaries.      |
| **SC-004** | A password-reset link becomes unusable after 15 minutes or after successful use.                                            | Boundary and token-reuse tests.                                               |
| **SC-005** | HDT can create an UBND account assigned to exactly one village, and that UBND cannot manage Providers outside that village. | Account creation + cross-village access test.                                 |
| **SC-006** | A disabled logged-in user loses access immediately because all active sessions are invalidated when Disable succeeds.       | Disable an active account and verify immediate session revocation.            |
| **SC-007** | Admin account-management actions do not alter Provider or Agency profile content.                                           | Compare profile data before/after disable, enable and password-reset actions. |
| **SC-008** | Every Agency approval decision and Admin account-management action is traceable to actor and time.                          | Review audit/history records for completed test actions.                      |
| **SC-009** | A Tour Agency account cannot be created until the submitted registration email has been successfully verified through F-AUTH-23. | Attempt account creation before and after successful OTP verification.        |

**9. Assumptions**

- Member means an authenticated Tour Agency, Local Provider, HDT Admin or UBND Admin.

- The clarified Function List is authoritative over older Screen List or diagram wording where the two conflict.

- Village is the canonical UBND administrative scope; references to region in older material are treated as stale wording.

- Authentication behavior in this document is implementation-independent, but the current Function List contract uses a cryptographically random opaque server-side session token rather than a JWT contract.


**10. Open questions**

| **\#** | **Question**                                                                                                                                                                 | **Blocking?** | **Owner**         | **Status** | **Answer / Decision**                                                                                                                                                                                                                                                                |
|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What exact password complexity rules apply to registration, reset and Change Password?                                                                                       | Yes           | BA / Client       | **Closed** | **8–64 characters**, including at least **1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character**; whitespace is not allowed. Applies to Registration, Reset Password, and Change Password. |
| 2      | What Tax ID format/length should F-AUTH-02 validate?                                                                                                                         | Yes           | BA / Client       | **Closed** | Tax ID must contain **10 or 13 numeric digits**. Only digits are allowed. |
| 3      | Which Agency registration documents are mandatory, and what file types/max sizes are allowed?                                                                                | Yes           | BA / Client       | **Closed** | **Business Registration Certificate** is mandatory; **Travel Service Business License** is required when applicable. Allowed file types: **PDF/JPG/JPEG/PNG**, maximum **10 MB per file**, maximum **5 files**. |
| 4      | What exact sub-fields make up contact_information for Agency and Provider?                                                                                                   | Yes           | BA / Client       | **Closed** | For Agency registration, `contact_information` includes **contact person name, phone number, and optional business email**. Business location/address is captured separately through the structured `location` field. |
| 5      | Is team_size an integer or enum range, and is it mandatory?                                                                                                                  | No            | BA                | **Closed** | Integer, **mandatory**, with a value **≥ 1**. No enum is required for the MVP.                                                                                                                                                                                                       |
| 6      | What is the allowed tour_types enumeration, and is at least one required?                                                                                                    | No            | BA                | **Closed** | Enum: **Cultural/Heritage, Craft Village/Experiential, Culinary, Educational/Study Tour, Corporate/MICE, Family/Leisure, Other**. At least **one type** is required. |
| 7      | For Forgot Password, should an unknown email return an explicit error or the same generic success message?                                                                   | Yes           | Security / Client | **Closed** | Return the **same generic success message** for both existing and unknown emails to prevent email enumeration.                                                                                                                                                                       |
| 8      | What is the reset-request rate limit per email/IP/time window?                                                                                                               | Yes           | Tech Lead         | **Closed** | Maximum **3 requests per email per 15 minutes** and **5 requests per IP per 15 minutes**. |
| 9      | What are the canonical stored role codes for HDT, UBND, Tour Agency and Local Provider?                                                                                      | Yes           | Tech Lead         | **Closed** | **HDT_Admin, UBND_Admin, Tour_Agency, Local_Provider**. |
| 10     | What is the exact ACL/permission-set structure returned by F-AUTH-15?                                                                                                        | Yes           | Tech Lead         | **Closed** | ACL is returned as **role → permissions**, with each permission consisting of a resource and an action. Admin permissions may vary according to their management scope.                                                                                                              |
| 11     | Which protected actions are considered “critical actions” for immediate F-AUTH-17 revalidation?                                                                              | No            | Tech Lead         | **Closed** | Critical actions include **Change Password, Change Email/Phone, Approve, Reject, Disable/Enable Account, Create/Modify User, and Change Role/Permissions**.                                                                                                                          |
| 12     | Must a review comment be mandatory for **Reject** and **Request More Information** in F-AUTH-18?                                                                             | Yes           | Client            | **Closed** | **Yes.** `review_comment` is required when the decision is **Reject** or **Request More Information**, and optional when the decision is Approve. |
| 13     | Are Agency approval/rejection/revision notifications email-only or email + in-app?                                                                                           | No            | Client            | **Closed** | Notifications are sent via **email + in-app notification** for Approval, Rejection, and Request More Information.                                                                                                                                                                    |
| 14     | Is UBND staff phone required during account creation?                                                                                                                        | No            | Client            | **Closed** | **Yes.** F-AUTH-19 requires **Name, Email, Phone Number, assigned village, and role = UBND_Admin**. Phone accepts 10–15 digits with optional leading +. |
| 15     | Does F-AUTH-20 create an empty Local Provider Profile record immediately together with the account?                                                                          | Yes           | BA / Tech Lead    | **Closed** | **Yes.** F-AUTH-20 immediately creates an **empty Local Provider Profile** linked to the account with `profile_verification_status = Draft`. No separate first-login redirect requirement is defined by F-AUTH-20; post-login routing follows F-AUTH-08. |
| 16     | When an Agency account is re-enabled after being Disabled, does it return to Approved automatically?                                                                         | Yes           | Client            | **Closed** | Enable restores the **status that was effective immediately before Disable**. It does not automatically approve an account that had not previously been Approved. |
| 17     | Is a Rejected Agency permanently rejected, or can HDT explicitly reopen it for resubmission?                                                                                 | Yes           | Client            | **Closed** | **Rejection is not permanent.** The original registration form is **dismissed**. If the Agency wants to register again, it must submit a **new registration form from the beginning** rather than continuing with the previous form.                                                 |
| 18     | What is the Screen ID for Change Password?                                                                                                                                   | Yes           | UI/UX             | **Closed** | **ACC129 – Change Password**.                                                                                                                                                                                                                                                        |
| 19     | Are ADM145 View Submitted Profile and VER146 View Submitted Profile two separate screens or duplicates that should be consolidated?                                          | No            | UI/UX             | **Closed** | **Keep them as two separate screens** because they belong to different actor/context flows, although they may reuse the same UI component/template.                                                                                                                                  |
| 20     | What is the official Tour Agency post-login landing screen? Function List says Agency Dashboard, while Screen List identifies EXP017 Explore as the main screen after login. | Yes           | UI/UX / BA        | **Closed** | The current Function List is authoritative: F-AUTH-08 routes Tour Agency to the **Agency Dashboard** context (own bookings, Explore, AI Matching). EXP017 is not adopted here as the canonical landing screen unless F-AUTH-08 is revised. |
| 21     | Should ACC130 Edit My Account be removed from the Screen List or supported by a new Function List requirement?                                                               | No            | BA                | **Closed** | **Remove ACC130 from the current AUT module scope/screen list.** The current Function List ends at F-AUTH-23 and contains no self-service Edit My Account requirement. ACC130 may be reintroduced only if a corresponding Function List requirement is added later. |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                 |
|--------------------------------|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Authentication, Access & User Management**                 |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Authentication-related Usage Flows: Admin and Tour Agency flows**                                                        |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 1: Authentication, Access & User Management – UC-ACC-01 .. UC-ACC-09**                                            |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-AUTH-01 .. F-AUTH-23**                                                                                                   |
| **7. Screens**                 | Screen List                | **sheet ST, AUT009, AUT026, PAS011, PAS014, PAS142, PAS143, REG003, REG115, REG116, ADM079, ADM095, ADM117, ADM118, ADM145, VER146, VER119** |
