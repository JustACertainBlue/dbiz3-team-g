**Spec Document: Schedule/Booking**

| **Field**                 | **Value**                                                                                                                                                                          |
|---------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | BKG                                                                                                                                                                                |
| Module name               | Schedule/Booking                                                                                                                                                                   |
| Spec version              | v0.1                                                                                                                                                                               |
| Author (team member)      | Group G                                                                                                                                                                            |
| Date                      | 22/09/2026                                                                                                                                                                         |
| Status                    | Clarified                                                                                                                                                                          |
| Approved by (Client role) |                                                                                                                                                                                    |
| DBIZ2 source              | Function List rows **F-SCHED-01 .. F-SCHED-10**; Use Case **UC-BOOK-01 .. UC-BOOK-06**; Screens **BKG133, BKG134, BKG135, BKG144, BKG136, BKG137, BKG138, SCH139, SCH140, SCH141** |

**1. Purpose and scope (mandatory)**

> The Schedule / Booking Management module allows Local Providers to manage the complete lifecycle of their own bookings after agreement with a Tour Agency, and calculates/displays their resulting availability (operating hours are configured separately, on `F-PROFILE-04`). It also provides public Provider schedules and read-only private Agency schedules that stay synchronized with booking changes.

**In scope**

- Display Local Provider public schedule.

- Display Tour Agency private schedule containing only its own bookings.

- Calculate Provider availability (`F-SCHED-09`) from the Provider's operating hours — configured on `F-PROFILE-04` (Edit Local Provider Profile), outside this module — combined with active On hold/Booked Booking blocks. MVP does not include Provider-defined Unavailable or Blackout periods; only operating hours and Booking blocks feed the calculation.

- Local Provider creates a Booking after Agency–Provider negotiation.

- Every new Booking starts as **On hold**.

- On-hold period lasts **72 hours**.

- Local Provider updates Booking details.

- Local Provider changes permitted Booking status.

- Local Provider marks Group Arrival / completion.

- Display full Booking Detail according to actor and lifecycle state.

- Synchronize Booking changes to the Agency Private Schedule.

- Synchronize blocked Provider time to public schedule.

- Notify Agency through Chat auto-message when defined Booking changes occur.

**Out of scope**

- Tour Agency creating, confirming, updating or cancelling a Booking.

- HDT/UBND controlling Booking lifecycle.

- Guest access to private Booking Detail.

- Payment processing.

- Contract/e-contract management.

- Quote negotiation itself; this occurs through Chat before Booking creation.

- Manual editing of On hold/Booked schedule blocks independently of Booking records.

- Configuring operating hours (owned by `F-PROFILE-04` / Edit Local Provider Profile, PRF module) and any manual Provider "Manage Availability" editor screen — this module only calculates and displays the result.

- Provider-defined Unavailable/Blackout periods — not supported anywhere in MVP; the earlier `availability_type` design (Available/Unavailable/Blackout) is dropped.

- Admin override of Completed or Cancelled Booking states unless explicitly added later.

- Full notification-center functionality.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                          |
|----------------------------------------------------|------------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Enforces booking ownership and role/data scope.                                                      |
| **PRF – Profile Management**                       | Supplies Experience, duration, capacity, pricing defaults, booking conditions, and the Provider's operating hours via `F-PROFILE-04` (Edit Local Provider Profile) — the sole input to `F-SCHED-09`'s availability calculation besides active Bookings. |
| **CHAT – In-app Chat**                             | Supplies negotiation context before Booking creation and receives automatic Booking update messages. |
| **EXP / AIT**                                      | May originate Quote/Chat that later results in a Booking.                                            |
| **Background Worker / Scheduler**                  | Handles the 72-hour On hold expiry rule.                                                             |

**2. Actors (mandatory)**

| **Actor**             | **Role in this module**                                                                | **Where it comes from**                |
|-----------------------|----------------------------------------------------------------------------------------|----------------------------------------|
| **Local Provider**    | Primary owner of Booking lifecycle, views Provider availability, and manages its own Booking list | F-SCHED-01, 03–07, 10                  |
| **Tour Agency**       | Views Provider public schedule, own private schedule and own Booking details read-only | F-SCHED-01, F-SCHED-02, F-SCHED-07    |
| **System**            | Synchronizes schedules, calculates Provider availability, and performs automatic Booking-related updates | F-SCHED-08, F-SCHED-09                |
| **Background Worker** | Applies scheduled 72-hour On hold expiry                                               | System Configuration / F-SCHED-03 rule |
| **Chat module**       | Provides source negotiation context and receives booking-update messages               | F-SCHED-03, 04, 05, 08                 |

**3. User scenarios and acceptance criteria (mandatory)**

## **US-1 (P1): View Schedule — UC-BOOK-01**

**Journey.** As a Tour Agency or Local Provider, I want to view schedule information so that I can understand availability and my own booking commitments.

### **Acceptance scenarios**

1.  Given a Local Provider opens its Provider Schedule, when the schedule loads, then operating hours and time blocks with permitted status information are displayed.

2.  Given a Tour Agency opens a Provider's public schedule, then other Agencies' identity, agreed price, contact information and private Booking conditions are not exposed.

3.  Given a Tour Agency opens its private Agency Schedule, then only that Agency's own Bookings are shown.

4.  Given a Booking changes, then the Agency Private Schedule reflects the latest synchronized data.

5.  Given date/status filters are supplied on the private schedule, then only matching Agency-owned Bookings are returned.

UC-BOOK-01 maps to F-SCHED-01 and F-SCHED-02.

## **US-2 (P1): View Calculated Availability — UC-BOOK-02**

**Journey.** As a Local Provider, I want to see my calculated availability so that Agencies see realistic booking windows, without needing a separate manual editor in this module — operating hours are set once on my Profile.

### **Acceptance scenarios**

1.  Given a Local Provider has operating hours configured on `F-PROFILE-04`, when the Provider Schedule or public schedule loads, then `F-SCHED-09` derives and displays availability from those operating hours plus active (On hold/Booked) Booking blocks.

2.  Given an existing On hold or Booked Booking occupies a time range, then that range is shown as unavailable/occupied, and a new Booking cannot be created there.

