**Spec Document: Admin Dashboard**

| **Field**                 | **Value**                                                                                                                      |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | ADM                                                                                                                            |
| Module name               | Admin Dashboard                                                                                                                |
| Spec version              | v0.1                                                                                                                           |
| Author (team member)      | Group G                                                                                                                        |
| Date                      | 22/09/2026                                                                                                                     |
| Status                    | Clarified                                                                                                                      |
| Approved by (Client role) |                                                                                                                                |
| DBIZ2 source              | Function List rows **F-ADMIN-01 .. F-ADMIN-10**; Use Case **UC-ADM-01**; Screen ADM095, ADM117, ADM118, VER146, VER119, ADM079 |

**1. Purpose and scope (mandatory)**

> The Admin Dashboard provides HDT and UBND administrators with summarized operational information about Agencies, Local Providers, Bookings and Agency–Provider collaboration within their authorized data scope. It supports role-based monitoring through metric cards, charts and filters without granting Booking lifecycle control or profile-edit authority.

**In scope**

- Display role-specific Admin Dashboard.

- Load dashboard metrics according to Admin scope.

- Show summary metric cards.

- Filter metrics by time period.

- Filter metrics by village.

- Filter lists by Agency and/or Local Provider.

- View Agency metrics.

- View Local Provider metrics.

- View Booking metrics.

- View Agency–Provider collaboration metrics.

**Out of scope**

- Creating, updating, confirming, cancelling or completing Bookings.

- Editing Agency or Local Provider profile content.

- Creating or managing user accounts; this belongs to Authentication, Access & User Management.

- Verifying Agency registration or Local Provider profile.

- Editing Experience content.

- Direct drill-down entity management unless separately defined by another module.

- Global system configuration.

- Ranking/AI analytics from Explore or AI Matching.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                       |
|----------------------------------------------------|-----------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Provides HDT/UBND role and authorized data scope.                                 |
| **PRF – Profile Management**                       | Supplies Agency and Provider profile/status information used by metrics.          |
| **BKG – Schedule / Booking Management**            | Supplies Booking status, Booking records and Booking-based activity data.         |
| **CHAT – In-app Chat**                             | May contribute to Provider activity metrics where Chat interactions are included. |

**2. Actors (mandatory)**

| **Actor**               | **Role in this module**                                                                                         | **Where it comes from** |
|-------------------------|-----------------------------------------------------------------------------------------------------------------|-------------------------|
| **HDT Admin**           | Views platform-wide dashboard metrics and may select any village, Agency or Provider permitted by the dashboard | F-ADMIN-01–10           |
| **UBND Admin**          | Views dashboard metrics restricted to its assigned village                                                      | F-ADMIN-01–10           |
| **System**              | Loads, aggregates, filters, calculates and presents dashboard metrics                                           | F-ADMIN-01–03           |
| **Authentication/RBAC** | Supplies role and assigned-village scope used by dashboard filtering                                            | F-AUTH-15/16            |

**3. User scenarios and acceptance criteria (mandatory)**

Because the final Use Case contains only **one Admin Dashboard use case**, the dashboard capabilities are covered under one main user scenario.

## **US-1 (P1): View Admin Dashboard — UC-ADM-01**

**Journey.** As an HDT or UBND Admin, I want to view operational metrics within my permitted scope so that I can monitor platform or village activity.

### **Acceptance scenarios**

1.  Given an HDT Admin opens the Dashboard, when data loads, then platform-wide permitted metrics and controls are displayed.

2.  Given an UBND Admin opens the Dashboard, when data loads, then metrics are restricted to the Admin's assigned village.

3.  Given an UBND Admin views the village filter, then the assigned village is pre-selected and cannot be changed.

4.  Given an HDT Admin applies a village filter, then Provider, Booking and collaboration metrics are recalculated for that village.

5.  Given a time filter is applied, then all applicable metric cards/charts/lists refresh for that period.

6.  Given an Agency or Provider filter is applied, then the relevant Booking and collaboration lists are filtered accordingly.

