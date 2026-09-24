**Spec Document: Explore**

| **Field**                 | **Value**                                                                                                                                                    |
|---------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | EXP                                                                                                                                                          |
| Module name               | Explore                                                                                                                                                      |
| Spec version              | v0.1                                                                                                                                                         |
| Author (team member)      | Group G                                                                                                                                                      |
| Date                      | 22/09/2026                                                                                                                                                   |
| Status                    | Clarified                                                                                                                                                    |
| Approved by (Client role) |                                                                                                                                                              |
| DBIZ2 source              | Function List rows **F-EXPLORE-01 .. F-EXPLORE-17**; Use Case **UC-DIS-01 .. UC-DIS-04**; Screens **EXP017, EXP120, DSC122, DSC123, DSC033, DSC124, COM048** |

**1. Purpose and scope (mandatory)**

> The Explore module allows Guests and Tour Agencies to discover verified Local Providers and Experiences through browsable cards and detail views. For Tour Agencies, the module additionally learns from browsing behavior to personalize Experience ranking and evaluates aggregate ranking performance for future optimization.

**In scope**

- Display public and authenticated Explore pages.

- Display Experience/Activity cards and quick previews.

- Display Provider and Experience detail information according to user role.

- Display related Experiences and alternative Provider suggestions.

- Record Tour Agency browsing and interaction behavior.

- Track detail-page engagement.

- Record strong interest signals such as Request Quote and Chat.

- Analyze session behavior.

- Update Agency Experience Preference weights.

- Re-rank Experiences within the current Agency session.

- Initiate Request Quote and Chat from Explore.

- Aggregate Explore usage metrics.

- Evaluate ranking quality.

- Define ranking optimization scenarios and KPIs.

- Measure ranking performance.

- Tune ranking parameters based on KPI feedback.

**Out of scope**

- Creating or editing Local Provider or Experience content.

- Provider profile verification.

- AI Tour Matching conversation logic.

- Booking creation or lifecycle management.

- Chat message lifecycle itself.

- User authentication/account management.

- Guest use of Request Quote or Chat.

- Agency creation of bookings directly from Explore.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                       |
|----------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Checks permission for protected actions and redirects Guests to Login.                            |
| **PRF – Profile Management**                       | Supplies verified Provider/Experience content, pricing, images, capacity and booking information. |
| **AIT – AI Tour Matching**                         | May provide Agency Preference Profile and updated preference signals used for personalization.    |
| **CHAT – In-app Chat**                             | Receives Chat and Request Quote handoff from Explore.                                             |
| **Schedule / Booking**                             | Supplies public availability information displayed on Experience detail.                          |

**2. Actors (mandatory)**

| **Actor**                  | **Role in this module**                                                                                                     | **Where it comes from** |
|----------------------------|-----------------------------------------------------------------------------------------------------------------------------|-------------------------|
| **Tour Agency**            | Main authenticated Explore user; browses full content and uses protected actions                                            | F-EXPLORE-01–04         |
| **Guest**                  | Browses publicly permitted Explore and detail information without Quote/Chat actions                                        | F-EXPLORE-01–04         |
| **System**                 | Records activity, analyzes behavior, updates preference weights, re-ranks content and evaluates algorithm performance       | F-EXPLORE-05–17         |
| **Local Provider**         | Appears as the Provider whose profile/Experience is being viewed; final Use Case also lists LP as an actor for detail views | UC-DIS-03/04            |
| **HDT Admin / UBND Admin** | May view Provider/Experience information according to Use Case scope                                                        | UC-DIS-03/04            |
| **Chat module**            | Receives the conversation handoff from Chat/Request Quote actions                                                           | F-EXPLORE-11/12         |

**3. User scenarios and acceptance criteria (mandatory)**

## **US-1 (P1): Browse Explore — UC-DIS-01**

**Journey.** As a Guest or Tour Agency, I want to browse verified Experiences so that I can discover suitable craft and cultural activities.

### **Acceptance scenarios**

1.  Given the user opens Explore, when content loads, then verified Experience cards are displayed with pagination.

2.  Given a Tour Agency is authenticated, then full permitted actions are available.

3.  Given a Guest browses Explore, then public content is visible but protected actions such as Request Quote and Chat require Login.

4.  Given an Agency Preference Profile exists, it may be used when ordering initial Explore results.

5.  Given no Experience is available, the Explore page displays a valid empty state rather than failing.

UC-DIS-01 maps to F-EXPLORE-01 and F-EXPLORE-02.

## **US-2 (P2): Explore Experiences with Personalization — UC-DIS-02**

**Journey.** As a Tour Agency, I want Explore to learn from my browsing behavior so that relevant Experiences appear higher during my session.

