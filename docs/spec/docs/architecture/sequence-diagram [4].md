# Sequence Diagrams

Component-level lifelines are intentional. Screen IDs in notes connect each sequence to the required Use Case table and Screen List. Admin is one actor with HDT/UBND authorization subtypes. Read the [shared contract](../consistency-contract.md).

## AUT

```mermaid
sequenceDiagram
    actor Guest
    actor Member
    actor Admin
    participant UI as Frontend
    participant API as Backend
    participant DB as Database
    participant Mail as Email Service
    Note over Guest,UI: UC-ACC-01 REG003→REG115→REG116
    Guest->>UI: Submit registration
    UI->>API: validateRegistration (F-AUTH-02/03)
    alt Invalid fields or duplicate email
        API-->>UI: validation_errors; no account created
    else Valid unique registration
        API->>DB: Create registration request and return registration_request_id (F-AUTH-02)
        API->>Mail: Issue OTP for existing request (F-AUTH-23)
        Guest->>UI: Enter OTP on REG115
        UI->>API: verifyOTP(registration_request_id, otp)
        alt Wrong, expired or attempts exhausted
            API-->>UI: Defined OTP error; no account created
        else Verified
            API->>DB: Create Agency Pending Approval from verified registration_request (F-AUTH-04)
            API-->>UI: REG116 pending-review confirmation
        end
    end
    Note over Member,UI: UC-ACC-02 AUT009
    Member->>UI: Email and password
    UI->>API: authenticate (F-AUTH-06/07)
    API->>DB: Read password hash and current status
    alt Invalid credentials or ineligible/Disabled account
        API-->>UI: Error; no authenticated session
    else Eligible credentials
        API->>DB: Create opaque session and permission context
        API-->>UI: role, admin_type when ADMIN, permissions, must_change_password
        UI-->>Member: ACC129 password panel if required; else ADM079/EXP017/DSH018
    end
    Note over Member,UI: UC-ACC-04 PAS011→PAS014; email link→PAS142→PAS143
    Member->>UI: Request recovery by email
    UI->>API: requestReset (F-AUTH-11)
    API->>API: Rate limit 3/email and 5/IP per15min
    opt Eligible known email
        API->>DB: Store one-use token with15min expiry
        API->>Mail: Send token link; token never returned to requesting client
    end
    API-->>UI: Same generic result for known/unknown email
    Member->>UI: Open emailed token link on PAS142 and submit new password
    UI->>API: resetPassword(token,new_password,confirm_password)
    alt Invalid/expired/consumed token or invalid password
        API-->>UI: Defined error; no password update
    else Valid
        API->>DB: Atomically update hash and consume token
        API-->>UI: PAS143 success
    end
    Note over Member,UI: UC-ACC-05 ACC129 Change Password panel
    Member->>UI: Current/new/confirm password
    UI->>API: changePassword (F-AUTH-14)
    API->>DB: Verify current hash and persist valid replacement with audit
    API-->>UI: Defined failure or password_updated_at; clear required-change guard on success
    Note over Admin,UI: UC-ACC-07/08 ADM117; Admin actor with HDT/UBND subtype
    Admin->>UI: Create account
    UI->>API: createUBND(HDT) or createProvider(UBND)
    API->>API: Check subtype and village scope (F-AUTH-16)
    alt Forbidden subtype/scope or invalid input
        API-->>UI: Error; no account created
    else Allowed
        API->>DB: Create Active account, must_change_password=true
        opt Provider target
            API->>DB: Create empty Draft Provider profile in assigned village
        end
        API->>Mail: Temporary credentials
        API-->>UI: Created record and separate credential delivery status
    end
    Note over Admin,UI: UC-ACC-09 ADM095/ADM118
    Admin->>UI: Disable/enable/reset password
    UI->>API: accountAction (F-AUTH-22)
    API->>API: Check subtype/resource scope
    API->>DB: Apply permitted action; disable invalidates all sessions immediately
    API-->>UI: Result or permission error
    Note over Member,UI: UC-ACC-10 ACC129/ACC130; UC-ACC-03 AUT026
    Member->>UI: Edit permitted personal fields or logout
    UI->>API: updateOwnAccount (F-AUTH-25) or logout (F-AUTH-09)
    API->>DB: Owner validation then persist personal fields, or invalidate session
    API-->>UI: ACC129 updated account or AUT009 logged-out result
```

