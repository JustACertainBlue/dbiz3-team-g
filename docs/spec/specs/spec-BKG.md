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
| DBIZ2 source              | Function List rows **F-SCHED-01 .. F-SCHED-09**; Use Case **UC-BOOK-01 .. UC-BOOK-05**; Screens **BKG133, BKG134, BKG135, BKG144, BKG136, BKG137, BKG138, SCH139, SCH140, SCH141** |

**1. Purpose and scope (mandatory)**

> The Schedule / Booking Management module allows Local Providers to control operational availability and the complete lifecycle of their own bookings after agreement with a Tour Agency. It also provides public Provider schedules and read-only private Agency schedules that stay synchronized with booking changes.

**In scope**

- Display Local Provider public schedule.

- Display Tour Agency private schedule containing only its own bookings.

- Configure Provider availability, operating hours, unavailable periods and blackout dates.

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

- Admin override of Completed or Cancelled Booking states unless explicitly added later.

- Full notification-center functionality.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                          |
|----------------------------------------------------|------------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Enforces booking ownership and role/data scope.                                                      |
| **PRF – Profile Management**                       | Supplies Experience, duration, capacity, pricing defaults and booking conditions.                    |
| **CHAT – In-app Chat**                             | Supplies negotiation context before Booking creation and receives automatic Booking update messages. |
| **EXP / AIT**                                      | May originate Quote/Chat that later results in a Booking.                                            |
| **Background Worker / Scheduler**                  | Handles the 72-hour On hold expiry rule.                                                             |

**2. Actors (mandatory)**

| **Actor**             | **Role in this module**                                                                | **Where it comes from**                |
|-----------------------|----------------------------------------------------------------------------------------|----------------------------------------|
| **Local Provider**    | Primary owner of Booking lifecycle and Provider availability                           | F-SCHED-01, 03–07, 09                  |
| **Tour Agency**       | Views Provider public schedule, own private schedule and own Booking details read-only | F-SCHED-02, F-SCHED-07                 |
| **System**            | Synchronizes schedules and performs automatic Booking-related updates                  | F-SCHED-08                             |
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

## **US-2 (P1): Manage Availability — UC-BOOK-02**

**Journey.** As a Local Provider, I want to configure when I can host Experiences so that Agencies can see realistic availability.

### **Acceptance scenarios**

1.  Given a Local Provider defines operating hours or availability periods, when saved, then the Provider availability calendar is updated.

2.  Given an existing On hold or Booked Booking overlaps the requested availability change, then the conflict is detected.

3.  Given a Provider attempts to manage another Provider's availability, then the action is denied.

4.  Booking-generated On hold and Booked blocks cannot be manually overwritten through Availability Management.

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

1.  Given a Booking is On hold, when the Provider confirms it, then it advances to the confirmed/booked state according to the canonical lifecycle status.

2.  Given an On hold Booking cannot proceed, the Provider may cancel it.

3.  Given a Booked Booking changes in date/time/group size/agreed price/conditions, then details are updated and schedules are synchronized.

4.  Given a Booked Booking reaches the tour start time and the group arrives, when Provider selects Mark Group Arrival, then status becomes Completed.

5.  Given a Booking becomes Cancelled or Completed, then the Booking remains available as history but no longer exposes lifecycle action buttons.

6.  Every create/update/status/arrival event triggers Agency private-schedule synchronization.

7.  Tour Agency sees updated Booking state but cannot change it.

UC-BOOK-05 maps to F-SCHED-04 through F-SCHED-08.

### **Edge cases**

- On hold reaches exactly 72 hours while Provider is confirming it.

- Provider attempts to modify a Completed/Cancelled Booking.

- Two Booking operations try to reserve the same time slot concurrently.

- Provider moves an existing Booking to a conflicting time.

- Agency is offline when Booking changes.

- Chat session referenced for synchronization no longer exists.

- Local Provider attempts Mark Group Arrival before scheduled start time.

- Availability update overlaps a Booking.

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