7.  Agency metrics display registration/status information and Agency activity within the permitted scope.

8.  Provider metrics display Provider status, verification and activity information within the permitted scope.

9.  Booking metrics display status counts, trends and permitted Booking list records.

10. Collaboration metrics display Agency–Provider collaboration frequency within the permitted scope.

11. Dashboard monitoring must not allow HDT or UBND to manipulate Booking lifecycle or profile content.

UC-ADM-01 maps to all F-ADMIN functions.

### **Edge cases**

- No records exist for the selected time period.

- UBND has no Booking activity in its assigned village.

- A selected Agency has no collaboration with the selected Provider.

- An HDT-selected village has no Providers.

- Previous-period data does not exist, so a trend percentage cannot be calculated.

- One or more metric sources return no data.

- Filter combinations produce an empty result.

- An Admin's village assignment changes while the Dashboard is open.

- Booking/account status values change while aggregated metrics are being calculated.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> A_Start(\["0. Start: Admin (HDT & UBND)"\])
>
> A1\["1. Access Dashboard Overview"\]
>
> A2{"2. Data Scope Check\n(System automated)"}
>
> A3\["3a. Load Platform-wide Data\n(HDT)"\]
>
> A4\["3b. Load Assigned Village Data\n(UBND)"\]
>
> A5\["4. View Overview Metric Cards"\]
>
> A6\[/"5. Apply Filters (Time, Village, Org)"/\]
>
> A_End(\["8. End"\])
>
> A_Start --\> A1 --\> A2
>
> A2 -- "Role: HDT" --\> A3 --\> A5
>
> A2 -- "Role: UBND" --\> A4 --\> A5
>
> A5 --\> A6 --\> A_End
>
> class A_Start,A_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 6: Admin Dashboard

actor Admin

participant Frontend

participant Backend

participant Database

Note over Admin, Database: UC-ADM-01: View Dashboard

Admin-\>\>Frontend: Open Admin Dashboard

activate Admin

activate Frontend

Frontend-\>\>Backend: getDashboardOverview()

activate Backend

Backend-\>\>Database: getDashboardOverview()

activate Database

Database--\>\>Backend: dashboardOverview

deactivate Database

Backend--\>\>Frontend: dashboardOverview

Frontend--\>\>Admin: Display Dashboard Overview

deactivate Backend

deactivate Frontend