## PRF

```mermaid
sequenceDiagram
    actor Agency
    actor Provider
    actor Admin
    participant UI as Frontend
    participant API as Backend
    participant DB as Database
    participant AI as AI Service
    Note over Agency,UI: UC-PRO-01 PRF019→PRF021
    Agency->>UI: Edit own Agency profile
    UI->>API: updateAgencyProfile (F-PROFILE-02)
    API->>API: Check owner and validate fields
    alt Major company_name/tax_id change
        API->>DB: Store pending revision; keep Approved account/current legal version
    else Non-major change
        API->>DB: Apply immediately with change log
    end
    API-->>UI: Updated profile and major_change_review_status
    Note over Provider,UI: UC-PRO-04 PRF127→PRF128
    Provider->>UI: Save own profile including weekly operating hours
    UI->>API: updateProviderProfile (F-PROFILE-04)
    API->>API: Check ownership and validate supplied values
    alt Incomplete initial profile
        API->>DB: Save Draft
    else Complete first submission or major revision
        API->>DB: Save submitted revision Pending Verification; retain existing Verified publication
    else Permitted non-major change
        API->>DB: Apply change and audit
    end
    API-->>UI: Editable/review status and published version status
    Note over Admin,UI: UC-PRO-06 VER146/VER119; ADMIN subtype UBND
    Admin->>UI: Approve or Request Revision with required comments
    UI->>API: reviewProvider (F-PROFILE-05)
    API->>API: Check assigned village, submitted status and comments
    API->>DB: Persist review; Approve publishes Verified version, Request Revision retains last publication
    API-->>UI: verification_status, reviewer_id, reviewed_at; account remains Active
    Note over Admin,UI: UC-ACC-06 VER146 Agency variant; ADMIN subtype HDT
    Admin->>UI: Approve/Request More Information/Reject
    UI->>API: reviewAgency (F-AUTH-18, review_type)
    API->>DB: Persist decision; major-change review does not disable Approved account
    API-->>UI: Target-specific account/revision result plus email/in-app notification status
    opt Request More Information for initial registration
        API->>DB: Store review decision and submission version
        API->>Mail: Send single-use secure edit link
        Guest->>UI: Open REG003 through secure edit link and revise request (F-AUTH-26)
        UI->>API: resubmitRegistration(registration_request_id, token, updated_data)
        API->>DB: Store new submission version; return request to HDT review
    end
    Note over Provider,UI: UC-PRO-05 EXP067/068/069/070/132
    Provider->>UI: Create/Update/Delete Experience
    UI->>API: manageExperience (F-PROFILE-06)
    API->>DB: Check ownership and active/history references
    alt Invalid fields, locked field or active booking deletion
        API-->>UI: Validation error; no mutation
    else Historical references and Delete
        API->>DB: Archive, preserve booking history
    else No references and Delete
        API->>DB: Hard delete
    else Valid Create/Update
        API->>DB: Persist Experience; refresh Explore/matching source
    end
    API-->>UI: Permitted result
    opt AI description refinement on PRF128/EXP069/070
        Provider->>UI: AI Refine
        UI->>API: generateDescription (F-PROFILE-07)
        API->>AI: Request factual rewrite
        AI-->>UI: Draft or service failure
        Provider->>UI: Accept/Edit/Regenerate/Discard
        Note over UI,DB: Only accepted/edited text may be saved through the owning profile action
    end
```

## AIT