### **Acceptance scenarios**

1.  Given an Agency browses Experience cards, when it clicks, expands previews, views details, filters or scrolls, then those interactions are logged.

2.  Given an Agency visits an Experience detail page, then visit duration and defined engagement signals are recorded.

3.  Given an Agency selects Quote or Chat, then the action is stored as a stronger preference signal.

4.  Given sufficient session signals exist, when session behavior is analyzed, then a session preference pattern is produced.

5.  Given the Agency preference changes, then current Explore results are re-ranked using the updated preference weights.

6.  The personalized re-ranking affects that Agency's results and does not automatically change another Agency's preference profile.

7.  Aggregate metrics are periodically evaluated to assess and improve Explore ranking performance.

UC-DIS-02 maps to F-EXPLORE-05–10 and F-EXPLORE-13–17.

## **US-3 (P1): View Provider — UC-DIS-03**

**Journey.** As a Tour Agency, I want to view information about a Local Provider so that I can evaluate the Provider behind an Experience.

### **Acceptance scenarios**

1.  Given an Agency selects a Provider, when the Provider information loads, then permitted Provider information and related Experiences are displayed.

2.  Given a Guest views Provider information, then restricted commercial/contact information is not exposed.

3.  Given an authenticated actor has broader visibility rights, then its permitted information is displayed according to access scope.

4.  Viewing Provider information must not grant editing permission.

The final Use Case maps UC-DIS-03 to F-EXPLORE-03.

## **US-4 (P1): View Experience — UC-DIS-04**

**Journey.** As a Tour Agency, I want to view Experience details and related options so that I can decide whether to continue with the Provider.

### **Acceptance scenarios**

1.  Given a Tour Agency opens an Experience detail page, then full permitted Experience information, pricing, operational information and Provider contact information are displayed.

2.  Given a Guest opens public Experience detail, then public Experience information is displayed while protected commercial/contact information remains hidden.

3.  Related Experiences may be displayed from the same Provider, similar activity type or nearby locations.

4.  Given a Tour Agency chooses Chat, permission is checked before the Provider conversation opens.

5.  Given a Guest attempts Chat or another protected action, then Login is required.

UC-DIS-04 maps to F-EXPLORE-03, F-EXPLORE-04 and F-EXPLORE-12.

### **Edge cases**

- No Experiences are available.

- Experience referenced by a card has been deleted or unpublished.

- Agency Preference Profile does not yet exist.

- User exits detail page before engagement timer completes.

- Duplicate events are sent for the same interaction.

- Chat service is unavailable.

- Request Quote has already been created for the same Experience.

- Ranking algorithm receives insufficient behavior data.

- KPI calculations run before enough sessions exist.

- New ranking parameters reduce performance compared with the previous version.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> subgraph Guest_Explore \["Actor: Guest (Unauthenticated)"\]
>
> G_Start(\["0. Start: Guest"\])
>
> G1\["1. Access Public Explore Page"\]
>
> G2\["2. View Basic Experience Cards"\]
>
> G3\["3. Click Detail Page\n(Prices/Contacts Hidden)"\]
>
> G4{"4. Attempt Quote/Chat?"}
>
> G5\["5. Block & Redirect to Login"\]
>
> G_End(\["6. End"\])
>
> G_Start --\> G1 --\> G2 --\> G3 --\> G4
>
> G4 -- "Yes" --\> G5 --\> G_End
>
> G4 -- "No" --\> G_End
>
> end
>
> subgraph Agency_Explore \["Actor: Tour Agency (Authenticated)"\]
>
> A_Start(\["0. Start: Tour Agency"\])
>
> A1\["1. Access Personalized Explore Page\n(Re-ranked by AI)"\]
>
> A2\["2. View Full Detail Page\n(Prices, Maps, Schedules visible)"\]
>
> A3{"3. Switch/Case:\nAction?"}
>
> A4\["4a. Request Quote"\]
>
> A5\["4b. Start Chat"\]
>
> A_End(\["5. End"\])
>
> A_Start --\> A1 --\> A2 --\> A3
>
> A3 -- "Quote" --\> A4 --\> A_End
>
> A3 -- "Chat" --\> A5 --\> A_End
>
> end
>
> class G_Start,G_End,A_Start,A_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 4: Explore

actor Agency as Tour Agency

participant Frontend

participant Backend

participant Database

Note over Agency, Database: UC-DIS-01: Browse Explore

Frontend-\>\>Backend: getExploreContent(agencyId)

Backend-\>\>Database: getVerifiedLPsAndExperiences()

Database--\>\>Backend: verifiedLPs

Backend--\>\>Frontend: exploreLPs

Frontend--\>\>Agency: Display Explore Page with LP / Experience cards