3.  Given a Completed or Cancelled Booking, then its time range does not block future availability.

4.  Given a Provider has not yet configured operating hours on `F-PROFILE-04`, then `F-SCHED-09` has no basis for availability and the Provider Schedule shows no available periods until operating hours are set.

**Note:** MVP has no manual "Manage Availability" editor and no Unavailable/Blackout period concept — editing operating hours happens only on `F-PROFILE-04`, outside this module. Superseded acceptance criteria that assumed manual availability editing, conflict-on-save blocking, or Unavailable/Blackout periods within this module are removed; see Open Question #25 (Resolved).

UC-BOOK-02 maps to F-SCHED-09.

## **US-3 (P1): View Bookings — UC-BOOK-03**

**Journey.** As a Tour Agency or Local Provider, I want to view a Booking I am involved in so that I can see its current details and status.

### **Acceptance scenarios**

1.  Given a Local Provider opens one of its Bookings, then full Booking detail and status-appropriate action buttons are displayed.

2.  Given a Tour Agency opens one of its own Bookings, then full permitted details are displayed in read-only mode.

3.  Given an Agency attempts to open another Agency's Booking, access is denied.

4.  Given HDT, UBND or Guest attempts to access the operational Booking Detail screen, access is denied.

5.  Given status is terminal, action buttons are not available.

UC-BOOK-03 maps to F-SCHED-07.

## **US-4 (P1): Create Booking — UC-BOOK-04**

**Journey.** As a Local Provider, I want to create a Booking after reaching agreement with a Tour Agency so that the agreed time is reserved and visible to both parties.

### **Acceptance scenarios**

1.  Given Agency and Local Provider have agreed through Chat, when the Provider creates a Booking with valid details, then a new Booking is created with status **On hold**.

2.  The system sets hold_expires_at = created_at + 72 hours.

3.  The corresponding Provider schedule slot becomes blocked as **On hold** immediately.

4.  The Booking is synchronized to the Agency Private Schedule.

5.  Given the requested time conflicts with Provider availability or another On hold/Booked Booking, then creation must not silently create a conflicting Booking.

6.  Tour Agency cannot perform Create Booking.

F-SCHED-03 explicitly states that **every newly created Booking MUST have initial status On hold for 72 hours**.

## **US-5 (P1): Manage Booking — UC-BOOK-05**

**Journey.** As a Local Provider, I want to update and progress my Booking so that its state reflects the actual collaboration with the Tour Agency.

### **Acceptance scenarios**

1.  Given a Booking is On hold, when the Provider confirms it, then it advances to **Booked**.

2.  Given an On hold Booking cannot proceed, the Provider may cancel it.

3.  Given a Booked Booking changes in date/time/group size/agreed price/conditions, then details are updated and schedules are synchronized.

4.  Given a Booked Booking reaches the tour start time and the group arrives, when Provider selects Mark Group Arrival, then status becomes Completed.

5.  Given a Booking becomes Cancelled or Completed, then the Booking remains available as history but no longer exposes lifecycle action buttons.

6.  Every create/update/status/arrival event, including automatic 72-hour On hold expiry, triggers Agency private-schedule synchronization.

7.  Tour Agency sees updated Booking state but cannot change it.

UC-BOOK-05 maps to F-SCHED-04 through F-SCHED-08.

## **US-6 (P1): List Bookings — UC-BOOK-06**

**Journey.** As a Local Provider, I want to see all of my Bookings in one management list, ordered by scheduled start time and highlighting what needs my action, so that I can manage inbound allotments without opening each one individually.

### **Acceptance scenarios**

1.  Given a Local Provider opens Booking Management, when the list loads, then it shows all of that Provider's own Bookings, ordered by scheduled start time.

2.  Given the Provider applies a status filter or date range, then the list recomputes for that scope only.

3.  Given a Booking is an active On hold Booking awaiting confirmation, or a Booked Booking eligible for Mark Group Arrival, then the list highlights it as requiring Provider action.

4.  Given the Provider selects a Booking from the list, then its full detail opens through F-SCHED-07.

5.  Given a Tour Agency or any other actor attempts to call this function for a Provider it does not own, access is denied.

6.  Given the Provider has zero Bookings (or the filter matches none), then the list shows an explicit empty state, not an error.

UC-BOOK-06 maps to F-SCHED-10.

### **Edge cases**

- On hold reaches exactly 72 hours while Provider is confirming it.

- Provider attempts to modify a Completed/Cancelled Booking.

- Two Booking operations try to reserve the same time slot concurrently.

- Provider moves an existing Booking to a conflicting time.

- Agency is offline when Booking changes.

- Chat session referenced for synchronization no longer exists.

- Local Provider attempts Mark Group Arrival before scheduled start time — **must be rejected/disabled by F-SCHED-06 itself (see BR-010); the UI action button's enabled state must reflect this, not status alone (see F-SCHED-07).**


- A Booking expires automatically while the Booking Detail screen is open.

