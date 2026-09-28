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

- Request Quote has already been created for the same Agency–Experience pair; the existing Quote Request is reused rather than duplicated.

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
    Frontend->>Backend: getExploreContent(agencyId)
    Backend->>Database: getVerifiedLPsAndExperiences()
    Database-->>Backend: verifiedLPs
    Backend-->>Frontend: exploreLPs
    Frontend-->>Agency: Display Explore Page with LP / Experience cards
    Agency->>Frontend: Browse Explore LPs
    Agency->>Frontend: Select LP / Experience
    Frontend->>Backend: getLPExperienceDetails(lpId)
    Backend->>Database: getVerifiedLPProfile(lpId)
    Database-->>Backend: profileData
    Backend-->>Frontend: profileData
    Frontend-->>Agency: Display LP / Experience details
    Note over Agency, Database: UC-DIS-03: View Provider
    Agency->>Frontend: Select Provider
    Frontend->>Backend: getProviderProfile(providerId)
    Backend->>Database: getProviderProfile(providerId)
    Database-->>Backend: providerProfile
    Backend-->>Frontend: providerProfile
    Frontend-->>Agency: Display Provider Profile
    Note over Agency, Database: UC-DIS-04: View Experience
    Agency->>Frontend: Select Experience
    Frontend->>Backend: getExperienceDetails(experienceId)
    Backend->>Database: getExperienceDetails(experienceId)
    Database-->>Backend: experienceDetails
    Backend-->>Frontend: experienceDetails
    Frontend-->>Agency: Display Experience Details
    Note over Agency, Database: UC-DIS-02: Explore Experiences
    Frontend->>Backend: recordExperienceAction(agencyId, experienceId, actionType)
    Backend->>Database: saveExperienceAction(agencyId, experienceId, actionType)
    Backend->>Backend: analyzeExperiencePreferences(agencyId)
    Backend->>Database: getAgencyExperiencePreference(agencyId)
    Database-->>Backend: existingPreference
    Backend->>Backend: updatePreferenceWeights(experienceSignals, existingPreference)
    Backend->>Database: saveAgencyExperiencePreference(agencyId, updatedPreference)
    Backend->>Backend: reRankExperiences(verifiedLPs, updatedPreference)
    Backend-->>Frontend: updatedExploreLPs
    Frontend-->>Agency: Display updated Explore Experiences
    Note over Backend, Database: KPI Tuning (Background Job)
    Backend->>Database: calculateRankingKPIs()
    Database-->>Backend: kpiMetrics
    Backend->>Backend: tuneRankingWeights(kpiMetrics)
    Backend->>Database: saveRankingAlgorithmVersion(updatedWeights)

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
| **FR-009** | F-EXPLORE-09             | Update the shared Agency Preference Profile in real time using current-session behavior only; historical time decay is handled exclusively by F-MATCH-15. | System              | Should       |
| **FR-010** | F-EXPLORE-10             | Re-rank current-session Experience results based on updated Agency preferences.                     | System              | Should       |
| **FR-011** | F-EXPLORE-11             | Verify permission, create or reuse the persistent Quote Request for the Agency–Experience pair, and open the related Agency–Local Provider Chat; repeated requests do not create duplicates. | System              | Should       |
| **FR-012** | F-EXPLORE-12             | Verify permission and open Chat with the Local Provider for the selected Experience, auto-sending the defined initial context; known group size/dates are included only when already available from Agency Preference Profile or related AI Matching context. | System              | Should       |
| **FR-013** | F-EXPLORE-13             | Aggregate Explore behavior and usage metrics for ranking analysis.                                  | System              | Should       |
| **FR-014** | F-EXPLORE-14             | Evaluate ranking effectiveness by comparing ranking position against actual actions.                | System              | Should       |
| **FR-015** | F-EXPLORE-15             | Define ranking-quality scenarios and KPI success criteria.                                          | System              | Should       |
| **FR-016** | F-EXPLORE-16             | Calculate ranking performance KPIs and compare algorithm versions/periods.                          | System              | Should       |
| **FR-017** | F-EXPLORE-17             | Tune ranking parameters based on KPI/scenario feedback, record the new algorithm version, and keep the generated version pending human approval rather than auto-deploying it. | System              | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**                              | **Type**                                 | **Required** | **Output field(s)**             | **Type**               | **Notes / validation**                                                  |
|------------|-------------------------------------------------|------------------------------------------|--------------|---------------------------------|------------------------|-------------------------------------------------------------------------|
| **FR-001** | agency_id                                       | ID                                       | No           | experience_cards                | Array<ExperienceCard>  | Absent for Guest.                                                       |
|            | agency_preference_profile                       | Object                                   | No           | pagination                      | Object{page, page_size, total_count} | Used if available.                                              |
|            | page                                            | Integer                                  | No           |                                 |                        | Default 1.                                                              |
|            | page_size                                       | Integer                                  | No           |                                 |                        | Default 12; maximum 50.                                                 |
| **FR-002** | experience                                      | Object{id, name, type, location, provider_name, images, description, duration, capacity, price?} | Yes | card_view | UI Component | capacity uses recommended group_size range where available; otherwise 1 to max_participants. price is visible only to authenticated Tour Agency. |
|            |                                                 |                                          |              | quick_preview                   | UI Component           | Optional on click.                                                      |
| **FR-003** | experience_id                                   | ID                                       | Yes          | activity_name                   | String                 | Visible to all.                                                         |
|            | agency_id                                       | ID                                       | No           | craft_type                      | Enum                   | agency_id absent for Guest.                                             |
|            |                                                 |                                          |              | duration, participant_capacity  | Mixed                  | See F-EXPLORE-02.                                                       |
|            |                                                 |                                          |              | images                          | Array<Image>           | Visible to all.                                                         |
|            |                                                 |                                          |              | public_description              | Text                   | Visible to all.                                                         |
|            |                                                 |                                          |              | included_items, excluded_items  | Array<String>          | Optional.                                                               |
|            |                                                 |                                          |              | provider_name                   | String                 | Visible to all.                                                         |
|            |                                                 |                                          |              | provider_public_bio             | Text                   | Optional.                                                               |
|            |                                                 |                                          |              | related_experiences             | Array<Object>          | Optional.                                                               |
|            |                                                 |                                          |              | other_craft_suggestions         | Array<Object>          | Optional.                                                               |
|            |                                                 |                                          |              | public_availability             | Object{operating_hours, available_slots, blocked_slots:Array<Object{start_at,end_at,status}>} | Public schedule information only; blocked slots expose only time/status. |
|            |                                                 |                                          |              | pricing_breakdown               | Object{price_per_person, group_discounts} | Tour Agency only.                                       |
|            |                                                 |                                          |              | operational_booking_info        | Object{class_hours, booking_lead_time, cancellation_policy} | Tour Agency only.                       |
|            |                                                 |                                          |              | provider_private_contact        | Object{phone,email}    | Tour Agency only.                                                       |
|            |                                                 |                                          |              | action_buttons                  | Array<Enum[Request Quote, Chat]> with enabled flag | Guest actions disabled and redirect to Login.        |
| **FR-004** | experience_id                                   | ID                                       | Yes          | related_experiences             | Array<Object{experience_id,name,provider_name,duration,capacity,price?,photos}> | May be empty. |
|            | relation_types                                  | Array<Enum[Same Provider, Same Craft Type, Nearby]> | No | | | Default uses all three. |
|            | nearby_radius_km                                | Decimal                                  | No           |                                 |                        | Default 20 km when Nearby is used.                                      |
| **FR-005** | user_id                                         | ID                                       | No           | logged                          | Boolean                | Authenticated Agency only; null for Guest.                              |
|            | session_id                                      | String                                   | Yes          | interaction_log_id              | ID                     | Optional; returned only when an interaction event is actually stored.   |
|            | tracking_scope                                  | Enum[Personalized, Anonymous Analytics, No Non-essential Tracking] | Yes | | | Agency uses Personalized. Guest analytics may be anonymous only with consent. |
|            | analytics_consent                               | Boolean                                  | Conditional  |                                 |                        | Required for Guest non-essential analytics.                             |
|            | action_type                                     | Enum[click_card, expand_preview, view_detail, apply_filter, scroll] | Yes | | | — |
|            | experience_id                                   | ID                                       | No           |                                 |                        | Not required for apply_filter/scroll.                                   |
|            | provider_id                                     | ID                                       | No           |                                 |                        | —                                                                       |
|            | timestamp                                       | DateTime                                 | Yes          |                                 |                        | —                                                                       |
|            | duration_on_previous_screen                     | Integer seconds                          | No           |                                 |                        | —                                                                       |
|            | filter_values                                   | Object                                   | No           |                                 |                        | Populated for apply_filter; exact schema not fixed by current Function List. |
| **FR-006** | agency_id                                       | ID                                       | Yes          | detail_visit_log_id             | ID                     | Agency detail tracking.                                                 |
|            | experience_id                                   | ID                                       | Yes          | duration_seconds                | Integer                | —                                                                       |
|            | entered_at, exited_at                           | DateTime                                 | Yes          |                                 |                        | —                                                                       |
|            | scroll_depth_pct                                | Integer 0–100                            | Yes          |                                 |                        | —                                                                       |
|            | sections_viewed                                 | Array<Enum[Gallery, Description, Included/Excluded Items, Provider Bio, Availability, Pricing, Booking Conditions, Provider Contact, Related Experiences]> | Yes | | | Pricing, Booking Conditions and Provider Contact tracked only when visible to authenticated Agency. |
|            | next_action                                     | Enum[Chat, Request Quote]                | No           |                                 |                        | —                                                                       |
|            | time_to_next_action                             | Integer seconds                          | No           |                                 |                        | —                                                                       |
| **FR-007** | agency_id                                       | ID                                       | Yes          | action_signal_log_id            | ID                     | —                                                                       |
|            | action_type                                     | Enum[Request Quote, Chat]                | Yes          |                                 |                        | Supported MVP strong actions only.                                      |
|            | experience_id                                   | ID                                       | Yes          |                                 |                        | —                                                                       |
|            | provider_id                                     | ID                                       | Yes          |                                 |                        | —                                                                       |
|            | timestamp                                       | DateTime                                 | Yes          |                                 |                        | —                                                                       |
|            | source_context                                  | Enum[Card, Detail Page]                  | Yes          |                                 |                        | Search Result is not part of the canonical Explore context.             |
| **FR-008** | session_id                                      | String                                   | Yes          | session_behavior_pattern        | Object{clicked_experience_types, provider_patterns?, time_patterns?, filter_choices?, implicit_preferences?} | Explicit filter creates an immediate explicit signal; Request Quote/Chat creates an immediate strong positive signal. |
|            | session_logs                                    | Array<InteractionLog>                    | Yes          |                                 |                        | Implicit positive preference requires the same attribute across at least 3 interacted Experiences and at least 50% of clicks/views, or ≥60s dwell on at least 2 Experiences sharing the attribute. A single click/view alone is insufficient. |
| **FR-009** | session_behavior_pattern                        | Object                                   | Yes          | updated_preference_weights      | Map<String, Decimal>   | Current-session behavior only.                                          |
|            | agency_preference_profile                       | Object                                   | No           | updated_at                      | DateTime               | Absent for a new Agency. Historical time decay is handled exclusively by F-MATCH-15. |
| **FR-010** | updated_preference_profile                      | Object                                   | Yes          | reranked_experience_list        | Array<Object{experience_id, rank, score}> | Immediately re-ranks the current list for that Agency only. |
|            | current_experience_list                         | Array<ID>                                | Yes          | results_refreshed_indicator     | Boolean                | —                                                                       |
| **FR-011** | experience_id                                   | ID                                       | Yes          | quote_request_id                | ID                     | Creates or reuses the persistent Quote Request for the Agency–Experience pair. |
|            | agency_id                                       | ID                                       | Yes          | is_new_request                  | Boolean                | True only for the first Request Quote for the Agency–Experience pair.   |
|            | activity_details                                | Object{duration: Integer Optional}       | No           | chat_session_id                 | ID                     | No separate Quote form is required; related Chat follows Agency–Local Provider pair scope. |
| **FR-012** | experience_id                                   | ID                                       | Yes          | chat_session_id                 | ID                     | Requires F-AUTH-16 permission.                                          |
|            | provider_id                                     | ID                                       | Yes          | initial_message_id              | ID                     | Initial message contains Agency info, selected Experience and source context. |
|            | agency_id                                       | ID                                       | Yes          |                                 |                        | From session.                                                           |
|            | action_context                                  | Object{source: Enum[Card, Detail Page], known_group_size: Integer Optional, known_dates: Object Optional} | No | | | Group size/dates included only when already available from Agency Preference Profile or related AI Matching context. |
| **FR-013** | interaction_logs                                | Array<Object>                            | Yes          | aggregated_metrics              | Object{experience_views, unique_experiences_viewed, experience_clicks, click_rate, filter_usage, quote_request_count, chat_action_count, action_rate, avg_session_duration, bounce_rate, top_experiences, user_retention_30d?} | user_retention_30d = authenticated Agency cohort returning within 30 days of first Explore session. |
|            | aggregation_period                              | Enum[Daily, Weekly, Monthly]             | Yes          |                                 |                        | —                                                                       |
| **FR-014** | ranked_experience_list                          | Array<Object>                            | Yes          | ranking_quality_score           | Integer 0–100          | score = 0.50×rank_relevance_score + 0.30×click_engagement_score + 0.20×strong_action_score. |
|            | user_action_logs                                | Array<Object>                            | Yes          | assessment                      | Enum[Good, Poor]       | Good when ranking_quality_score >= 60.                                  |
|            | session_outcomes                                | Array<Object>                            | Yes          |                                 |                        | Rank relevance: #1=100; #2–3=80; #4–5=60; #6–10=30; none=0. Click engagement =100 if any ranked Experience clicked, else 0. Strong action=100 if Request Quote/Chat occurs, else 0. |
| **FR-015** | behavior_patterns                               | Array<Object>                            | Yes          | scenario_rules                  | Array<Object{scenario: Enum[A,B,C], condition, action}> | Versioned configuration executed when a ranking-algorithm version is created/revised, not each Explore session. |
|            | ranking_outcomes                                | Array<Object>                            | Yes          | kpi_definitions                 | Array<Object{kpi, formula, target}> | — |
|            | success_criteria                                | Object                                   | Yes          |                                 |                        | —                                                                       |
| **FR-016** | interaction_logs                                | Array<Object>                            | Yes          | ctr                             | Decimal %              | KPIs calculated Weekly by default; Monthly values are weekly roll-ups. No separate Daily KPI cycle in MVP. |
|            | explore_session_data                            | Array<Object>                            | Yes          | conversion_rate                 | Decimal %              | —                                                                       |
|            | algorithm_version                               | String                                   | Yes          | avg_rank_selected               | Decimal                | —                                                                       |
|            |                                                 |                                          |              | engagement_time                 | Integer seconds        | —                                                                       |
|            |                                                 |                                          |              | bounce_rate                     | Decimal %              | —                                                                       |
|            |                                                 |                                          |              | improvement_vs_previous         | Decimal %              | Optional; none for first version.                                       |
|            |                                                 |                                          |              | algorithm_version               | String                 | Required.                                                               |
|            |                                                 |                                          |              | period_granularity              | Enum[Weekly, Monthly]  | Required — default Weekly.                                              |
|            |                                                 |                                          |              | period                          | Date range             | Required.                                                               |
| **FR-017** | kpi_results                                     | Object                                   | Yes          | optimized_parameters            | Map<String, Decimal>   | —                                                                       |
|            | scenario_analysis                               | Object                                   | Yes          | tuning_decision_log             | Object                 | —                                                                       |
|            | current_parameters                              | Map<String, Decimal>                     | Yes          | new_algorithm_version           | String                 | Newly generated version is not auto-deployed.                           |
|            | tuning_rules                                    | Object                                   | Yes          | deployment_status               | Enum[Pending Human Approval, Approved, Deployed] | Required; new version remains Pending Human Approval until authorized. |

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
| **BR-015**  | Guest Explore behavior must never be used for personalization. Non-essential Guest analytics may be stored anonymously only when analytics_consent = true. | Preserves privacy while allowing consented anonymous analytics. |
| **BR-016**  | F-EXPLORE-09 applies current-session behavior only. Historical time decay is handled exclusively by F-MATCH-15. | Prevents duplicate or conflicting decay logic. |
| **BR-017**  | A Quote Request is unique per Agency–Experience pair. Repeated Request Quote actions reuse the existing Quote Request rather than creating duplicates. | Maintains one persistent commercial request per Agency–Experience pair. |
| **BR-018**  | Explore Chat follows F-CHAT-01 scope: at most one Active Chat per Agency–Local Provider pair, reused across Experience contexts. | Prevents duplicate context-specific Chat threads. |
| **BR-019**  | Ranking KPI calculation runs Weekly by default; Monthly metrics are roll-ups of the weekly metrics, and MVP has no separate Daily KPI cycle. | Keeps algorithm evaluation cadence deterministic. |
| **BR-020**  | A newly optimized ranking version is never automatically deployed and remains Pending Human Approval until authorized. | Prevents unreviewed ranking changes from becoming active. |

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
| **Agency Preference Profile**            | Agency ID, preference weights, updated_at                                        | shared Agency-specific preference entity used by Explore and AI Tour Matching |
| **Ranked Experience**                    | experience_id, rank, score                                                       | generated from Experience + Agency preference |
| **Related Experience Set**               | origin Experience, related Experience IDs, relation type                         | derived from catalog relationships            |
| **Quote Request**                        | quote_request_id, Agency, Experience, context                                    | may open one Chat session                     |
| **Explore Aggregate Metrics**            | views, click rate, action rate, session duration, top Experiences                | aggregated across sessions                    |
| **Ranking Quality Assessment**           | score, assessment, ranking/session outcomes                                      | evaluates a ranking result/version            |
| **Optimization Scenario**                | scenario rule, condition, action, KPI definition                                 | used for global optimization                  |
| **Algorithm Performance Record**         | algorithm version, period, CTR, conversion, rank, engagement, bounce rate        | belongs to one ranking version                |
| **Ranking Parameter Version**            | parameter map, version, tuning log, deployment_status                            | produces later Explore rankings after authorized approval |

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