Agency-\>\>Frontend: Browse Explore LPs

Agency-\>\>Frontend: Select LP / Experience

Frontend-\>\>Backend: getLPExperienceDetails(lpId)

Backend-\>\>Database: getVerifiedLPProfile(lpId)

Database--\>\>Backend: profileData

Backend--\>\>Frontend: profileData

Frontend--\>\>Agency: Display LP / Experience details

Note over Agency, Database: UC-DIS-03: View Provider

Agency-\>\>Frontend: Select Provider

Frontend-\>\>Backend: getProviderProfile(providerId)

Backend-\>\>Database: getProviderProfile(providerId)

Database--\>\>Backend: providerProfile

Backend--\>\>Frontend: providerProfile

Frontend--\>\>Agency: Display Provider Profile

Note over Agency, Database: UC-DIS-04: View Experience

Agency-\>\>Frontend: Select Experience

Frontend-\>\>Backend: getExperienceDetails(experienceId)

Backend-\>\>Database: getExperienceDetails(experienceId)

Database--\>\>Backend: experienceDetails

Backend--\>\>Frontend: experienceDetails

Frontend--\>\>Agency: Display Experience Details

Note over Agency, Database: UC-DIS-02: Explore Experiences

Frontend-\>\>Backend: recordExperienceAction(agencyId, experienceId, actionType)

Backend-\>\>Database: saveExperienceAction(agencyId, experienceId, actionType)

Backend-\>\>Backend: analyzeExperiencePreferences(agencyId)

Backend-\>\>Database: getAgencyExperiencePreference(agencyId)

Database--\>\>Backend: existingPreference

Backend-\>\>Backend: updatePreferenceWeights(experienceSignals, existingPreference)

Backend-\>\>Database: saveAgencyExperiencePreference(agencyId, updatedPreference)

Backend-\>\>Backend: reRankExperiences(verifiedLPs, updatedPreference)

Backend--\>\>Frontend: updatedExploreLPs