- A schedule sync succeeds for Provider but fails for Agency view.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> subgraph Provider_Booking \["Actor: Local Provider (100% Control & State Machine)"\]
>
> LP_Start(\["0. Start: Local Provider"\])
>
> LP1\["1. View Public Schedule / Receive Request"\]
>
> %% Phase 1: Initialize
>
> LP2{"2. Initial Booking Action:\nHold or Confirm?"}
>
> LP3\["3a. Hold Spot \[State: On hold\]"\]
>
> LP4\["3b. Confirm \[State: Confirmed\]"\]
>
> %% Phase 2 & 3: Manage States
>
> LP_Sync1\["4a. Auto-Sync to Agency"\]
>
> LP5{"5a. Decision on 'On hold':\nConfirm or Cancel?"}
>
> LP_Sync2\["4b. Auto-Sync to Agency"\]
>
> LP7{"5b. Decision on 'Confirmed':\nArrival or Cancel?"}
>
> %% Terminal Actions
>
> LP6\["6a. Cancel Booking \[State: Cancelled\]"\]
>
> LP8\["6b. Mark Group Arrival \[State: Completed\]"\]
>
> %% Phase 4: Terminal History
>
> LP_Sync3\["7. Auto-Sync to Agency"\]
>
> LP9\["8. View Private Booking Details (History)"\]
>
> LP_End(\["9. End"\])
>
> %% Connections
>
> LP_Start --\> LP1 --\> LP2
>
> %% Branch: Hold
>
> LP2 -- "Need time" --\> LP3 --\> LP_Sync1 --\> LP5
>
> LP5 -- "Cannot host" --\> LP6
>
> LP5 -- "Agree to host" --\> LP4
>
> %% Branch: Confirm
>
> LP2 -- "Ready to host" --\> LP4
>
> LP4 --\> LP_Sync2 --\> LP7
>
> LP7 -- "No-show / Issue" --\> LP6
>
> LP7 -- "Tour Finished" --\> LP8
>
> %% Convergence
>
> LP6 --\> LP_Sync3
>
> LP8 --\> LP_Sync3
>
> LP_Sync3 --\> LP9 --\> LP_End
>
> end
>
> subgraph Agency_Booking \["Actor: Tour Agency (Read-Only Sync)"\]
>
> TA_Start(\["0. Start: Tour Agency"\])
>
> TA1\["1. Open Private Schedule"\]
>
> TA2\["2. Receive Synced Booking Data\n(Triggered by Provider)"\]
>
> TA3\["3. View Booking Details (Read-Only)"\]
>
> TA_End(\["4. End"\])
>
> TA_Start --\> TA1 --\> TA2 --\> TA3 --\> TA_End
>
> end
>
> class LP_Start,LP_End,TA_Start,TA_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 5: Schedule / Booking Management

actor Agency as Tour Agency

participant Frontend

participant Backend

participant Database

Note over Agency, Database: UC-BOOK-01: View Schedule

Agency-\>\>Frontend: Open Local Provider Public Schedule

Frontend-\>\>Backend: getLocalProviderSchedule(providerId)

Backend-\>\>Database: getLocalProviderSchedule(providerId)

Database--\>\>Backend: providerSchedule

Backend--\>\>Frontend: providerSchedule

Frontend--\>\>Agency: Display Local Provider Public Schedule

Note over Agency, Database: UC-BOOK-03: View Bookings

Agency-\>\>Frontend: Open My Bookings

Frontend-\>\>Backend: getAgencyBookings(agencyId)

Backend-\>\>Database: getAgencyBookings(agencyId)

Database--\>\>Backend: bookingList

Backend--\>\>Frontend: bookingList

Frontend--\>\>Agency: Display Booking List

Agency-\>\>Frontend: Select Booking

Frontend-\>\>Backend: getBookingDetails(bookingId)

Backend-\>\>Database: getBookingDetails(bookingId)

Database--\>\>Backend: bookingDetails

Backend--\>\>Frontend: bookingDetails

Frontend--\>\>Agency: Display Booking Details