deactivate Admin

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                              | **Actor**        | **Priority** |
|------------|--------------------------|------------------------------------------------------------------------------------------------|------------------|--------------|
| **FR-001** | F-ADMIN-01               | Display the Admin Dashboard using a role-specific layout and scope for HDT and UBND.           | System           | Must         |
| **FR-002** | F-ADMIN-02               | Load and aggregate Dashboard metrics according to role, scope and active filters.              | System           | Must         |
| **FR-003** | F-ADMIN-03               | Display summary metric cards for Agencies, Providers, Bookings and active collaborations.      | System           | Must         |
| **FR-004** | F-ADMIN-04               | Apply a time-period filter across applicable Dashboard metrics.                                | HDT / UBND Admin | Should       |
| **FR-005** | F-ADMIN-05               | Allow HDT to filter by village while keeping UBND fixed to its assigned village.               | HDT / UBND Admin | Must         |
| **FR-006** | F-ADMIN-06               | Filter Dashboard lists by permitted Agency and/or Provider selections.                         | HDT / UBND Admin | Should       |
| **FR-007** | F-ADMIN-07               | Display Agency registration/status and activity metrics within the Admin's permitted scope.    | HDT / UBND Admin | Must         |
| **FR-008** | F-ADMIN-08               | Display Provider status, verification and activity metrics within the Admin's permitted scope. | HDT / UBND Admin | Must         |
| **FR-009** | F-ADMIN-09               | Display Booking status, trend and Booking-list metrics within the Admin's permitted scope.     | HDT / UBND Admin | Must         |
| **FR-010** | F-ADMIN-10               | Display Agency–Provider collaboration-frequency metrics within the Admin's permitted scope.    | HDT / UBND Admin | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**         | **Type**            | **Required** | **Output field(s)**   | **Type**                   | **Notes / validation**                               |
|------------|----------------------------|---------------------|--------------|-----------------------|----------------------------|------------------------------------------------------|
| **FR-001** | role                       | Enum\[HDT, UBND\]   | Yes          | dashboard_view        | UI View                    | Layout/scope depends on role.                        |
|            | assigned_village_id        | ID                  | No           |                       |                            | Required for UBND context.                           |
| **FR-002** | role                       | Enum\[HDT, UBND\]   | Yes          | metrics               | Object                     | Aggregated by role/scope.                            |
|            | assigned_village_id        | ID                  | No           |                       |                            | UBND only.                                           |
|            | date_from, date_to         | Date                | No           |                       |                            | Default last 30 days.                                |
|            | village_id                 | ID                  | No           |                       |                            | HDT may choose; UBND fixed.                          |
|            | agency_id                  | ID                  | No           |                       |                            | Optional filter.                                     |
|            | provider_id                | ID                  | No           |                       |                            | Optional filter.                                     |
| **FR-003** | metrics                    | Object              | Yes          | metric_cards          | Array                      | Trend optional when no previous period.              |
|            |                            |                     |              | label                 | String                     | —                                                    |
|            |                            |                     |              | value                 | Integer                    | —                                                    |
|            |                            |                     |              | trend_pct             | Decimal                    | Optional.                                            |
|            |                            |                     |              | trend_direction       | Enum\[Up, Down, Flat\]     | Optional.                                            |
|            |                            |                     |              | sub_label             | String                     | —                                                    |
| **FR-004** | period_preset              | Enum                | Yes          | filtered_metrics      | Object                     | Default Last 30 days.                                |
|            | start_date, end_date       | Date                | No           |                       |                            | Required for Custom range.                           |
| **FR-005** | village_id                 | ID                  | No           | filtered_metrics      | Object                     | null = All Villages for HDT; fixed village for UBND. |
|            | time_filter                | Object              | Yes          |                       |                            | —                                                    |
| **FR-006** | agency_id                  | ID                  | No           | filtered_lists        | Object                     | Includes Booking list and collaboration pairs.       |
|            | provider_id                | ID                  | No           |                       |                            | Combination rule TBD.                                |
|            | search_query               | String              | No           |                       |                            | Used for autocomplete.                               |
| **FR-007** | agency_status_breakdown    | Map\<Enum,Integer\> | Yes          | status_chart_data     | Array                      | Agency status set needs clarification.               |
|            | activity_data              | Array               | Yes          | activity_distribution | Array                      | Active-Agency definition TBD.                        |
|            |                            |                     |              | active_agency_count   | Integer                    | —                                                    |
|            |                            |                     |              | trend_pct             | Decimal                    | Optional.                                            |
| **FR-008** | provider_status_by_village | Array               | Yes          | status_village_matrix | Array                      | Includes account + verification state.               |
|            | activity_data              | Array               | Yes          | activity_distribution | Array                      | Capacity grouping TBD.                               |
|            |                            |                     |              | active_provider_count | Integer                    | —                                                    |
|            |                            |                     |              | booking_count         | Integer                    | —                                                    |
| **FR-009** | status_counts              | Map\<Enum,Integer\> | Yes          | status_chart_data     | Array                      | Statuses: On hold / Booked / Completed / Cancelled.  |
|            | time_series                | Array               | Yes          | trend_chart_data      | Array                      | Granularity rule TBD.                                |
|            | booking_records            | Array               | Yes          | booking_table         | Array                      | Date, Agency, Provider, Experience, Status, Price.   |
| **FR-010** | collaboration_data         | Array               | Yes          | top_pairs             | Array                      | Which Booking statuses count as collaboration TBD.   |
|            |                            |                     |              | sort_by               | Enum\[Frequency, Recency\] | —                                                    |
|            |                            |                     |              | visualization_type    | TBD                        | Heatmap / network / ranked list not yet chosen.      |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                             | **Why it exists**                                                              |
|-------------|----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **BR-001**  | HDT Dashboard scope is platform-wide.                                                                                | Reflects HDT's platform administration role.                                   |
| **BR-002**  | UBND Dashboard scope is limited to its assigned village.                                                             | Enforces administrative data scope.                                            |
| **BR-003**  | UBND's village filter is fixed to the assigned village and cannot be changed.                                        | Prevents cross-village monitoring.                                             |
| **BR-004**  | HDT may select one village or All Villages where the metric supports village filtering.                              | Supports platform-wide and local comparison.                                   |
| **BR-005**  | Dashboard metrics must respect the active time, village, Agency and Provider filters.                                | Keeps cards/charts/lists consistent.                                           |
| **BR-006**  | Dashboard access is monitoring/read-only with respect to profile and Booking lifecycle data.                         | Prevents analytics screens becoming operational-control screens.               |
| **BR-007**  | Booking metrics use the canonical Booking statuses defined by the Booking module.                                    | Maintains cross-module consistency.                                            |
| **BR-008**  | UBND Agency metrics include only Agencies relevant to/interacting with the UBND's assigned village.                  | Maintains local scope.                                                         |
| **BR-009**  | UBND Provider metrics include only Providers in the assigned village.                                                | Maintains local scope.                                                         |
| **BR-010**  | UBND Booking and collaboration metrics include only records associated with its assigned village.                    | Prevents cross-village exposure.                                               |
| **BR-011**  | Trend percentages may be omitted when a valid comparison period does not exist.                                      | Prevents misleading trend values.                                              |
| **BR-012**  | Dashboard metric rows/cards do not imply entity drill-down unless a separate screen/function explicitly supports it. | Prevents introducing F-ADMIN-11/12 functionality that is not in current scope. |
| **BR-013**  | Dashboard does not grant HDT/UBND access to F-SCHED-07 operational Booking Detail.                                   | Separates monitoring from Booking operations.                                  |