Note over LP, Database: UC-BOOK-03 - Manage Availability

LP-\>\>Frontend: Open Availability Management

Frontend-\>\>Backend: getAvailability(lpId)

Backend-\>\>Database: getAvailability(lpId)

Database--\>\>Backend: availabilityData

Backend--\>\>Frontend: availabilityData

Frontend--\>\>LP: Display Availability Calendar

LP-\>\>Frontend: Update Available / Unavailable Dates

LP-\>\>Frontend: Save Availability

Frontend-\>\>Backend: saveAvailability(lpId, availabilityData)

Backend-\>\>Database: saveAvailability(lpId, availabilityData)

Database--\>\>Backend: availabilitySaved

Backend--\>\>Frontend: saveSuccess

Frontend--\>\>LP: Display updated Availability Calendar

Note over LP, Database: UC-BOOK-04 - Create Booking

LP-\>\>Frontend: Enter agreed booking details

alt Confirm and Create Booking

LP-\>\>Frontend: Click "Confirm and Create Booking"

Frontend-\>\>Backend: createBooking(bookingData, "Confirmed")

Backend-\>\>Database: saveBooking(bookingData, "Confirmed")

Database--\>\>Backend: bookingConfirmed

Backend-\>\>Database: updateLPSchedule(bookingId)

Database--\>\>Backend: lpScheduleUpdated

Backend-\>\>Database: updateAgencyPrivateSchedule(bookingId)

Database--\>\>Backend: agencyScheduleUpdated

Backend--\>\>Frontend: bookingConfirmed

Frontend--\>\>LP: Display booking status "Confirmed"

else Save as On Hold

LP-\>\>Frontend: Click "Save as On Hold"

Frontend-\>\>Backend: createBooking(bookingData, "On hold")

Backend-\>\>Database: saveBooking(bookingData, "On hold")

Database--\>\>Backend: bookingCreated

Backend-\>\>Database: updateLPSchedule(bookingId)

Database--\>\>Backend: lpScheduleUpdated

Backend-\>\>Database: updateAgencyPrivateSchedule(bookingId)

Database--\>\>Backend: agencyScheduleUpdated

Backend--\>\>Frontend: bookingCreated

Frontend--\>\>LP: Display booking status "On hold"

end

Note over LP, Database: UC-BOOK-05 - Manage Booking

LP-\>\>Frontend: Open Booking

Frontend-\>\>Backend: getBookingDetail(bookingId)

Backend-\>\>Database: getBookingDetail(bookingId)

Database--\>\>Backend: bookingDetail

Backend--\>\>Frontend: bookingDetail

Frontend--\>\>LP: Display Booking Detail

alt Edit Booking

LP-\>\>Frontend: Click "Edit Booking"

Frontend--\>\>LP: Display editable booking fields

LP-\>\>Frontend: Edit booking information

LP-\>\>Frontend: Select status Confirmed / Completed / Cancelled

alt Save Changes

LP-\>\>Frontend: Click "Save Changes"

Frontend-\>\>Backend: updateBooking(bookingId, updatedData)

Backend-\>\>Database: updateBooking(bookingId, updatedData)

Database--\>\>Backend: bookingUpdated

Backend-\>\>Database: updateLPSchedule(bookingId)

Database--\>\>Backend: lpScheduleUpdated

Backend-\>\>Database: updateAgencyPrivateSchedule(bookingId)

Database--\>\>Backend: agencyScheduleUpdated

Backend--\>\>Frontend: updateSuccess

Frontend--\>\>LP: Display updated Booking Detail

else Cancel Changes

LP-\>\>Frontend: Click "Cancel Changes"

Frontend--\>\>LP: Discard changes

Frontend--\>\>LP: Display Booking Detail

end

else Mark Group Arrival

LP-\>\>Frontend: Click "Mark Group Arrival"

Frontend-\>\>Backend: markGroupArrival(bookingId)

Backend-\>\>Database: saveGroupArrival(bookingId)