sequenceDiagram
    title Module 5: Schedule / Booking Management
    actor LP as Local Provider
    participant Frontend
    participant Backend
    participant Database
    participant Worker as Background Worker

    Note over LP, Database: UC-BOOK-03 - Manage Availability
    LP->>Frontend: Open Availability Management
    Frontend->>Backend: getAvailability(lpId)
    Backend->>Database: getAvailability(lpId)
    Database-->>Backend: availabilityData
    Backend-->>Frontend: availabilityData
    Frontend-->>LP: Display Availability Calendar

    LP->>Frontend: Update Available / Unavailable Dates
    LP->>Frontend: Save Availability
    Frontend->>Backend: saveAvailability(lpId, availabilityData)
    Backend->>Database: saveAvailability(lpId, availabilityData)
    Database-->>Backend: availabilitySaved
    Backend-->>Frontend: saveSuccess
    Frontend-->>LP: Display updated Availability Calendar

    Note over LP, Database: UC-BOOK-04 - Create Booking
    LP->>Frontend: Enter agreed booking details

    alt Confirm and Create Booking
        LP->>Frontend: Click "Confirm and Create Booking"
        Frontend->>Backend: createBooking(bookingData, "Confirmed")
        Backend->>Database: saveBooking(bookingData, "Confirmed")
        Database-->>Backend: bookingConfirmed
        Backend->>Database: updateLPSchedule(bookingId)
        Database-->>Backend: lpScheduleUpdated
        Backend->>Database: updateAgencyPrivateSchedule(bookingId)
        Database-->>Backend: agencyScheduleUpdated
        Backend-->>Frontend: bookingConfirmed
        Frontend-->>LP: Display booking status "Confirmed"
    else Save as On Hold
        LP->>Frontend: Click "Save as On Hold"
        Frontend->>Backend: createBooking(bookingData, "On hold")
        Backend->>Database: saveBooking(bookingData, "On hold")
        Database-->>Backend: bookingCreated
        Backend->>Database: updateLPSchedule(bookingId)
        Database-->>Backend: lpScheduleUpdated
        Backend->>Database: updateAgencyPrivateSchedule(bookingId)
        Database-->>Backend: agencyScheduleUpdated
        Backend-->>Frontend: bookingCreated
        Frontend-->>LP: Display booking status "On hold"
    end

    Note over Worker, Database: 72-hour On Hold Expiry (Background Process)
    alt Provider confirms within 72 hours
        Note over LP, Database: Booking proceeds via UC-BOOK-05 (status advances to Booked)
    else 72 hours elapse without confirmation
        Worker->>Backend: checkHoldExpiry(bookingId)
        Backend->>Database: getBooking(bookingId)
        Database-->>Backend: bookingData
        Backend->>Database: releaseLPSchedule(bookingId)
        Database-->>Backend: lpScheduleReleased
        Backend->>Database: updateAgencyPrivateSchedule(bookingId)
        Database-->>Backend: agencyScheduleUpdated
    end

    Note over LP, Database: UC-BOOK-05 - Manage Booking
    LP->>Frontend: Open Booking
    Frontend->>Backend: getBookingDetail(bookingId)
    Backend->>Database: getBookingDetail(bookingId)
    Database-->>Backend: bookingDetail
    Backend-->>Frontend: bookingDetail
    Frontend-->>LP: Display Booking Detail

    alt Edit Booking
        LP->>Frontend: Click "Edit Booking"
        Frontend-->>LP: Display editable booking fields
        LP->>Frontend: Edit booking information
        LP->>Frontend: Select status Confirmed / Completed / Cancelled

        alt Save Changes
            LP->>Frontend: Click "Save Changes"
            Frontend->>Backend: updateBooking(bookingId, updatedData)
            Backend->>Database: updateBooking(bookingId, updatedData)
            Database-->>Backend: bookingUpdated
            Backend->>Database: updateLPSchedule(bookingId)
            Database-->>Backend: lpScheduleUpdated
            Backend->>Database: updateAgencyPrivateSchedule(bookingId)
            Database-->>Backend: agencyScheduleUpdated
            Backend-->>Frontend: updateSuccess
            Frontend-->>LP: Display updated Booking Detail
        else Cancel Changes
            LP->>Frontend: Click "Cancel Changes"
            Frontend-->>LP: Discard changes
            Frontend-->>LP: Display Booking Detail
        end
    else Mark Group Arrival
        LP->>Frontend: Click "Mark Group Arrival"
        Frontend->>Backend: markGroupArrival(bookingId)
        Backend->>Database: saveGroupArrival(bookingId)
        Database-->>Backend: arrivalRecorded
        Backend-->>Frontend: arrivalRecorded
        Frontend-->>LP: Display "Group Arrived"
    end

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                                                                | **Actor**                    | **Priority** |
|------------|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|--------------|
| **FR-001** | F-SCHED-01               | Display the Local Provider's public schedule with permitted availability and Booking block information only.                                     | Tour Agency / Local Provider | Must         |
| **FR-002** | F-SCHED-02               | Display the Tour Agency's private schedule containing only its own Bookings and full permitted details.                                          | Tour Agency                  | Must         |
| **FR-003** | F-SCHED-03               | Allow a Local Provider to create a Booking after negotiation, always with initial status On hold and a 72-hour hold expiry. MVP: one Booking has exactly one operating time slot (single `start_at` + `duration`); multi-slot/multi-session Bookings are out of scope. | Local Provider               | Must         |
| **FR-004** | F-SCHED-04               | Allow the Local Provider to update non-status Booking details and synchronize affected schedules.                                                | Local Provider               | Must         |
| **FR-005** | F-SCHED-05               | Allow the Local Provider to perform only permitted Booking status transitions and synchronize resulting schedule changes.                        | Local Provider               | Must         |
| **FR-006** | F-SCHED-06               | Allow the Local Provider to Mark Group Arrival, changing a Booked Booking to Completed. The action MUST be rejected/disabled if the current time is before the Booking's scheduled start time (per BR-010) — the guard is enforced by this function itself, not left to the UI. Since a Booking has exactly one operating slot (FR-003), Mark Group Arrival sets Status to Completed directly; there is no partial/fractional arrival progress. | Local Provider               | Must         |
| **FR-007** | F-SCHED-07               | Display full Booking Detail and actor/status-specific actions for Local Provider and Tour Agency. Each action button's enabled/visible state MUST reflect that action's own gating rule (e.g., Mark Group Arrival per BR-010: status = Booked **and** current time ≥ scheduled start time) — status alone MUST NOT be used to enable an action. | Local Provider / Tour Agency | Must         |
| **FR-008** | F-SCHED-08               | Automatically synchronize Booking create/update/status/arrival changes to the Agency Private Schedule and send the corresponding update message. | System                       | Must         |
| **FR-009** | F-SCHED-09               | Calculates the Local Provider's available and occupied time periods for use by the Provider Schedule and public schedule views. This is a calculation-only function with no manual availability editing anywhere in this module (not on `SCH139` or any other BKG screen). Availability is derived from exactly two inputs: the Provider's operating hours configured on `F-PROFILE-04` (Edit Local Provider Profile, PRF module) and active Booking blocks. On hold and Booked Bookings occupy their corresponding time ranges and therefore make those periods unavailable for another Booking. Completed and Cancelled Bookings do not block future availability. MVP has no Unavailable/Blackout period input. The calculated result is consumed by F-SCHED-01 when rendering the Provider Schedule and is also used by F-SCHED-03/F-SCHED-04 when checking whether a requested Booking time is available. | System                       | Must         |
| **FR-010** | F-SCHED-10               | Display the authenticated Local Provider's own Bookings in a management list, filterable by lifecycle status and date range, ordered by scheduled start time. The list highlights Bookings requiring Provider action (active On hold Bookings awaiting confirmation, and Booked Bookings eligible for Mark Group Arrival). Selecting a Booking opens its full detail through F-SCHED-07. The Local Provider cannot access Bookings belonging to another Provider. | Local Provider               | Must         |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**     | **Type**                                 | **Required** | **Output field(s)**            | **Type**             | **Notes / validation**                                         |
|------------|------------------------|------------------------------------------|--------------|--------------------------------|----------------------|----------------------------------------------------------------|
| **FR-001** | provider_id            | ID                                       | Yes          | calendar_blocks                | Array                | Own Provider for Local Provider; selected Provider for Tour Agency. |
|            | date_from              | Date                                     | No           | operating_hours                | Object               | Defaults to current date.                                      |
|            | date_to                | Date                                     | No           |                                |                      | Defaults to `date_from + 29 days`; block status Enum[Available, On hold, Booked, Unavailable]. |
| **FR-002** | agency_id              | ID                                       | Yes          | bookings                       | Array                | Agency ID from session.                                        |
|            | status                 | Enum[On hold, Booked, Completed, Cancelled] | No        |                                |                      | —                                                              |
|            | village_id             | ID                                       | No           |                                |                      | —                                                              |
|            | date_from, date_to     | Date                                     | No           |                                |                      | —                                                              |
| **FR-003** | experience_id          | ID                                       | Yes          | booking_id                     | ID                   | —                                                              |
|            | agency_id              | ID                                       | Yes          | status                         | Enum["On hold"]     | Fixed initial status.                                          |
|            | start_at               | DateTime                                 | Yes          | created_at                     | DateTime             | —                                                              |
|            | duration               | See F-PROFILE-06                         | Yes          | hold_expires_at                | DateTime             | `created_at + 72h`.                                            |
|            | group_size             | Integer > 0                              | Yes          | public_schedule_block          | Object               | Must be `<= Experience.max_participants`.                      |
|            | agreed_price           | Decimal > 0, VND                         | Yes          | private_schedule_synced        | Boolean              | Total agreed price for the whole Booking, not per-person.      |
|            | booking_conditions     | Object{notice_period, cancellation_policy} | Yes        |                                |                      | Prefilled as a snapshot from the Experience and may be adjusted by the Local Provider before Booking creation. |
|            | source_chat_session_id | ID                                       | No           |                                |                      | Optional pre-fill context.                                     |
| **FR-004** | booking_id             | ID                                       | Yes          | updated_booking                | Object               | At least one editable field required.                          |
|            | start_at               | DateTime                                 | No           | private_schedule_synced        | Boolean              | Changing date/time does **not** reset `hold_expires_at`; an On hold Booking retains its original 72-hour expiry. |
|            | duration               | See F-PROFILE-06                         | No           | public_schedule_updated        | Boolean              | Returned when schedule changes.                                |
|            | group_size             | Integer > 0                              | No           | agency_notification_message_id | ID                   | Must not exceed Experience.max_participants.                   |
|            | agreed_price           | Decimal                                  | No           | audit_log_id                   | ID                   | —                                                              |
|            | booking_conditions     | Object                                   | No           |                                |                      | —                                                              |
| **FR-005** | booking_id             | ID                                       | Yes          | booking_status                 | Enum                 | Canonical lifecycle uses On hold / Booked / Completed / Cancelled. |
|            | target_status          | Enum[Booked, Cancelled]                   | Yes          | status_history_entry           | Object               | Completed is handled only by F-SCHED-06.                       |
|            | cancellation_reason    | Text                                     | Conditional  | schedules_synced               | Boolean              | Required when `target_status = Cancelled`; otherwise omitted.  |
|            |                        |                                          |              | agency_notification_message_id | ID                   | —                                                              |
| **FR-006** | booking_id             | ID                                       | Yes          | transition_applied             | Boolean              | Server validates status = Booked and current time >= start_at. |
|            |                        |                                          |              | booking_status                 | Enum[Booked, Completed] | Remains Booked when transition is rejected.                   |
|            |                        |                                          |              | arrived_at                     | DateTime             | Optional; returned only when `transition_applied = true`.      |
|            |                        |                                          |              | status_history_entry           | Object               | Optional; created only on successful transition.               |
|            |                        |                                          |              | private_schedule_synced        | Boolean              | True only when successful completion is synchronized.          |
|            |                        |                                          |              | availability_released          | Boolean              | True only after successful Booked → Completed.                 |
|            |                        |                                          |              | validation_error               | Enum[Booking Not Booked, Tour Start Time Not Reached] | Optional; returned when `transition_applied = false`. |
| **FR-007** | booking_id             | ID                                       | Yes          | experience_name                | String               | Requester must be the Local Provider or Tour Agency of the Booking. |
|            | requester_id           | ID                                       | Yes          | start_at, end_at               | DateTime             | —                                                              |
|            |                        |                                          |              | group_size                     | Integer              | —                                                              |
|            |                        |                                          |              | agreed_price                   | Decimal              | Commercial agreed amount only; not proof of payment.           |
|            |                        |                                          |              | notice_period, cancellation_policy | Object / value    | See F-PROFILE-06.                                              |
|            |                        |                                          |              | status                         | Enum[On hold, Booked, Completed, Cancelled] | —                                    |
|            |                        |                                          |              | last_updated_at                | DateTime             | —                                                              |
|            |                        |                                          |              | provider_profile_link          | URL                  | Optional — Agency view.                                        |
|            |                        |                                          |              | agency_contact                 | Object               | Optional — Local Provider view.                                |
| **FR-008** | booking_event          | Object{event_type: Enum[create, update, status_change, mark_arrival, auto_expiry], booking_id, changed_fields} | Yes | private_schedule_updated | Boolean | Automatic 72-hour expiry is included as `auto_expiry`.         |
|            |                        |                                          |              | chat_auto_message_id           | ID                   | Chat routing follows the defined F-SCHED-08 resolution order.  |
|            |                        |                                          |              | latest_update_at               | DateTime             | —                                                              |
|            |                        |                                          |              | delivery_status                | Enum[Seen, Unseen]    | Current Function List contract.                                |
| **FR-009** | provider_id            | ID                                       | Yes          | availability_calendar          | Object               | Calculation-only; Actor = System.                              |
|            | date_from              | Date                                     | Yes          | available_slots                | Array<Object{start_at, end_at}> | —                                                     |
|            | date_to                | Date                                     | No           | occupied_slots                 | Array<Object{booking_id, start_at, end_at, status}> | Contains On hold / Booked blocks only. |
|            | operating_hours        | Object                                   | Yes          | calculated_at                  | DateTime             | Recurring Provider operating hours from F-PROFILE-04.          |
|            | booking_blocks         | Array<Object{booking_id, start_at, end_at, status}> | Yes | | | Status values: On hold, Booked, Completed, Cancelled.            |
| **FR-010** | provider_id            | ID                                       | Yes          | bookings                       | Array                | Only the requesting Provider's own Bookings.                   |
|            | status                 | Enum[On hold, Booked, Completed, Cancelled] | No        | status_counts                  | Map<Enum, Integer>   | Used to summarize counts by canonical lifecycle status.        |
|            | date_from              | Date                                     | No           | total_count                    | Integer              | —                                                              |
|            | date_to                | Date                                     | No           |                                |                      | —                                                              |
|            | page                   | Integer                                  | No           |                                |                      | Default 1.                                                     |
|            | page_size              | Integer                                  | No           |                                |                      | Default 20.                                                    |
|            | *(search_text)*        | *(UI-level extension — see note)*        | No           |                                |                      | BKG133 search remains a UI-level extension and is not part of F-SCHED-10's current Function List contract. |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                                       | **Why it exists**                                              |
|-------------|--------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **BR-001**  | Only Local Provider controls Booking lifecycle actions.                                                                        | Preserves the agreed business ownership model.                 |
| **BR-002**  | Tour Agency may view only its own Booking/schedule information and cannot perform lifecycle actions.                           | Protects ownership and prevents Agency-side manipulation.      |
| **BR-003**  | Every newly created Booking starts in On hold.                                                                                 | Provides a consistent Booking entry state.                     |
| **BR-004**  | Initial On hold duration is exactly **72 hours**.                                                                              | Gives the Provider a fixed commitment window.                  |
| **BR-005**  | Creating an On hold Booking immediately blocks the relevant Provider time slot.                                                | Prevents double allocation.                                    |
| **BR-006**  | On hold and Booked schedule blocks originate from Booking records and are not manually edited anywhere; the only other availability input, operating hours, is edited on `F-PROFILE-04` (PRF module), not within this module. | Keeps schedule state consistent with Bookings and avoids a duplicate editor.                 |
| **BR-007**  | Booking detail changes and Booking status changes are separate functions.                                                      | Prevents accidental lifecycle modification during field edits. |
| **BR-008**  | Agency Private Schedule is read-only and contains only that Agency's own Bookings.                                             | Protects other Agencies' data.                                 |
| **BR-009**  | Public Provider Schedule must not reveal Agency identity, contact, agreed price or private booking conditions.                 | Protects commercial/private information.                       |
| **BR-010**  | Mark Group Arrival is permitted only for a Booked Booking on or after tour start.                                              | Prevents premature completion.                                 |
| **BR-011**  | Completed and Cancelled are terminal/view-only states.                                                                         | Stabilizes Booking history.                                    |
| **BR-012**  | Every create/update/status/arrival event must synchronize Agency Private Schedule.                                             | Maintains cross-party consistency.                             |
| **BR-014**  | UBND/HDT/Guest cannot access the operational Booking Detail screen defined by F-SCHED-07.                                      | Separates monitoring from Booking operations.                  |
| **BR-015**  | Booking negotiation precedes Booking creation; Request Quote itself is not a Booking.                                          | Separates commercial discussion from committed reservation.    |
| **BR-016**  | MVP: one Booking has exactly one operating time slot. There is no multi-slot/multi-session Booking and no fractional arrival progress (e.g. "1/2 slots"); Mark Group Arrival (BR-010) sets Status directly to Completed. | Keeps the Booking data model and lifecycle unambiguous for MVP; screen specs describing partial arrival progress are out of date and must be revised. |
| **BR-017**  | An action button's enabled/visible state must reflect that action's own full gating rule, not status alone. In particular, Mark Group Arrival must stay disabled until both status = Booked **and** current time ≥ the Booking's scheduled start time (BR-010). | Prevents F-SCHED-07 (Booking Detail) from exposing an action before its precondition (BR-010) is actually met. |