```mermaid
sequenceDiagram
    actor Agency
    participant UI as AIT121
    participant API as Backend
    participant AI as AI Engine
    participant DB as Database
    participant Maps as Maps Service
    Note over Agency,UI: UC-DIS-05; authenticated Agency only
    Agency->>UI: Natural-language requirements
    UI->>API: analyzeRequirements (F-MATCH-02/03)
    API->>AI: Extract tour context and constraints
    alt AI unavailable
        API-->>UI: Temporary AI Failure with Retry; no fallback matching result
    else Extraction succeeds
        loop Missing critical fields until sufficient input or user cancels
            API-->>UI: Clarification question
            Agency->>UI: Additional context
            UI->>API: Reanalyze updated requirements
        end
        API->>AI: Build Tour Preference Profile (F-MATCH-04)
        AI-->>API: tour_preference_profile
        API->>DB: Retrieve eligible Verified candidates (F-MATCH-05)
        API->>Maps: Distance/route inputs where required
        alt Required external calculation fails
            API-->>UI: Unable to complete matching; retry, no fabricated distance
        else Candidate data available
            API->>AI: Filter hard constraints, normalize factors, rank (F-MATCH-06/07)
            AI-->>API: Scored candidates and explanations
            alt No candidate meets threshold
                API-->>UI: No-match result with refinement guidance
            else Eligible ranked candidates
                API-->>UI: Ranked Experience/Village cards
                Agency->>UI: View, Chat or Request Quote
                UI->>API: Record permitted preference signal; Quote once per Agency–Experience
                API->>DB: Update shared preference profile and chat context
                API-->>UI: DSC033 or COM048
            end
        end
    end
    Note over API,DB: Shared preference profile/time decay; Book/Schedule are not learning signals
```

## EXP

```mermaid
sequenceDiagram
    actor Visitor as Guest or Agency
    participant UI as EXP120 or EXP017
    participant API as Backend
    participant DB as Database
    participant Worker
    Note over Visitor,UI: UC-DIS-01/02/03/04
    Visitor->>UI: Browse/filter/open detail
    UI->>API: getExplore or getExperienceDetail
    API->>DB: Read eligible public catalog and permitted fields
    alt Guest
        API-->>UI: Public fields including capacity/availability summary; restricted prices/contact masked
        Note over UI: DSC123/DSC124; AI interface hidden
    else Approved Agency
        API-->>UI: Permitted detail, prices/contact; DSC122/DSC033
        opt Request Quote
            UI->>API: requestQuote(experience_id, optional dates/group)
            API->>DB: Check Agency–Experience one-request guard and resolve Active pair chat
            API-->>UI: COM048 initial quote message or existing request result
        end
    end
    opt Authorized preference tracking under F-EXPLORE-05..10
        UI->>API: Record eligible views/clicks/dwell with defined identity/consent
        API->>DB: Update shared preference using current thresholds and 30-day decay
    end
    Worker->>DB: Daily F-EXPLORE-13 aggregation, retention30d
    Worker->>API: Weekly/monthly KPI evaluation and proposed tuning version
    API->>DB: Save Draft ranking-parameter version
    Note over API,DB: HDT_Admin uses F-EXPLORE-18 to activate Draft and retire prior Active; audit required
```

## BKG