- F-EXPLORE-09 updates the shared Agency Preference Profile used across Explore and AI Tour Matching; historical signal decay for that profile is handled by F-MATCH-15.


- Request Quote remains a supporting Explore action even though the final Use Case document no longer contains the earlier UC-DIS-06.

- Search is not treated as a standalone Explore function because no Search function currently exists in the Function List.

**10. Open questions**

| **\#**                                                                            | **Question**                                                                                                                                                                          | **Blocking?** | **Owner**         | **Status**                                                                                                                                                                                                                           | **Anwers/ Decision**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
|-----------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1                                                                                 | What is the default Explore page size?                                                                                                                                                | No            | UI/UX / Tech      | Closed                                                                                                                                                                                                                               | Default **12 items/page**, maximum **50**. |
| 2                                                                                 | Is price shown on Guest Experience cards?                                                                                                                                             | Yes           | Client / BA       | Open                                                                                                                                                                                                                                 | No — price hidden for Guest, only visible after login/verified Agency.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 3                                                                                 | Where do Provider ratings and review counts come from, given no Review function exists?                                                                                               | Yes           | BA                | Closed                                                                                                                                                                                                                               | Ratings/review counts are **not part of the current canonical F-EXPLORE-02 contract**, so they are not treated as a required Explore field in this spec. |
| <span class="comment-end" id="0"><span class="comment-end" id="1"></span></span>4 | Is card capacity a single maximum value or min–max range such as 1–8 pax?                                                                                                             | No            | BA                | Open                                                                                                                                                                                                                                 | **Min–max range** (e.g. 1–8 pax), per F-EXPLORE-02 example.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 5                                                                                 | What relation types are officially supported by F-EXPLORE-04?                                                                                                                         | No            | BA                | Closed                                                                                                                                                                                                                               | **Same Provider, Same Craft Type, Nearby**. |
| 6                                                                                 | What distance/radius qualifies as a “nearby village”?                                                                                                                                 | No            | BA / Tech         | Closed                                                                                                                                                                                                                               | Default **20 km** when the Nearby relation is used. |
| 7                                                                                 | Are Guest browsing interactions recorded by F-EXPLORE-05?                                                                                                                             | Yes           | Product / Privacy | Closed                                                                                                                                                                                                                               | Guest interactions are never used for personalization. Non-essential Guest analytics may be stored **anonymously** only when `analytics_consent = true`; without consent, only strictly necessary technical events are retained. |
| 8                                                                                 | What is the schema of filter_values?                                                                                                                                                  | Yes           | BA                | Open                                                                                                                                                                                                                                 | The current Function List defines `filter_values` as an optional Object for `apply_filter` events but does **not** fix an exact schema. Keep this unresolved unless the Function List is revised. |
| 9                                                                                 | What sections are tracked by sections_viewed in F-EXPLORE-06?                                                                                                                         | No            | UI/UX             | Closed                                                                                                                                                                                                                               | **Gallery, Description, Included/Excluded Items, Provider Bio, Availability, Pricing, Booking Conditions, Provider Contact, Related Experiences**. |
| 10                                                                                | Should references to Add to Tour, Bookmark/Save and direct Booking actions be removed completely from older Explore wording?                                                          | Yes           | BA                | Open                                                                                                                                                                                                                                 | Yes — remove, out of MVP scope.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 11                                                                                | context = Search result exists in F-EXPLORE-07, but no Explore Search function exists. Should this context be removed?                                                                | No            | BA                | Closed                                                                                                                                                                                                                               | **Yes.** Canonical `source_context` is only **Card** or **Detail Page**. |
| 12                                                                                | What behavior threshold converts clicks/time spent into an implicit preference?                                                                                                       | Yes           | AI / BA           | Closed                                                                                                                                                                                                                               | An implicit positive preference is created when the same attribute appears in **at least 3 interacted Experiences** and represents **at least 50%** of Experience clicks/views in the current session, or when the Agency spends **at least 60 seconds on at least 2 Experiences** sharing that attribute. A single click/view alone is insufficient. |
| 13                                                                                | Is F-EXPLORE-09's Agency Experience Preference Profile the same entity as the Agency Preference Profile from F-MATCH-10?                                                              | Yes           | BA / AI           | Closed                                                                                                                                                                                                                               | **Yes — shared Agency Preference Profile.** |
| 14                                                                                | How should F-EXPLORE-09 time decay interact with F-MATCH-15 time decay?                                                                                                               | Yes           | AI / BA           | Closed                                                                                                                                                                                                                               | F-EXPLORE-09 does **not** apply historical decay. It updates the shared Agency Preference Profile from current-session behavior only; historical time decay is handled exclusively by **F-MATCH-15**. |
| 15                                                                                | Does F-EXPLORE-11 open a separate Quote Request form or directly open Chat?                                                                                                           | Yes           | BA / UI           | Closed                                                                                                                                                                                                                               | No separate Quote Request form is required. The action **creates or reuses the Quote Request for the Agency–Experience pair and opens the related Chat**. |
| 16                                                                                | Which Quote Request fields are pre-filled, required and editable?                                                                                                                     | Yes           | BA                | Closed                                                                                                                                                                                                                               | F-EXPLORE-11 requires `experience_id` and `agency_id`. `activity_details` is optional and currently contains only optional `duration`; **group_size and preferred dates are not required Quote fields in the current contract**. |
| 17                                                                                | Where do group_size and dates used by F-EXPLORE-12's initial Chat context come from?                                                                                                  | Yes           | BA                | Closed                                                                                                                                                                                                                               | Include them only when already available from the **Agency Preference Profile or related AI Matching context**. Explore does not require manual entry before opening Chat. |
| 18                                                                                | What is the formal definition of user_retention in Explore metrics?                                                                                                                   | No            | BA                | Closed                                                                                                                                                                                                                               | `user_retention_30d` = percentage of authenticated Agencies in a cohort that return to Explore within **30 days** of their first Explore session. |
| 19                                                                                | What is the complete metric list for F-EXPLORE-13?                                                                                                                                    | No            | BA                | Closed                                                                                                                                                                                                                               | `experience_views`, `unique_experiences_viewed`, `experience_clicks`, `click_rate`, `filter_usage`, `quote_request_count`, `chat_action_count`, `action_rate`, `avg_session_duration`, `bounce_rate`, `top_experiences`, and optional `user_retention_30d`. |
| 20                                                                                | What formula maps ranking outcomes to the F-EXPLORE-14 ranking_quality_scorefrom 0–100?                                                                                               | Yes           | AI / BA           | Closed                                                                                                                                                                                                                               | `ranking_quality_score = 0.50 × rank_relevance_score + 0.30 × click_engagement_score + 0.20 × strong_action_score`. Rank relevance: #1=100, #2–3=80, #4–5=60, #6–10=30, none=0. `assessment = Good` when score ≥ 60; otherwise Poor. |
| 21                                                                                | Is F-EXPLORE-15 a runtime system function or a configuration activity performed by the project team?                                                                                  | Yes           | Product / Tech    | Closed                                                                                                                                                                                                                               | It remains a **System function**, but it executes when a ranking-algorithm version is **created or revised**, not as part of every Explore session. The scenario/KPI configuration is versioned. |
| 22                                                                                | Are F-EXPLORE-16 KPIs calculated daily, weekly, monthly, or a combination?                                                                                                            | Yes           | Product / Tech    | Closed                                                                                                                                                                                                                               | **Weekly by default**. Monthly values are roll-ups of weekly metrics. There is **no separate Daily KPI cycle** in MVP. |
| 23                                                                                | Does F-EXPLORE-17 automatically deploy new ranking parameters or require human approval?                                                                                              | Yes           | Product / Tech    | Closed                                                                                                                                                                                                                               | **Human approval is required.** Newly generated versions remain `Pending Human Approval`; optimized parameters are never auto-deployed. |
| 24                                                                                | Should F-EXPLORE-11 be mapped to an existing final Use Case, or should UC-DIS-06 Request Quote be restored?                                                                           | Yes           | BA                | Closed                                                                                                                                                                                                                               | Do **not** restore UC-DIS-06 solely to support F-EXPLORE-11. F-EXPLORE-11 remains a supporting Function List action even if the final Use Case artifact does not contain a standalone Request Quote use case. |
| 25                                                                                | The final Use Case lists LP/HDT/UBND as actors for detail viewing, but F-EXPLORE-03 lists only Tour Agency/Guest. Which actor definition is authoritative for Explore detail screens? | Yes           | BA                | Open                                                                                                                                                                                                                                 | F-EXPLORE-03 (Tour Agency/Guest) is authoritative for Explore.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 26                                                                                | The Sequence Diagram still labels Request Quote as UC-DIS-06 and uses villageId, while current Function List uses experience_id. Should the sequence be updated?                      | Yes           | BA                | Open                                                                                                                                                                                                                                 | Yes — update to match current Function List.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 27                                                                                | Is AI model retraining from Explore metrics part of MVP, or should Explore only tune ranking parameters?                                                                              | Yes           | Product / AI      | Closed                                                                                                                                                                                                                               | Foundational AI model retraining is not executed by the Explore MVP. Explore may tune ranking parameters through F-EXPLORE-17, but any newly generated ranking version still requires human approval before deployment. |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                                                                                                               |
|--------------------------------|----------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Explore**                                                                                                                                                                |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Guest flow: “View Explore Page” → “View Public Local Provider Detail Page” → “Request advanced features?”; Tour Agency flow: “Choose Discovery Method” → “Browse Explore Page” → “View Local Provider Detail” → interaction decision** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 4: Explore – UC-DIS-01, UC-DIS-02, UC-DIS-03, UC-DIS-04; supporting Request Quote sequence currently labelled UC-DIS-06**                                                                                                       |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-EXPLORE-01 .. F-EXPLORE-17**                                                                                                                                                                                                           |
| **7. Screens**                 | Screen List                | **sheet ST, EXP017, EXP120, DSC122, DSC123, DSC033, DSC124, COM048; Request Quote – Action**                                                                                                                                                               |