**6. Key entities (mandatory)**

| **Entity**                        | **Attributes from Input/Output**                                                                                                                 | **Relationships**                                         |
|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **Booking**                       | booking_id, experience_id, agency_id, provider_id, start_at, duration, group_size, agreed_price, conditions, status, created_at, hold_expires_at | belongs to one Agency, Provider and Experience            |
| **Booking Status History**        | from_status, to_status, changed_by, changed_at, reason                                                                                           | has many entries per Booking                              |
| **Public Schedule Block**         | start_at, end_at, status                                                                                                                         | derived from Provider availability/Booking                |
| **Agency Private Schedule Entry** | booking details, status, last_updated_at                                                                                                         | derived from one Booking                                  |
| **Provider Operating Hours**      | recurring weekly hours by weekday (owned by `F-PROFILE-04`, PRF module — referenced, not defined, by this module)                                | belongs to one Provider; consumed as input by F-SCHED-09  |
| **Booking Condition**             | notice_period, cancellation_policy                                                                                                               | copied/referenced from Experience or agreed Booking       |
| **Booking Event**                 | event_type, booking_id, changed_fields                                                                                                           | triggers synchronization                                  |
| **Group Arrival Record**          | booking_id, arrived_at                                                                                                                           | associated with Booking completion                        |
| **Chat Booking Update Message**   | chat_session/message ID, Booking update summary                                                                                                  | associated with Booking and Agency/Provider communication |