Frontend--\>\>Agency: Display updated Explore Experiences

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                   | **Actor**           | **Priority** |
|------------|--------------------------|-----------------------------------------------------------------------------------------------------|---------------------|--------------|
| **FR-001** | F-EXPLORE-01             | Display verified Experience listings on Explore and enforce Guest versus Agency visibility/actions. | Tour Agency / Guest | Must         |
| **FR-002** | F-EXPLORE-02             | Display Experience cards and quick previews containing the permitted summary information.           | Tour Agency / Guest | Must         |
| **FR-003** | F-EXPLORE-03             | Display full Experience/Provider detail information according to actor visibility rules.            | Tour Agency / Guest | Must         |
| **FR-004** | F-EXPLORE-04             | Display related Experiences and alternative Provider suggestions.                                   | Tour Agency / Guest | Should       |
| **FR-005** | F-EXPLORE-05             | Record card clicks, previews, detail views, filter usage and scrolling behavior.                    | System              | Should       |
| **FR-006** | F-EXPLORE-06             | Record engagement duration and defined sections viewed on Experience detail pages.                  | System              | Should       |
| **FR-007** | F-EXPLORE-07             | Record strong Experience action signals such as Request Quote and Chat.                             | System              | Should       |
| **FR-008** | F-EXPLORE-08             | Analyze current-session behavior and generate session preference patterns.                          | System              | Should       |
| **FR-009** | F-EXPLORE-09             | Update Agency Experience Preference weights using session behavior and historical preferences.      | System              | Should       |
| **FR-010** | F-EXPLORE-10             | Re-rank current-session Experience results based on updated Agency preferences.                     | System              | Should       |
| **FR-011** | F-EXPLORE-11             | Verify permission and initiate Request Quote from an Experience card/detail context.                | System              | Should       |
| **FR-012** | F-EXPLORE-12             | Verify permission and open Chat with the Local Provider for the selected Experience.                | System              | Should       |
| **FR-013** | F-EXPLORE-13             | Aggregate Explore behavior and usage metrics for ranking analysis.                                  | System              | Should       |
| **FR-014** | F-EXPLORE-14             | Evaluate ranking effectiveness by comparing ranking position against actual actions.                | System              | Should       |
| **FR-015** | F-EXPLORE-15             | Define ranking-quality scenarios and KPI success criteria.                                          | System              | Should       |
| **FR-016** | F-EXPLORE-16             | Calculate ranking performance KPIs and compare algorithm versions/periods.                          | System              | Should       |
| **FR-017** | F-EXPLORE-17             | Tune ranking parameters based on KPI/scenario feedback and record the new algorithm version.        | System              | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**                              | **Type**                                 | **Required** | **Output field(s)**             | **Type**               | **Notes / validation**                                                  |
|------------|-------------------------------------------------|------------------------------------------|--------------|---------------------------------|------------------------|-------------------------------------------------------------------------|
| **FR-001** | agency_id                                       | ID                                       | No           | experience_cards                | Array                  | Absent for Guest.                                                       |
|            | agency_preference_profile                       | Object                                   | No           | pagination                      | Object                 | Used if available.                                                      |
|            | page                                            | Integer                                  | No           |                                 |                        | Default 1; page size TBD.                                               |
| **FR-002** | experience                                      | Object                                   | Yes          | card_view                       | UI Component           | Contains name, type, location, Provider, media, duration, capacity etc. |
|            |                                                 |                                          |              | quick_preview                   | UI Component           | Optional on click.                                                      |
| **FR-003** | experience_id                                   | ID                                       | Yes          | activity_name, craft_type, etc. | Mixed                  | Public vs Agency-only field visibility applies.                         |
|            | agency_id                                       | ID                                       | No           | availability_calendar           | Array                  | Absent for Guest.                                                       |
|            |                                                 |                                          |              | pricing_breakdown               | Object                 | Agency only.                                                            |
|            |                                                 |                                          |              | provider_contact                | Object                 | Agency only.                                                            |
| **FR-004** | experience_id                                   | ID                                       | Yes          | related_experiences             | Array                  | May be empty.                                                           |
|            | relation_types                                  | TBD                                      | No           |                                 |                        | Same Provider / craft / nearby rules TBD.                               |
| **FR-005** | user_id                                         | ID                                       | TBD          | interaction_log_id              | ID                     | Whether Guest behavior is logged is TBD.                                |
|            | session_id                                      | String                                   | Yes          |                                 |                        | —                                                                       |
|            | action_type                                     | Enum                                     | Yes          |                                 |                        | click_card / expand_preview / view_detail / apply_filter / scroll       |
|            | experience_id, provider_id                      | ID                                       | No           |                                 |                        | Depends on action.                                                      |
|            | timestamp                                       | DateTime                                 | Yes          |                                 |                        | —                                                                       |
|            | duration_on_previous_screen                     | Integer seconds                          | No           |                                 |                        | —                                                                       |
|            | filter_values                                   | Object                                   | No           |                                 |                        | Schema TBD.                                                             |
| **FR-006** | agency_id, experience_id                        | ID                                       | Yes          | detail_visit_log_id             | ID                     | Agency detail tracking.                                                 |
|            | entered_at, exited_at                           | DateTime                                 | Yes          | duration_seconds                | Integer                | —                                                                       |
|            | scroll_depth_pct                                | Integer 0–100                            | Yes          |                                 |                        | —                                                                       |
|            | sections_viewed                                 | Array                                    | Yes          |                                 |                        | Enum list TBD.                                                          |
|            | next_action                                     | Enum\[Chat, Request Quote\]              | No           |                                 |                        | —                                                                       |
| **FR-007** | agency_id                                       | ID                                       | Yes          | action_signal_log_id            | ID                     | —                                                                       |
|            | action_type                                     | Enum\[Request Quote, Chat\]              | Yes          |                                 |                        | Other older actions are undefined.                                      |
|            | experience_id, provider_id                      | ID                                       | Yes          |                                 |                        | —                                                                       |
|            | timestamp                                       | DateTime                                 | Yes          |                                 |                        | —                                                                       |
|            | context                                         | Enum\[Card, Detail page, Search result\] | Yes          |                                 |                        | Search context definition TBD.                                          |
| **FR-008** | session_id                                      | String                                   | Yes          | session_behavior_pattern        | Object                 | Preference-detection thresholds TBD.                                    |
|            | session_logs                                    | Array                                    | Yes          |                                 |                        | —                                                                       |
| **FR-009** | session_behavior_pattern                        | Object                                   | Yes          | updated_preference_weights      | Map\<String, Decimal\> | Profile/entity relationship with AI Matching TBD.                       |
|            | historical_agency_experience_preference_profile | Object                                   | No           | updated_at                      | DateTime               | —                                                                       |
|            | decay_parameters                                | Object                                   | Yes          |                                 |                        | Exact decay formula TBD.                                                |
| **FR-010** | updated_preference_profile                      | Object                                   | Yes          | reranked_experience_list        | Array                  | Contains Experience ID, rank, score.                                    |
|            | current_experience_list                         | Array                                    | Yes          | results_refreshed_indicator     | Boolean                | —                                                                       |
| **FR-011** | experience_id                                   | ID                                       | Yes          | quote_request_id                | ID                     | Exact Quote flow TBD.                                                   |
|            | agency_id                                       | ID                                       | Yes          | chat_session_id                 | ID                     | Optional depending on chosen flow.                                      |
|            | activity_details                                | Object                                   | TBD          |                                 |                        | Required/editable quote fields TBD.                                     |
| **FR-012** | experience_id, provider_id, agency_id           | ID                                       | Yes          | chat_session_id                 | ID                     | Requires F-AUTH-16 permission.                                          |
|            | action_context                                  | Object                                   | No           | initial_message_id              | ID                     | Group/date source TBD.                                                  |
| **FR-013** | interaction_logs                                | Array                                    | Yes          | aggregated_metrics              | Object                 | Full metric list TBD.                                                   |
|            | aggregation_period                              | Enum\[Daily, Weekly, Monthly\]           | Yes          |                                 |                        | —                                                                       |
| **FR-014** | ranked_experience_list                          | Array                                    | Yes          | ranking_quality_score           | Integer 0–100          | Scoring formula TBD.                                                    |
|            | user_action_logs                                | Array                                    | Yes          | assessment                      | Enum\[Good, Poor\]     | —                                                                       |
|            | session_outcomes                                | Array                                    | Yes          |                                 |                        | —                                                                       |
| **FR-015** | behavior_patterns                               | Array                                    | Yes          | scenario_rules                  | Array                  | Runtime vs configuration TBD.                                           |
|            | ranking_outcomes                                | Array                                    | Yes          | kpi_definitions                 | Array                  | —                                                                       |
|            | success_criteria                                | Object                                   | Yes          |                                 |                        | —                                                                       |
| **FR-016** | interaction_logs                                | Array                                    | Yes          | ctr                             | Decimal %              | —                                                                       |
|            | explore_session_data                            | Array                                    | Yes          | conversion_rate                 | Decimal %              | —                                                                       |
|            | algorithm_version                               | String                                   | Yes          | avg_rank_selected               | Decimal                | —                                                                       |
|            |                                                 |                                          |              | engagement_time                 | Integer seconds        | —                                                                       |
|            |                                                 |                                          |              | bounce_rate                     | Decimal %              | Daily vs weekly/monthly calculation TBD.                                |
| **FR-017** | kpi_results                                     | Object                                   | Yes          | optimized_parameters            | Map\<String, Decimal\> | —                                                                       |
|            | scenario_analysis                               | Object                                   | Yes          | tuning_decision_log             | Object                 | —                                                                       |
|            | current_parameters                              | Map\<String, Decimal\>                   | Yes          | new_algorithm_version           | String                 | Auto-deploy vs human approval TBD.                                      |
|            | tuning_rules                                    | Object                                   | Yes          |                                 |                        | —                                                                       |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                                                   | **Why it exists**                                                 |
|-------------|--------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------|
| **BR-001**  | Explore may display only Experiences/Providers eligible for discovery according to verification rules.                                     | Prevents unverified content from being promoted.                  |
| **BR-002**  | Guests may browse public Explore content but cannot use protected Quote/Chat actions without Login.                                        | Separates public discovery from member collaboration.             |
| **BR-003**  | Sensitive pricing, operational and Provider contact fields must follow the visibility rules defined for Guest versus Tour Agency.          | Protects competitive/business information.                        |
| **BR-004**  | Agency browsing behavior may be recorded as preference signals for personalization.                                                        | Enables the Explore learning loop.                                |
| **BR-005**  | Simple browsing signals and strong actions must remain distinguishable; Request Quote/Chat are stronger intent signals than passive views. | Improves preference interpretation.                               |
| **BR-006**  | Session behavior analysis uses F-EXPLORE-05, 06 and 07 as its input sources.                                                               | Maintains traceable learning flow.                                |
| **BR-007**  | F-EXPLORE-09 updates Agency-specific preference weights.                                                                                   | Keeps preferences specific to each Agency.                        |
| **BR-008**  | F-EXPLORE-10 re-ranks the current Experience list for the relevant Agency only.                                                            | Prevents one Agency's behavior affecting another Agency directly. |
| **BR-009**  | Request Quote and Chat require F-AUTH-16 permission before handoff.                                                                        | Enforces authentication and authorization.                        |
| **BR-010**  | Request Quote is not a Booking.                                                                                                            | Booking remains under Schedule/Booking and Provider control.      |
| **BR-011**  | Aggregate Explore metrics must not be treated as individual Agency-specific personalization results.                                       | Separates personal learning from system-wide optimization.        |
| **BR-012**  | F-EXPLORE-13–17 form the system-level ranking optimization loop.                                                                           | Separates global ranking improvement from session re-ranking.     |
| **BR-013**  | Ranking-quality/KPI evaluation must compare actual user behavior against ranked positions.                                                 | Provides measurable algorithm feedback.                           |
| **BR-014**  | Every ranking-parameter change must be recorded with a new algorithm version and tuning decision log.                                      | Supports auditability and comparison across versions.             |