Database--\>\>Backend: arrivalRecorded

Backend--\>\>Frontend: arrivalRecorded

Frontend--\>\>LP: Display "Group Arrived"

end

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                                                                | **Actor**                    | **Priority** |
|------------|--------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|--------------|
| **FR-001** | F-SCHED-01               | Display the Local Provider's public schedule with permitted availability and Booking block information only.                                     | Local Provider               | Must         |
| **FR-002** | F-SCHED-02               | Display the Tour Agency's private schedule containing only its own Bookings and full permitted details.                                          | Tour Agency                  | Must         |
| **FR-003** | F-SCHED-03               | Allow a Local Provider to create a Booking after negotiation, always with initial status On hold and a 72-hour hold expiry.                      | Local Provider               | Must         |
| **FR-004** | F-SCHED-04               | Allow the Local Provider to update non-status Booking details and synchronize affected schedules.                                                | Local Provider               | Must         |
| **FR-005** | F-SCHED-05               | Allow the Local Provider to perform only permitted Booking status transitions and synchronize resulting schedule changes.                        | Local Provider               | Must         |
| **FR-006** | F-SCHED-06               | Allow the Local Provider to Mark Group Arrival on/after tour start, changing a Booked Booking to Completed.                                      | Local Provider               | Must         |
| **FR-007** | F-SCHED-07               | Display full Booking Detail and actor/status-specific actions for Local Provider and Tour Agency.                                                | Local Provider / Tour Agency | Must         |
| **FR-008** | F-SCHED-08               | Automatically synchronize Booking create/update/status/arrival changes to the Agency Private Schedule and send the corresponding update message. | System                       | Must         |
| **FR-009** | F-SCHED-09               | Allow a Local Provider to configure operational availability and detect conflicts against existing On hold and Booked Bookings.                  | Local Provider               | Must         |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**     | **Type**                                 | **Required** | **Output field(s)**            | **Type**             | **Notes / validation**                                         |
|------------|------------------------|------------------------------------------|--------------|--------------------------------|----------------------|----------------------------------------------------------------|
| **FR-001** | provider_id            | ID                                       | Yes          | calendar_blocks                | Array                | Only Provider's own schedule in current Function List wording. |
|            | date_from              | Date                                     | No           | operating_hours                | Object               | Default range TBD.                                             |
|            | date_to                | Date                                     | No           |                                |                      | Blocks: Available / On hold / Booked.                          |
| **FR-002** | agency_id              | ID                                       | Yes          | bookings                       | Array                | Agency ID from session.                                        |
|            | status                 | Enum                                     | No           |                                |                      | On hold / Booked / Completed / Cancelled.                      |
|            | village_id             | ID                                       | No           |                                |                      | —                                                              |
|            | date_from, date_to     | Date                                     | No           |                                |                      | —                                                              |
| **FR-003** | experience_id          | ID                                       | Yes          | booking_id                     | ID                   | —                                                              |
|            | agency_id              | ID                                       | Yes          | status                         | Enum\["On hold"\]    | Fixed initial status.                                          |
|            | start_at               | DateTime                                 | Yes          | created_at                     | DateTime             | —                                                              |
|            | duration               | Number/TBD unit                          | Yes          | hold_expires_at                | DateTime             | created_at + 72h.                                              |
|            | group_size             | Integer \>0                              | Yes          | public_schedule_block          | Object               | Capacity validation TBD.                                       |
|            | agreed_price           | Decimal                                  | Yes          | private_schedule_synced        | Boolean              | Total/per-person + currency TBD.                               |
|            | booking_conditions     | Object                                   | TBD          |                                |                      | Required vs inherited TBD.                                     |
|            | source_chat_session_id | ID                                       | No           |                                |                      | May pre-fill data.                                             |
| **FR-004** | booking_id             | ID                                       | Yes          | updated_booking                | Object               | At least one editable field required.                          |
|            | start_at               | DateTime                                 | No           | private_schedule_synced        | Boolean              | 72h reset rule on date change TBD.                             |
|            | duration               | Number                                   | No           | public_schedule_updated        | Boolean              | When schedule changes.                                         |
|            | group_size             | Integer \>0                              | No           | agency_notification_message_id | ID                   | —                                                              |
|            | agreed_price           | Decimal                                  | No           | audit_log_id                   | ID                   | —                                                              |
|            | booking_conditions     | Object                                   | No           |                                |                      | —                                                              |
| **FR-005** | booking_id             | ID                                       | Yes          | booking_status                 | Enum                 | Canonical status naming unresolved.                            |
|            | target_status          | Enum                                     | Yes          | status_history_entry           | Object               | Transition must be permitted.                                  |
|            | cancellation_reason    | Text                                     | TBD          | schedules_synced               | Boolean              | Required-on-cancel TBD.                                        |
|            |                        |                                          |              | agency_notification_message_id | ID                   | —                                                              |
| **FR-006** | booking_id             | ID                                       | Yes          | booking_status                 | Enum\["Completed"\]  | Must currently be Booked and start time reached.               |
|            |                        |                                          |              | arrived_at                     | DateTime             | Whether actual arrival is stored TBD.                          |
|            |                        |                                          |              | status_history_entry           | Object               | —                                                              |
|            |                        |                                          |              | private_schedule_synced        | Boolean              | —                                                              |
|            |                        |                                          |              | availability_released          | Boolean              | —                                                              |
| **FR-007** | booking_id             | ID                                       | Yes          | Booking detail fields          | Object               | Requester must belong to Booking.                              |
|            | requester_id           | ID                                       | Yes          | available_actions              | Array                | Agency gets empty action list.                                 |
|            |                        |                                          |              | payment_notes                  | Text                 | Optional; MVP status TBD.                                      |
| **FR-008** | booking_event          | Object                                   | Yes          | private_schedule_updated       | Boolean              | event type = create/update/status_change/mark_arrival          |
|            | agency_id              | ID                                       | Yes          | chat_auto_message_id           | ID                   | Auto-expiry sync event TBD.                                    |
|            |                        |                                          |              | latest_update_at               | DateTime             | —                                                              |
|            |                        |                                          |              | delivery_status                | Enum\[Seen, Unseen\] | —                                                              |
| **FR-009** | provider_id            | ID                                       | Yes          | availability_calendar          | Object               | Provider own scope.                                            |
|            | date_from              | Date                                     | Yes          | available_slots                | Array                | —                                                              |
|            | date_to                | Date                                     | No           | conflicting_booking_ids        | Array                | May be empty.                                                  |
|            | operating_hours        | TBD                                      | No           |                                |                      | Recurring vs per-date TBD.                                     |
|            | availability_type      | Enum\[Available, Unavailable, Blackout\] | Yes          |                                |                      | Difference Unavailable/Blackout TBD.                           |
|            | notes                  | Text                                     | No           |                                |                      | Conflict handling TBD.                                         |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                                       | **Why it exists**                                              |
|-------------|--------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|
| **BR-001**  | Only Local Provider controls Booking lifecycle actions.                                                                        | Preserves the agreed business ownership model.                 |
| **BR-002**  | Tour Agency may view only its own Booking/schedule information and cannot perform lifecycle actions.                           | Protects ownership and prevents Agency-side manipulation.      |
| **BR-003**  | Every newly created Booking starts in On hold.                                                                                 | Provides a consistent Booking entry state.                     |
| **BR-004**  | Initial On hold duration is exactly **72 hours**.                                                                              | Gives the Provider a fixed commitment window.                  |
| **BR-005**  | Creating an On hold Booking immediately blocks the relevant Provider time slot.                                                | Prevents double allocation.                                    |
| **BR-006**  | On hold and Booked schedule blocks originate from Booking records and are not manually edited through availability management. | Keeps schedule state consistent with Bookings.                 |
| **BR-007**  | Booking detail changes and Booking status changes are separate functions.                                                      | Prevents accidental lifecycle modification during field edits. |
| **BR-008**  | Agency Private Schedule is read-only and contains only that Agency's own Bookings.                                             | Protects other Agencies' data.                                 |
| **BR-009**  | Public Provider Schedule must not reveal Agency identity, contact, agreed price or private booking conditions.                 | Protects commercial/private information.                       |
| **BR-010**  | Mark Group Arrival is permitted only for a Booked Booking on or after tour start.                                              | Prevents premature completion.                                 |
| **BR-011**  | Completed and Cancelled are terminal/view-only states.                                                                         | Stabilizes Booking history.                                    |
| **BR-012**  | Every create/update/status/arrival event must synchronize Agency Private Schedule.                                             | Maintains cross-party consistency.                             |
| **BR-013**  | Availability changes must be checked against existing On hold and Booked Bookings.                                             | Prevents operational conflict.                                 |
| **BR-014**  | UBND/HDT/Guest cannot access the operational Booking Detail screen defined by F-SCHED-07.                                      | Separates monitoring from Booking operations.                  |
| **BR-015**  | Booking negotiation precedes Booking creation; Request Quote itself is not a Booking.                                          | Separates commercial discussion from committed reservation.    |