**7. Screens involved**

| **Screen ID** | **Screen name**                 | **Priority** | **Screen Spec file**          |
|---------------|---------------------------------|--------------|-------------------------------|
| **BKG133**    | Booking Management              | Must         | screens/screen-spec-BKG133.md |
| **BKG134**    | Create Booking                  | Must         | screens/screen-spec-BKG134.md |
| **BKG135**    | Booking Detail                  | Must         | screens/screen-spec-BKG135.md |
| **BKG144**    | Edit Booking Detail             | Must         | screens/screen-spec-BKG144.md |
| **BKG136**    | Confirm Group Arrival           | Must         | screens/screen-spec-BKG136.md |
| **BKG137**    | Booking History                 | Must         | screens/screen-spec-BKG137.md |
| **BKG138**    | Booking Detail                  | Must         | screens/screen-spec-BKG138.md |
| **SCH139**    | Provider Schedule               | Must         | screens/screen-spec-SCH139.md |
| **SCH140**    | Provider Schedule – Agency View | Must         | screens/screen-spec-SCH140.md |
| **SCH141**    | Agency Schedule                 | Must         | screens/screen-spec-SCH141.md |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                             | **How it is measured**                                             |
|------------|-------------------------------------------------------------------------------------------|--------------------------------------------------------------------|
| **SC-001** | Every newly created Booking enters On hold rather than a later lifecycle state.           | Create Booking and inspect initial status.                         |
| **SC-002** | Every On hold Booking receives an expiry exactly 72 hours after creation.                 | Compare created_at and hold_expires_at.                            |
| **SC-003** | An On hold Booking immediately blocks the corresponding Provider time period.             | Compare Provider Schedule before/after Booking creation.           |
| **SC-004** | Agency Private Schedule reflects Booking changes without manual Agency edits.             | Create/update/status-change a Booking and inspect Agency Schedule. |
| **SC-005** | Tour Agency cannot update/cancel/confirm a Booking.                                       | Attempt each lifecycle mutation with Agency role.                  |
| **SC-006** | UBND/HDT cannot perform Booking lifecycle actions.                                        | Attempt Booking Detail/lifecycle access using Admin roles.         |
| **SC-007** | Provider cannot complete a Booking through Group Arrival before the scheduled start time; the action button itself is disabled, not just blocked server-side. | Attempt early Group Arrival, and inspect the button's enabled state before start time. |
| **SC-008** | Completed/Cancelled Bookings remain viewable as history but expose no lifecycle actions.  | Open terminal-state Booking Detail.                                |
| **SC-009** | F-SCHED-09 derives availability only from Provider operating hours and Booking blocks; no manual Unavailable/Blackout editing is exposed in this module. | Inspect calculated availability and verify no availability-edit action exists. |
| **SC-010** | Public schedules do not expose another Agency's identity or commercial Booking details.   | Inspect SCH140 using unrelated Agency accounts.                    |
| **SC-011** | Provider's Booking list (F-SCHED-10) shows only its own Bookings, ordered by scheduled start time, with On hold-awaiting-confirmation and arrival-eligible Bookings visibly highlighted. | Apply filters/date range on Booking Management; verify ordering, highlighting, and cross-Provider access denial. |