**6. Key entities (mandatory)**

| **Entity**                            | **Attributes from Input/Output**                                                  | **Relationships**               |
|---------------------------------------|-----------------------------------------------------------------------------------|---------------------------------|
| **Dashboard View**                    | role, assigned_village_id, layout                                                 | belongs to Admin session        |
| **Dashboard Filter**                  | time period, village_id, agency_id, provider_id                                   | applied to Dashboard metrics    |
| **Metric Card**                       | label, value, trend_pct, trend_direction, sub_label                               | derived from aggregated metrics |
| **Agency Metric**                     | status, activity distribution, active count, trend                                | aggregates Agency records       |
| **Provider Metric**                   | village, account status, verification status, craft type, capacity, booking count | aggregates Provider records     |
| **Booking Metric**                    | Booking status, count, percentage, time-series values                             | aggregates Booking records      |
| **Booking Monitoring Record**         | date, Agency, Provider, Experience, status, price                                 | belongs to Booking metric list  |
| **Collaboration Pair**                | agency_id, provider_id, booking_count, last_date                                  | links Agency and Provider       |
| **Algorithm-independent Time Series** | period_start, count/value                                                         | supports metric trend charts    |

**7. Screens involved**

| **Screen ID** | **Screen name**          | **Priority** | **Screen Spec file**          |
|---------------|--------------------------|--------------|-------------------------------|
| **ADM095**    | User Management          | Must         | screens/screen-spec-ADM095.md |
| **ADM117**    | Create Account           | Must         | screens/screen-spec-ADM117.md |
| **ADM118**    | View Account Information | Must         | screens/screen-spec-ADM118.md |
| **VER146**    | View Submitted Profile   | Must         | screens/screen-spec-VER146.md |
| **VER119**    | Account Information      | Must         | screens/screen-spec-VER119.md |
| **ADM079**    | Admin Dashboard          | Must         | screens/screen-spec-ADM079.md |