**6. Key entities (mandatory)**

| **Entity**                        | **Attributes from Input/Output**                                                                                                                 | **Relationships**                                         |
|-----------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------|
| **Booking**                       | booking_id, experience_id, agency_id, provider_id, start_at, duration, group_size, agreed_price, conditions, status, created_at, hold_expires_at | belongs to one Agency, Provider and Experience            |
| **Booking Status History**        | from_status, to_status, changed_by, changed_at, reason                                                                                           | has many entries per Booking                              |
| **Public Schedule Block**         | start_at, end_at, status                                                                                                                         | derived from Provider availability/Booking                |
| **Agency Private Schedule Entry** | booking details, status, last_updated_at                                                                                                         | derived from one Booking                                  |
| **Provider Availability**         | date range, operating_hours, availability_type, notes                                                                                            | belongs to one Provider                                   |
| **Availability Conflict**         | Provider, date/time, conflicting_booking_ids                                                                                                     | derived during availability/Booking validation            |
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
| **SC-007** | Provider cannot complete a Booking through Group Arrival before the scheduled start time. | Attempt early Group Arrival.                                       |
| **SC-008** | Completed/Cancelled Bookings remain viewable as history but expose no lifecycle actions.  | Open terminal-state Booking Detail.                                |
| **SC-009** | Provider availability changes cannot silently overlap active On hold/Booked Bookings.     | Attempt conflicting availability update.                           |
| **SC-010** | Public schedules do not expose another Agency's identity or commercial Booking details.   | Inspect SCH140 using unrelated Agency accounts.                    |