**9. Assumptions**

- F-SCHED-03 in the final Function List is authoritative over the older direct-Confirmed branch in Usage Flow and Sequence Diagram.

- Booking status and Provider availability are distinct concepts.

- Provider availability can exist without a Booking; On hold and Booked blocks are generated by Booking state.

- Chat negotiation occurs before Booking creation.

- F-SCHED-08 synchronization applies even when the Agency is not actively online; the latest data is visible on next session load.

- Automatic 72-hour expiry requires a scheduled/background process even though the current F-SCHED rows do not define a separate expiry function.

- Schedule and Booking timestamps should use a consistent system time representation; exact storage timezone is not defined in the provided source.


**10. Open questions**

| **\#** | **Question**                                                                                                                                                                     | **Blocking?** | **Owner**   | **Status** | **Answer / Decision**                                                                                                                                                                                                                                                                       |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What is the canonical status after On hold confirmation: **Booked** or **Confirmed**? F-SCHED-05 uses both terms across the module.                                              | **Yes**       | BA          | **Closed** | **Booked** is the canonical lifecycle status. `Confirmed` is legacy wording and must not be used as a separate or preferred Booking status.                                                                                                                                                |
| 2      | Should F-SCHED-05 be rewritten as On hold → Booked, rather than On hold → Confirmed?                                                                                             | **Yes**       | BA          | **Closed** | **Yes.** F-SCHED-05 uses **On hold → Booked**.                                                                                                                                                                                                                                              |
| 3      | Is Completed reachable only through F-SCHED-06 Mark Group Arrival, or can F-SCHED-05 directly set Completed?                                                                     | **Yes**       | BA          | **Closed** | **Completed is only reached through F-SCHED-06 Mark Group Arrival.** F-SCHED-05 must not directly set a Booking to Completed.                                                                                                                                                               |
| 4      | When 72 hours expires without confirmation, is the Booking automatically changed to Cancelled, or is a separate Expired status required?                                         | **Yes**       | BA          | **Closed** | The Booking is automatically changed to **Cancelled**. No separate Expired status is required for MVP.                                                                                                                                                                                      |
| 5      | Should automatic 72-hour expiry trigger F-SCHED-08 schedule/chat synchronization?                                                                                                | **Yes**       | BA / Tech   | **Closed** | **Yes.** Automatic cancellation after 72 hours should trigger the same **schedule and chat synchronization** as a normal Booking cancellation.                                                                                                                                              |
| 6      | Does changing an On hold Booking's date/time reset its 72-hour hold expiry?                                                                                                      | **Yes**       | Client / BA | **Closed** | **No.** Changing date/time does **not** reset `hold_expires_at`; an On hold Booking retains the original 72-hour expiry established at successful creation.                                                                                                                                |
| 7      | Must group_size \<= Experience.max_participants at Booking creation/update?                                                                                                      | **Yes**       | BA          | **Closed** | **Yes.** group_size must not exceed Experience.max_participants at both Booking creation and update.                                                                                                                                                                                        |
| 8      | Is agreed_price total Booking price or per-person price, and what is the currency?                                                                                               | **Yes**       | Client / BA | **Closed** | agreed_price is the **total Booking price for the entire group**, in **VND**.                                                                                                                                                                                                               |
| 9      | Are Booking conditions mandatory fields at Booking creation, or automatically copied from the Experience unless negotiated otherwise?                                            | No            | BA          | **Closed** | Booking conditions are **automatically copied from the selected Experience** at creation. They can be adjusted if both parties negotiate different conditions.                                                                                                                              |
| 10     | Is cancellation reason mandatory whenever a Booking is cancelled?                                                                                                                | No            | Client      | **Closed** | **Yes.** `cancellation_reason` is required when `target_status = Cancelled`; otherwise it is omitted.                                                                                                                                                                                       |
| 11     | Should actual arrived_at time be persisted when Mark Group Arrival is used?                                                                                                      | No            | BA          | **Closed** | **Yes.** The system persists the actual **arrived_at timestamp** when Mark Group Arrival is completed.                                                                                                                                                                                      |
| 12     | Are payment_notes in F-SCHED-07 part of MVP, given payment processing is not otherwise defined?                                                                                  | No            | BA          | **Closed** | **No.** `payment_notes` is not part of the current F-SCHED-07 Function List contract. Payment processing and payment-status tracking remain outside MVP scope.                                                                                                                               |
| 13     | Which Chat session receives F-SCHED-08 auto-messages, and what happens if no Chat exists?                                                                                        | **Yes**       | BA / Tech   | **Closed** | Resolve the target Chat in this order: **(1)** use `source_chat_session_id` when the Booking originated from an Active Chat; **(2)** otherwise use the most recent Active Chat between the same Agency and Local Provider; **(3)** if no Active Chat exists, create a new Active Chat with source = Booking, link it to `booking_id`, and post the system-generated update message there. |
| 14     | Should delivery status really be Seen/Unseen when the current Chat scope does not clearly define read receipts?                                                                  | No            | BA          | **Closed** | **Yes.** Keep `delivery_status = Enum[Seen, Unseen]` to match the current F-SCHED-08 Function List contract.                                                                                                                                                                                |
| 15     | What default date range is used when F-SCHED-01 public schedule receives no date filter?                                                                                         | No            | UI/UX       | **Closed** | `date_from` defaults to the **current date** and `date_to` defaults to **date_from + 29 days**.                                                                                                                                                                                             |
| 16     | Should Unavailable/Blackout periods from F-SCHED-09 appear on the Provider public schedule?                                                                                      | **Yes**       | BA          | **Superseded** | Originally **Yes** — Provider-defined Unavailable/Blackout periods were to be reflected on the public schedule. **Superseded by Open Question #25 (Resolved):** MVP does not support Unavailable/Blackout periods at all, on any screen, so this no longer applies. Kept for history; do not implement. |
| 17     | What is the difference between Unavailable and Blackout?                                                                                                                         | **Yes**       | BA          | **Superseded** | Originally: **Unavailable** = temporary capacity/operational constraint; **Blackout** = predefined non-operating period (holidays, planned closures). **Superseded by Open Question #25 (Resolved):** neither concept is built in MVP; `availability_type` is dropped from the data model. Kept for history; do not implement. |
| 18     | Is operating_hours recurring by weekday or configured per date?                                                                                                                  | **Yes**       | BA          | **Closed** | operating_hours is configured as **recurring weekly hours by weekday**, on `F-PROFILE-04` (Edit Local Provider Profile, PRF module) per Open Question #25 (Resolved). Per-date exceptions (Unavailable/Blackout) are not built in MVP, so there are no exceptions to the weekly pattern.                                                                                                                                               |
| 19     | When an Availability change conflicts with an existing On hold/Booked Booking, should Save be blocked or only warn the Provider?                                                 | **Yes**       | Client / BA | **Superseded** | This requirement is **not defined in the current Schedule/Booking Function List**. F-SCHED-09 is calculation-only and does not validate or save operating-hours edits. Any conflict-on-save rule for F-PROFILE-04 is outside this BKG specification unless separately added to the Profile Management source. |
| 20     | Current Sequence Diagram permits direct creation as Confirmed, conflicting with F-SCHED-03. Should Module 5 Sequence be updated?                                                 | No            | BA          | **Closed** | **Yes.** The final F-SCHED-03 is authoritative: every newly created Booking starts as **On hold**. Direct creation as Confirmed/Booked is not part of the current Function List. The Sequence Diagram must be updated accordingly.                                                         |
| 21     | Current Usage Flow contains decision Initial Booking Action: Hold or Confirm?, conflicting with F-SCHED-03. Should it be replaced by mandatory On hold creation?                 | No            | BA          | **Closed** | **Yes.** The Usage Flow must use mandatory **On hold** creation, followed later by the permitted **On hold → Booked** transition or cancellation.                                                                                                                                            |
| 22     | Screen BKG144 says status can only move forward, while cancellation from Booked is also allowed. Should wording be changed to “only permitted predefined transitions”?           | No            | UI/UX / BA  | **Closed** | **Yes.** Change the wording to **“only permitted predefined transitions”** to allow valid cancellation transitions.                                                                                                                                                                         |
| 23     | Screen BKG137 uses statuses “pending, confirmed, completed, cancelled”, while Function List uses On hold / Booked / Completed / Cancelled. Should Screen terminology be updated? | **Yes**       | UI/UX / BA  | **Closed** | **Yes.** Use **On hold / Booked / Completed / Cancelled** as the canonical status terminology.                                                                                                                                                                                              |
| 24     | Should Public Provider Schedule F-SCHED-01 be viewable directly by Tour Agency as implied by SCH140, even though its Actor column currently says Local Provider only?            | **Yes**       | BA          | **Closed** | **Yes.** F-SCHED-01 is a **public Provider Schedule** and should be viewable by **Tour Agency**. The Actor definition for SCH140 should be updated accordingly.                                                                                                                             |
| 25     | F-SCHED-09 has been redefined as a calculation-only function (derives availability from configured operating hours + active Bookings) and explicitly does **not** provide manual availability editing on `SCH139`. If operating hours / Unavailable / Blackout periods are no longer configured through `SCH139`, which screen (if any) provides that configuration in MVP? | **Yes** | BA | **Resolved** | **Operating hours are configured on `F-PROFILE-04` (Edit Local Provider Profile, PRF module)**, not on any BKG screen. **MVP does not support manually configured Unavailable/Blackout periods at all** — no screen, in this module or any other, provides that editing. `F-SCHED-09` therefore derives availability from exactly two inputs: the Provider's `F-PROFILE-04` operating hours and Booking blocks. This resolution **supersedes** Open Questions #16 and #17 and drops the earlier `availability_type` design from the BKG data model. Open Question #18 defines the recurring weekly pattern; Open Question #19 is superseded because conflict-on-save behavior for Profile operating-hours editing is not defined by the current Schedule/Booking Function List. |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                                                                                              |
|--------------------------------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Schedule / Booking Management**                                                                                                                         |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Local Provider flow: “View Public Schedule” → “Receive Request Quote & Chat” → Booking lifecycle decisions → Auto-Sync → Booking History; Tour Agency flow: “Receive Booking Sync” → “View Private Booking Details”** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 5: Schedule / Booking Management – UC-BOOK-01, UC-BOOK-03, UC-BOOK-04, UC-BOOK-05**                                                                                                                            |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-SCHED-01 .. F-SCHED-10**                                                                                                                                                                                              |
| **7. Screens**                 | Screen List                | **sheet ST, BKG133, BKG134, BKG135, BKG144, BKG136, BKG137, BKG138, SCH139, SCH140, SCH141**                                                                                                                                              |