ADM079 is the primary Admin Dashboard screen. ADM095, ADM117, ADM118, VER146 and VER119 are related Admin screens involved in the broader Admin journey but their account-management and verification behaviors are specified under the Authentication / Profile Management modules.

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                 | **How it is measured**                                                                   |
|------------|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------|
| **SC-001** | HDT sees platform-wide metrics while UBND sees only assigned-village data.                    | Compare the same Dashboard using HDT and UBND accounts.                                  |
| **SC-002** | UBND cannot change its village scope.                                                         | Attempt to select another village from an UBND account.                                  |
| **SC-003** | HDT can switch between All Villages and a selected village.                                   | Apply village filters and compare resulting metrics.                                     |
| **SC-004** | Changing the time period updates all applicable Dashboard metrics consistently.               | Compare cards/charts/lists before and after filter change.                               |
| **SC-005** | Booking status counts equal the records shown for the same scope/filter set.                  | Reconcile summary counts with Booking source data.                                       |
| **SC-006** | Agency/Provider filters return only records matching the selected entities and Admin scope.   | Apply filters against controlled test data.                                              |
| **SC-007** | UBND never receives Provider/Booking/collaboration records outside its assigned village.      | Test with cross-village data.                                                            |
| **SC-008** | Dashboard actions cannot change Booking lifecycle or profile content.                         | Attempt operational mutations from Dashboard context.                                    |
| **SC-009** | Metrics with no valid previous comparison period do not show fabricated trend values.         | Test a first/empty comparison period.                                                    |
| **SC-010** | Collaboration ranking reflects only records that satisfy the agreed collaboration definition. | Compare collaboration output against known source records after definition is finalized. |

**9. Assumptions**

- ADM079 is the single main screen for all F-ADMIN-01–10 dashboard capabilities.

- HDT and UBND use the same Dashboard screen with role-specific layout and data scope.

- Dashboard metrics are read-only analytics outputs.

- Admin Booking monitoring does not reuse the operational Booking Detail screen F-SCHED-07.

- A missing previous comparison period results in no trend rather than an assumed 0%.

- F-ADMIN-03 references drill-down behavior in older wording, but drill-down/entity-detail functionality is not treated as part of this module because no F-ADMIN-11/12 exists.

- The current Admin Sequence Diagram only represents initial dashboard loading.

- The current Usage Flow is broader than this module and includes Account Management/Profile/Booking monitoring steps belonging partly to other modules.

- ADM095, ADM117, ADM118, VER146 and VER119 are included as related screens in the Admin journey, but their account-management and verification business logic remains owned by Authentication / Profile Management rather than F-ADMIN-01 .. F-ADMIN-10.

**10. Open questions**