**6. Key entities (mandatory)**

| **Entity**                               | **Attributes (from Input/Output fields)**                                        | **Relationships**                             |
|------------------------------------------|----------------------------------------------------------------------------------|-----------------------------------------------|
| **Explore Session**                      | session_id, agency_id/guest context, timestamps                                  | has many interaction logs                     |
| **Experience Card**                      | experience_id, name, type, location, Provider, images, duration, capacity, price | references one Experience                     |
| **Experience Detail**                    | Experience data, Provider data, availability, pricing/operational fields         | belongs to one Experience                     |
| **Interaction Log**                      | user_id, session_id, action_type, experience_id, provider_id, timestamp          | belongs to Explore Session                    |
| **Detail Visit Log**                     | experience_id, duration, scroll depth, sections viewed, next action              | belongs to Agency session                     |
| **Action Signal**                        | action_type, experience_id, provider_id, context, timestamp                      | belongs to Agency preference learning         |
| **Session Behavior Pattern**             | clicked activity types, Provider patterns, filters, implicit preferences         | derived from Interaction Logs                 |
| **Agency Experience Preference Profile** | Agency ID, preference weights, updated_at                                        | belongs to one Agency                         |
| **Ranked Experience**                    | experience_id, rank, score                                                       | generated from Experience + Agency preference |
| **Related Experience Set**               | origin Experience, related Experience IDs, relation type                         | derived from catalog relationships            |
| **Quote Request**                        | quote_request_id, Agency, Experience, context                                    | may open one Chat session                     |
| **Explore Aggregate Metrics**            | views, click rate, action rate, session duration, top Experiences                | aggregated across sessions                    |
| **Ranking Quality Assessment**           | score, assessment, ranking/session outcomes                                      | evaluates a ranking result/version            |
| **Optimization Scenario**                | scenario rule, condition, action, KPI definition                                 | used for global optimization                  |
| **Algorithm Performance Record**         | algorithm version, period, CTR, conversion, rank, engagement, bounce rate        | belongs to one ranking version                |
| **Ranking Parameter Version**            | parameter map, version, tuning log                                               | produces later Explore rankings               |