```mermaid
sequenceDiagram
    actor Provider
    actor Agency
    participant UI as Frontend
    participant API as Backend
    participant DB as Database
    participant Worker
    Note over Provider,UI: UC-BOOK-02 SCH139; operating hours edited only on PRF128
    UI->>API: Calculate availability (F-SCHED-09)
    API->>DB: Read operating hours and On hold/Booked occupancy
    API-->>UI: Calculated slots; no operating hours means no available periods
    Note over Provider,UI: UC-BOOK-04 BKG134
    Provider->>UI: Select Agency ID, Experience, time, group and agreed total price
    UI->>API: createBooking (F-SCHED-03)
    API->>API: Validate ownership, Agency identity and input
    API->>DB: Atomically recheck availability and create On hold, expires_at=created_at+72h
    alt Conflict/validation/permission failure
        API-->>UI: Defined error; no Booking or schedule block committed
    else Commit succeeds
        API->>DB: Persist booking event and Agency schedule projection
        API->>API: Resolve Active pair Chat and send booking auto-message (F-SCHED-08)
        API-->>UI: BKG135 On hold
        API-->>Agency: BKG137/SCH141 includes own On hold
    end
    Note over Provider,Worker: UC-BOOK-05 BKG144; confirm vs72h expiry race
    par Provider action
        Provider->>API: Update fields or target_status Booked/Cancelled
        API->>DB: Lock/check current state and original deadline, then permitted atomic transition
    and Expiry worker
        Worker->>API: Expire due On hold booking
        API->>DB: Conditional On hold→Cancelled if deadline reached; record automatic expiry once
    end
    Note over API,DB: At expiry boundary confirmation fails; only one transition wins. Repeated worker does not duplicate events/messages.
    API->>DB: Synchronize resulting schedule and occupancy
    API->>API: Deliver linked chat update; retry without duplicating the committed booking event
    Note over Provider,UI: F-SCHED-06 BKG136; retain current arrival/completion requirement
    Provider->>UI: Mark Group Arrival
    UI->>API: markArrival(booking_id)
    API->>DB: Check owner, Booked status and now>=start_at; set Completed and arrived_at once
    API-->>UI: BKG135 result or defined invalid-state/time error
    Note over Agency,UI: UC-BOOK-01/03 SCH141/BKG137/BKG138; Agency read-only
    Agency->>API: Read own schedule/booking details
    API->>DB: Scope by own organization
    API-->>Agency: Canonical status and latest update; no other Agency details
    Note over Provider,UI: UC-BOOK-06 BKG133 uses F-SCHED-10, own bookings only
```

## ADM

```mermaid
sequenceDiagram
    actor Admin
    participant UI as ADM079
    participant API as Backend
    participant DB as Database
    Note over Admin,UI: UC-ADM-01; one actor ADMIN, subtype HDT/UBND
    Admin->>UI: Select time/village/Agency/Provider filters
    UI->>API: loadDashboardMetrics (F-ADMIN-01..10)
    API->>API: Check ADMIN and admin_type; force assigned village for UBND
    alt Unauthorized scope or invalid date range
        API-->>UI: Permission/validation error; no unauthorized data
    else Permitted scope
        API->>DB: Aggregate account status, profile status, activity, bookings and distinct pairs
        DB-->>API: Scoped metrics, booking trend/list, top10 collaboration pairs
        API-->>UI: Four cards, charts, result tables and filters
        Note over UI: No invented drill-down; metric tables read-only
    end
```

## IAC

```mermaid
sequenceDiagram
    actor Participant as Agency or Local Provider
    participant UI as COM048 or COM065
    participant API as Backend
    participant DB as Database
    participant Store as Private Document Storage
    Note over Participant,UI: UC-COM-01; Agency direct initiation, Provider needs Quote/Booking context
    Participant->>UI: Open Chat
    UI->>API: openChat (F-CHAT-01)
    API->>API: Check participants, source context and permission
    API->>DB: Atomically reuse/create at most one Active Chat per Agency–Provider pair
    API-->>UI: Active session plus contextual IDs; Closed histories remain separate
    UI->>API: Read last50 messages and chat list (F-CHAT-03)
    API->>DB: Participant-only history, cursor pagination and unread counter
    API-->>UI: Authorized history
    Participant->>UI: Send text or attach on COM125/COM126
    UI->>API: F-CHAT-02 text<=4000 or F-CHAT-05 files1–5,<=10MB each
    alt Invalid content/file, Closed session or denied participant
        API-->>UI: Error; no message created
    else Valid
        opt Attachments
            API->>Store: Store validated private files
        end
        API->>DB: Persist message with sender/time/context and update chat preview
        API-->>UI: message_id and sent_at
    end
    Participant->>UI: Switch page/thread
    Note over UI,DB: Navigation does not close Active Chat
    Participant->>UI: Explicit Close Chat
    UI->>API: closeChat (F-CHAT-04)
    API->>DB: Check participant; Active→Closed with closed_by/closed_at; retain history
    API-->>UI: Closed read-only history
    Note over UI,DB: New interaction creates a new Active session; no reopening Closed session
```