| **\#** | **Question**                                                                                                                                                                   | **Blocking?** | **Owner**  | **Status** | **Answer/Question**                                                                                                                                         |
|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|------------|------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What exactly defines an **Active Agency** in F-ADMIN-03/F-ADMIN-07?                                                                                                            | **Yes**       | BA         | Closed     | An Agency that has at least one Booking (any status) or active Chat within the selected time period.                                                        |
| 2      | F-ADMIN-07 uses Agency statuses Pending, Approved, Active, Disabled, but Authentication uses Pending Approval, Approved, Rejected, Disabled. Which status set is canonical?    | **Yes**       | BA         | Closed     | The Authentication set is canonical: Pending Approval, Approved, Rejected, Disabled.                                                                        |
| 3      | Should Rejected Agencies appear in Agency metrics?                                                                                                                             | **Yes**       | BA         | Closed     | No. Exclude Rejected Agencies from standard activity/performance metrics.                                                                                   |
| 4      | Does “Active Agency” mean account status or recent Booking/interaction activity?                                                                                               | **Yes**       | BA         | Closed     | It refers to recent interaction activity (Bookings/Chats), not just the account status.                                                                     |
| 5      | Provider metrics mention verified vs unverified, while Profile Management uses Pending Verification / Verified / Revision Required. Which categories should Dashboard display? | **Yes**       | BA         | Closed     | Use the Profile Management set: Pending Verification, Verified, and Revision Required.                                                                      |
| 6      | How should Provider capacity be grouped in activity distribution?                                                                                                              | No            | BA         | Closed     | Small (1-10 pax), Medium (11-30 pax), and Large (31+ pax).                                                                                                  |
| 7      | Can Agency and Provider filters be applied simultaneously in F-ADMIN-06?                                                                                                       | No            | BA / UI    | Closed     | No. The Role filter is a single-select dropdown. Users can filter by either **Tour Agency** or **Local Provider**, but cannot select both at the same time. |
| 8      | How are autocomplete results scoped for UBND Agency/Provider filters?                                                                                                          | No            | BA         | Closed     | Scoped strictly to Providers within the assigned village and Agencies that have historically interacted with them.                                          |
| 9      | For Booking trend charts, is daily/weekly/monthly granularity user-selected or derived automatically from date range?                                                          | No            | UI/UX / BA | Closed     | Derived automatically based on the length of the selected date range.                                                                                       |
| 10     | Which Booking statuses count as an Agency–Provider **collaboration** in F-ADMIN-10?                                                                                            | **Yes**       | BA         | Closed     | “Completed” status                                                                                                                                          |
| 11     | Is a Quote/Chat without a Booking considered a collaboration?                                                                                                                  | **Yes**       | BA         | Closed     | No. Only actual Bookings count as a collaboration for these metrics.                                                                                        |
| 12     | Should F-ADMIN-10 show top 10, top 20, or a configurable number of pairs?                                                                                                      | No            | UI/UX      | Closed     | Top 10 pairs.                                                                                                                                               |
| 13     | Which visualization is used for Collaboration Metrics in MVP: heatmap, network graph or ranked list?                                                                           | No            | UI/UX      | Closed     | Ranked list (simplest and most effective for MVP).                                                                                                          |
| 14     | F-ADMIN-03 and F-ADMIN-07 mention clickable/drill-down rows while entity drill-down is outside current F-ADMIN scope. Should clickability be removed?                          | **Yes**       | BA / UI    | Closed     | Yes, remove clickability. Entity drill-down is out of scope for the MVP dashboard.                                                                          |
| 15     | Does F-ADMIN-09 Booking list open a read-only monitoring summary, remain non-clickable, or link to another existing screen?                                                    | **Yes**       | BA / UI    | Closed     | Remain non-clickable. It acts strictly as a read-only monitoring summary list.                                                                              |
| 16     | What exactly qualifies as “account activity” mentioned in ADM079 Screen Overview?                                                                                              | No            | BA         | Closed     | Logins, profile updates, and booking/chat initiations.                                                                                                      |
| 17     | F-ADMIN-02 defaults to Last 30 days. Are all-time counts in F-ADMIN-03 exempt from that filter, or should every card respect the period?                                       | **Yes**       | BA         | Closed     | Every card must respect the selected time period filter to ensure data consistency across the dashboard.                                                    |
| 18     | How is “Active Collaborations” on the metric card defined?                                                                                                                     | **Yes**       | BA         | Closed     | The number of unique Agency-Provider pairs that have at least one "Booked" or "Completed" status in the period.                                             |
| 19     | Should Provider activity count Chat interactions, Bookings, or both? F-ADMIN-08 mentions both.                                                                                 | **Yes**       | BA         | Closed     | Both, but they should be counted and displayed as separate data points.                                                                                     |
| 20     | Should the Module 6 Sequence Diagram be expanded to include filters and F-ADMIN-07–10 metric retrieval?                                                                        | No            | BA         | Closed     | No. Treat filter updates and metric retrieval as standard background data fetches and document them via text to avoid cluttering the sequence diagram.      |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                   |
|--------------------------------|----------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Admin Dashboard**                                                            |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Admin flow: “View Admin Dashboard” → “Role == HDT?” → Admin actions → “View all Profiles (Read-only Mode)” → “View all Booking Statuses”** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 6: Admin Dashboard – UC-ADM-01 View Dashboard**                                                                                     |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-ADMIN-01 .. F-ADMIN-10**                                                                                                                   |
| **7. Screens**                 | Screen List                | sheet ST, ADM095, ADM117, ADM118, VER146, VER119, ADM079                                                                                                       |