**7. Screens involved**

| **Screen ID** | **Screen name**          | **Priority** | **Screen Spec file**          |
|---------------|--------------------------|--------------|-------------------------------|
| **EXP017**    | Explore                  | Must         | screens/screen-spec-EXP017.md |
| **EXP120**    | Public Explore           | Must         | screens/screen-spec-EXP120.md |
| **DSC122**    | Provider Profile         | Must         | screens/screen-spec-DSC122.md |
| **DSC123**    | Public Provider Profile  | Must         | screens/screen-spec-DSC123.md |
| **DSC033**    | Experience Detail        | Must         | screens/screen-spec-DSC033.md |
| **DSC124**    | Public Experience Detail | Must         | screens/screen-spec-DSC124.md |
| **COM048**    | Chat                     | Should       | screens/screen-spec-COM048.md |
| **—**         | Request Quote – Action   | —            | Not a separate screen         |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                  | **How it is measured**                                                         |
|------------|------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|
| **SC-001** | Guest can browse public Explore without gaining access to restricted Quote/Chat actions.       | Test public Explore and attempt restricted actions.                            |
| **SC-002** | Tour Agency sees the permitted full Experience information and protected actions.              | Compare authenticated and Guest rendering of the same Experience.              |
| **SC-003** | Explore records the defined Agency browsing and strong-action signals.                         | Perform each tracked interaction and inspect generated log records.            |
| **SC-004** | Meaningful Agency behavior can change the ordering of Explore results within the same session. | Generate a clear preference pattern and compare ranking before/after.          |
| **SC-005** | Agency A's browsing does not directly alter Agency B's personal preference ranking.            | Run independent behavior sessions for two Agencies.                            |
| **SC-006** | Request Quote/Chat can be initiated only after permission succeeds.                            | Test authorized and unauthorized requests.                                     |
| **SC-007** | Aggregate ranking KPIs can be calculated for a defined algorithm version and period.           | Run metric calculation against a known test period.                            |
| **SC-008** | Ranking-quality assessment reflects whether highly ranked Experiences receive clicks/actions.  | Use controlled ranking/action test data.                                       |
| **SC-009** | Every optimization produces traceable parameter/version output.                                | Review optimized parameters, version and tuning log after an optimization run. |
| **SC-010** | Guest-sensitive fields remain hidden across public Explore, Provider and Experience screens.   | Field-by-field visibility comparison.                                          |

**9. Assumptions**