**9. Assumptions**

- F-SCHED-03 in the final Function List is authoritative over the older direct-Confirmed branch in Usage Flow and Sequence Diagram.

- Booking status and Provider availability are distinct concepts.

- Provider availability can exist without a Booking; On hold and Booked blocks are generated by Booking state.

- Chat negotiation occurs before Booking creation.

- F-SCHED-08 synchronization applies even when the Agency is not actively online; the latest data is visible on next session load.

- Automatic 72-hour expiry requires a scheduled/background process even though the current F-SCHED rows do not define a separate expiry function.

- Schedule and Booking timestamps should use a consistent system time representation; exact storage timezone is not defined in the provided source.

- Payment notes are not assumed to imply an MVP payment-processing feature.

**10. Open questions**

| **\#** | **Question**                                                                                                                                                                     | **Blocking?** | **Owner**   | **Status** | **Answer / Decision**                                                                                                                                                                                                                                                                       |
|--------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------|------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What is the canonical status after On hold confirmation: **Booked** or **Confirmed**? F-SCHED-05 uses both terms across the module.                                              | **Yes**       | BA          | **Closed** | **Booked and Confirmed are synonymous** and both indicate that the two parties have agreed on the activity, including the **date and time**. **Confirmed is the preferred term** for consistency.                                                                                           |
| 2      | Should F-SCHED-05 be rewritten as On hold → Booked, rather than On hold → Confirmed?                                                                                             | **Yes**       | BA          | **Closed** | **Yes.** F-SCHED-05 should use the transition **On hold → Confirmed**.                                                                                                                                                                                                                      |
| 3      | Is Completed reachable only through F-SCHED-06 Mark Group Arrival, or can F-SCHED-05 directly set Completed?                                                                     | **Yes**       | BA          | **Closed** | **Completed is only reached through F-SCHED-06 Mark Group Arrival.** F-SCHED-05 must not directly set a Booking to Completed.                                                                                                                                                               |
| 4      | When 72 hours expires without confirmation, is the Booking automatically changed to Cancelled, or is a separate Expired status required?                                         | **Yes**       | BA          | **Closed** | The Booking is automatically changed to **Cancelled**. No separate Expired status is required for MVP.                                                                                                                                                                                      |
| 5      | Should automatic 72-hour expiry trigger F-SCHED-08 schedule/chat synchronization?                                                                                                | **Yes**       | BA / Tech   | **Closed** | **Yes.** Automatic cancellation after 72 hours should trigger the same **schedule and chat synchronization** as a normal Booking cancellation.                                                                                                                                              |
| 6      | Does changing an On hold Booking's date/time reset its 72-hour hold expiry?                                                                                                      | **Yes**       | Client / BA | **Closed** | **Yes.** Changing the date/time of an On hold Booking resets the **72-hour confirmation window**, starting from the time the change is saved.                                                                                                                                               |
| 7      | Must group_size \<= Experience.max_participants at Booking creation/update?                                                                                                      | **Yes**       | BA          | **Closed** | **Yes.** group_size must not exceed Experience.max_participants at both Booking creation and update.                                                                                                                                                                                        |
| 8      | Is agreed_price total Booking price or per-person price, and what is the currency?                                                                                               | **Yes**       | Client / BA | **Closed** | agreed_price is the **total Booking price for the entire group**, in **VND**.                                                                                                                                                                                                               |
| 9      | Are Booking conditions mandatory fields at Booking creation, or automatically copied from the Experience unless negotiated otherwise?                                            | No            | BA          | **Closed** | Booking conditions are **automatically copied from the selected Experience** at creation. They can be adjusted if both parties negotiate different conditions.                                                                                                                              |
| 10     | Is cancellation reason mandatory whenever a Booking is cancelled?                                                                                                                | No            | Client      | **Closed** | **No.** A cancellation reason is **not mandatory** when a Booking is cancelled.                                                                                                                                                                                                             |
| 11     | Should actual arrived_at time be persisted when Mark Group Arrival is used?                                                                                                      | No            | BA          | **Closed** | **Yes.** The system persists the actual **arrived_at timestamp** when Mark Group Arrival is completed.                                                                                                                                                                                      |
| 12     | Are payment_notes in F-SCHED-07 part of MVP, given payment processing is not otherwise defined?                                                                                  | No            | BA          | **Closed** | **Yes.** payment_notes remains in MVP as a **free-text note**. No payment processing or transaction tracking is included.                                                                                                                                                                   |
| 13     | Which Chat session receives F-SCHED-08 auto-messages, and what happens if no Chat exists?                                                                                        | **Yes**       | BA / Tech   | **Closed** | Auto-messages are sent to the **Chat session associated with the Booking**. If no Chat session exists, the system **creates one automatically** and posts the system message there.                                                                                                         |
| 14     | Should delivery status really be Seen/Unseen when the current Chat scope does not clearly define read receipts?                                                                  | No            | BA          | **Closed** | **No.** For MVP, use **delivery status only**. Seen/Unseen read receipts are out of scope unless explicitly added later.                                                                                                                                                                    |
| 15     | What default date range is used when F-SCHED-01 public schedule receives no date filter?                                                                                         | No            | UI/UX       | **Closed** | Default to **the current date plus the next 30 days**.                                                                                                                                                                                                                                      |
| 16     | Should Unavailable/Blackout periods from F-SCHED-09 appear on the Provider public schedule?                                                                                      | **Yes**       | BA          | **Closed** | **Yes.** Provider-defined **Unavailable/Blackout periods** must be reflected on the public schedule so Tour Agencies can see when the Provider cannot accept bookings.                                                                                                                      |
| 17     | What is the difference between Unavailable and Blackout?                                                                                                                         | **Yes**       | BA          | **Closed** | **Unavailable** = a specific period when the Provider cannot accept bookings, typically due to temporary capacity/operational constraints. **Blackout** = a predefined blocked period when the Provider does not operate or does not accept bookings, such as holidays or planned closures. |
| 18     | Is operating_hours recurring by weekday or configured per date?                                                                                                                  | **Yes**       | BA          | **Closed** | operating_hours is configured as **recurring weekly hours by weekday**. Specific exceptions are handled through Unavailable/Blackout periods.                                                                                                                                               |
| 19     | When an Availability change conflicts with an existing On hold/Booked Booking, should Save be blocked or only warn the Provider?                                                 | **Yes**       | Client / BA | **Closed** | **Save should be blocked.** The Provider must resolve the conflict before the Availability change can be saved.                                                                                                                                                                             |
| 20     | Current Sequence Diagram permits direct creation as Confirmed, conflicting with F-SCHED-03. Should Module 5 Sequence be updated?                                                 | No            | BA          | **Closed** | **No.** This is a separate valid flow where the Booking can be **created directly as Confirmed** when both parties have already agreed on the activity details.                                                                                                                             |
| 21     | Current Usage Flow contains decision Initial Booking Action: Hold or Confirm?, conflicting with F-SCHED-03. Should it be replaced by mandatory On hold creation?                 | No            | BA          | **Closed** | **No.** The two paths are both valid: one path allows the Booking to be **created directly as Confirmed**, while the other creates it as **On hold** and requires later confirmation.                                                                                                       |
| 22     | Screen BKG144 says status can only move forward, while cancellation from Booked is also allowed. Should wording be changed to “only permitted predefined transitions”?           | No            | UI/UX / BA  | **Closed** | **Yes.** Change the wording to **“only permitted predefined transitions”** to allow valid cancellation transitions.                                                                                                                                                                         |
| 23     | Screen BKG137 uses statuses “pending, confirmed, completed, cancelled”, while Function List uses On hold / Booked / Completed / Cancelled. Should Screen terminology be updated? | **Yes**       | UI/UX / BA  | **Closed** | **Yes.** Use **On hold / Confirmed / Completed / Cancelled** as the canonical status terminology.                                                                                                                                                                                           |
| 24     | Should Public Provider Schedule F-SCHED-01 be viewable directly by Tour Agency as implied by SCH140, even though its Actor column currently says Local Provider only?            | **Yes**       | BA          | **Closed** | **Yes.** F-SCHED-01 is a **public Provider Schedule** and should be viewable by **Tour Agency**. The Actor definition for SCH140 should be updated accordingly.                                                                                                                             |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                                                                                              |
|--------------------------------|----------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Schedule / Booking Management**                                                                                                                         |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Local Provider flow: “View Public Schedule” → “Receive Request Quote & Chat” → Booking lifecycle decisions → Auto-Sync → Booking History; Tour Agency flow: “Receive Booking Sync” → “View Private Booking Details”** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 5: Schedule / Booking Management – UC-BOOK-01, UC-BOOK-03, UC-BOOK-04, UC-BOOK-05**                                                                                                                            |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-SCHED-01 .. F-SCHED-09**                                                                                                                                                                                              |
| **7. Screens**                 | Screen List                | **sheet ST, BKG133, BKG134, BKG135, BKG144, BKG136, BKG137, BKG138, SCH139, SCH140, SCH141**                                                                                                                                              |