- Explore consumes Experience and Provider information managed elsewhere; it does not own the business content.

- Guest public detail screens remain supported because both the current Function List and Screen List include public Provider/Experience detail visibility.

- Agency-specific preference updates and global ranking optimization are treated as two separate learning loops.

- F-MATCH Agency Preference Profile and F-EXPLORE Agency Experience Preference Profile may interact, but whether they are one shared entity is unresolved.

- Ratings/reviews listed in Explore outputs are treated as display data only; the current Function List contains no function that creates ratings or reviews.

- Request Quote remains a supporting Explore action even though the final Use Case document no longer contains the earlier UC-DIS-06.

- Search is not treated as a standalone Explore function because no Search function currently exists in the Function List.

**10. Open questions**

| **\#**                                                                            | **Question**                                                                                                                                                                          | **Blocking?** | **Owner**         | **Status**                                                                                                                                                                                                                           | **Anwers/ Decision**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1                                                                                 | What is the default Explore page size?                                                                                                                                                | No            | UI/UX / Tech      | Open                                                                                                                                                                                                                                 | 20 items/page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2                                                                                 | Is price shown on Guest Experience cards?                                                                                                                                             | Yes           | Client / BA       | Open                                                                                                                                                                                                                                 | No — price hidden for Guest, only visible after login/verified Agency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3                                                                                 | Where do Provider ratings and review counts come from, given no Review function exists?                                                                                               | Yes           | BA                | <span class="comment-start" id="0" author="Thư Minh Vũ" date="2026-09-23T03:41:08Z">cái này ko chắc</span><span class="comment-start" id="1" author="Nguyễn Thị Minh Thư" date="2026-09-23T03:44:17Z">đợi vkl check r xóa</span>Open |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| <span class="comment-end" id="0"><span class="comment-end" id="1"></span></span>4 | Is card capacity a single maximum value or min–max range such as 1–8 pax?                                                                                                             | No            | BA                | Open                                                                                                                                                                                                                                 | **Min–max range** (e.g. 1–8 pax), per F-EXPLORE-02 example.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5                                                                                 | What relation types are officially supported by F-EXPLORE-04?                                                                                                                         | No            | BA                | Open                                                                                                                                                                                                                                 | 3 types: **Same Provider**, **Same Craft Type (other Provider)**, **Nearby Village**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 6                                                                                 | What distance/radius qualifies as a “nearby village”?                                                                                                                                 | No            | BA / Tech         | Open                                                                                                                                                                                                                                 | 20km radius                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 7                                                                                 | Are Guest browsing interactions recorded by F-EXPLORE-05?                                                                                                                             | Yes           | Product / Privacy | Open                                                                                                                                                                                                                                 | No, only logged-in Agency interactions are recorded, for privacy.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 8                                                                                 | What is the schema of filter_values?                                                                                                                                                  | Yes           | BA                | Open                                                                                                                                                                                                                                 | {category: string\[\], priceRange: \[min,max\], location: string}.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 9                                                                                 | What sections are tracked by sections_viewed in F-EXPLORE-06?                                                                                                                         | No            | UI/UX             | Open                                                                                                                                                                                                                                 | Gallery, Activities, Provider informations, Scroll depth                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 10                                                                                | Should references to Add to Tour, Bookmark/Save and direct Booking actions be removed completely from older Explore wording?                                                          | Yes           | BA                | Open                                                                                                                                                                                                                                 | Yes — remove, out of MVP scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 11                                                                                | context = Search result exists in F-EXPLORE-07, but no Explore Search function exists. Should this context be removed?                                                                | No            | BA                | Open                                                                                                                                                                                                                                 | Yes — remove.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 12                                                                                | What behavior threshold converts clicks/time spent into an implicit preference?                                                                                                       | Yes           | AI / BA           | Open                                                                                                                                                                                                                                 | Per F-EXPLORE-06: **\<10s = low, 30–60s = moderate, 2min+ = high interest**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 13                                                                                | Is F-EXPLORE-09's Agency Experience Preference Profile the same entity as the Agency Preference Profile from F-MATCH-10?                                                              | Yes           | BA / AI           | Open                                                                                                                                                                                                                                 | Yes — shared entity.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 14                                                                                | How should F-EXPLORE-09 time decay interact with F-MATCH-15 time decay?                                                                                                               | Yes           | AI / BA           | Open                                                                                                                                                                                                                                 | Single shared decay function, not calculated separately.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 15                                                                                | Does F-EXPLORE-11 open a separate Quote Request form or directly open Chat?                                                                                                           | Yes           | BA / UI           | Open                                                                                                                                                                                                                                 | Opens Chat directly with a pre-filled quote message (no separate form).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 16                                                                                | Which Quote Request fields are pre-filled, required and editable?                                                                                                                     | Yes           | BA                | Open                                                                                                                                                                                                                                 | Pre-filled: experience_id, agency_id. Editable/required: group_size, preferred dates.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 17                                                                                | Where do group_size and dates used by F-EXPLORE-12's initial Chat context come from?                                                                                                  | Yes           | BA                | Open                                                                                                                                                                                                                                 | Agency's last-used Explore filter values, if available; otherwise left blank for manual entry.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 18                                                                                | What is the formal definition of user_retention in Explore metrics?                                                                                                                   | No            | BA                | Open                                                                                                                                                                                                                                 | % of Agencies returning to Explore within 7 days.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 19                                                                                | What is the complete metric list for F-EXPLORE-13?                                                                                                                                    | No            | BA                | Open                                                                                                                                                                                                                                 | Experiences viewed, clicked, activity type distribution, actions taken (quotes/chats), user retention, time spent/session, top experiences.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 20                                                                                | What formula maps ranking outcomes to the F-EXPLORE-14 ranking_quality_scorefrom 0–100?                                                                                               | Yes           | AI / BA           | Open                                                                                                                                                                                                                                 | Weighted sum: CTR (40%) + conversion rate (40%) + retention (20%), normalized to 0–100                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 21                                                                                | Is F-EXPLORE-15 a runtime system function or a configuration activity performed by the project team?                                                                                  | Yes           | Product / Tech    | Open                                                                                                                                                                                                                                 | Team configuration activity, not a runtime system function.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 22                                                                                | Are F-EXPLORE-16 KPIs calculated daily, weekly, monthly, or a combination?                                                                                                            | Yes           | Product / Tech    | Open                                                                                                                                                                                                                                 | Daily, aggregated into weekly/monthly <span class="comment-start" id="2" author="Thư Minh Vũ" date="2026-09-23T03:40:02Z">cái này chưa có chắc nha</span><span class="comment-start" id="3" author="Nguyễn Thị Minh Thư" date="2026-09-23T03:46:37Z">bảo recal sau mỗi lượt người dùng có session explore (session này kết khi người dùng rời khỏi màn explore)</span><span class="comment-start" id="4" author="Nguyễn Thị Minh Thư" date="2026-09-23T03:46:51Z">k có report nhé cnay của phần thuật toán</span>reports<span class="comment-end" id="2"><span class="comment-end" id="3"><span class="comment-end" id="4"></span></span></span>. |
| 23                                                                                | Does F-EXPLORE-17 automatically deploy new ranking parameters or require human approval?                                                                                              | Yes           | Product / Tech    | Open                                                                                                                                                                                                                                 | Actor = System, no approval step mentioned in text → literally **auto-deploy**.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 24                                                                                | Should F-EXPLORE-11 be mapped to an existing final Use Case, or should UC-DIS-06 Request Quote be restored?                                                                           | Yes           | BA                | Open                                                                                                                                                                                                                                 | Restore UC-DIS-06 Request Quote.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 25                                                                                | The final Use Case lists LP/HDT/UBND as actors for detail viewing, but F-EXPLORE-03 lists only Tour Agency/Guest. Which actor definition is authoritative for Explore detail screens? | Yes           | BA                | Open                                                                                                                                                                                                                                 | F-EXPLORE-03 (Tour Agency/Guest) is authoritative for Explore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 26                                                                                | The Sequence Diagram still labels Request Quote as UC-DIS-06 and uses villageId, while current Function List uses experience_id. Should the sequence be updated?                      | Yes           | BA                | Open                                                                                                                                                                                                                                 | Yes — update to match current Function List.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 27                                                                                | Is AI model retraining from Explore metrics part of MVP, or should Explore only tune ranking parameters?                                                                              | Yes           | Product / AI      | Open                                                                                                                                                                                                                                 | No — MVP only tunes ranking parameters manually; retraining is post-MVP.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                                                                                                               |
|--------------------------------|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Explore**                                                                                                                                                                |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Guest flow: “View Explore Page” → “View Public Local Provider Detail Page” → “Request advanced features?”; Tour Agency flow: “Choose Discovery Method” → “Browse Explore Page” → “View Local Provider Detail” → interaction decision** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 4: Explore – UC-DIS-01, UC-DIS-02, UC-DIS-03, UC-DIS-04; supporting Request Quote sequence currently labelled UC-DIS-06**                                                                                                       |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-EXPLORE-01 .. F-EXPLORE-17**                                                                                                                                                                                                           |
| **7. Screens**                 | Screen List                | **sheet ST, EXP017, EXP120, DSC122, DSC123, DSC033, DSC124, COM048; Request Quote – Action**                                                                                                                                                               |
