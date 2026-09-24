**Spec Document: AI Tour Matching**

| **Field**                 | **Value**                                                                                                                   |
|---------------------------|-----------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | AIT                                                                                                                         |
| Module name               | AI Tour Matching                                                                                                            |
| Spec version              | v0.1                                                                                                                        |
| Author (team member)      | Group G                                                                                                                     |
| Date                      | 22/09/2026                                                                                                                  |
| Status                    | Clarified                                                                                                                   |
| Approved by (Client role) |                                                                                                                             |
| DBIZ2 source              | Function List rows **F-MATCH-01 .. F-MATCH-16**; Use Case **UC-DIS-05**; Screens **AIT121, EXP017, DSC122, DSC033, COM048** |

**1. Purpose and scope (mandatory)**

> The AI Tour Matching module helps authenticated Tour Agencies describe tour requirements in natural language and receive ranked Local Provider/Experience recommendations that fit those requirements. It also learns Agency preferences from matching and related interactions so later recommendations and personalized discovery can become more relevant.

**In scope**

- Open AI Tour Matching for authenticated Tour Agencies.

- Capture natural-language tour requirements.

- Analyze requirements and ask follow-up questions where information is incomplete.

- Build a structured Tour Preference Profile.

- Retrieve verified Local Provider/Experience candidates.

- Check route, availability, capacity, budget and other hard constraints.

- Score and rank candidates.

- Generate recommendations and explanations.

- Allow Tour Agency to refine requirements and regenerate recommendations.

- Save Agency Preference Profile.

- Initiate Request Quote or Chat from matching recommendations.

- Handle no-match cases.

- Capture post-matching Chat signals.

- Apply time decay to historical Agency preference signals.

- Update Agency preferences and personalized Explore ranking.

**Out of scope**

- Guest access to the AI Tour Matching interface.

- Local Provider use of AI Tour Matching.

- Direct creation or confirmation of Bookings by the Tour Agency.

- Manual modification of Local Provider/Experience data.

- Provider profile verification.

- Global Explore-ranking KPI optimization, which belongs to the Explore Learning Loop.

- Chat message management itself; this belongs to the In-app Chat module.

- Booking lifecycle management after negotiation.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                                  |
|----------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Ensures only authenticated Tour Agencies access AI Matching and checks permission before Request Quote/Chat. |
| **PRF – Profile Management**                       | Supplies verified Provider and Experience data, pricing, capacity, location and booking conditions.          |
| **EXP – Explore**                                  | Consumes Agency Preference Profile and receives personalized re-ranking output.                              |
| **CHAT – In-app Chat**                             | Used when Agency selects Chat or Request Quote from recommendations.                                         |
| **Schedule / Booking**                             | Supplies availability/capacity-related constraints used in matching.                                         |
| **OpenAI API**                                     | Supports natural-language understanding and AI processing.                                                   |
| **Google Maps API**                                | Supports route and distance calculation.                                                                     |

**2. Actors (mandatory)**

| **Actor**                       | **Role in this module**                                                                                                      | **Where it comes from**           |
|---------------------------------|------------------------------------------------------------------------------------------------------------------------------|-----------------------------------|
| **Tour Agency**                 | Primary user who enters requirements, receives recommendations, refines them and initiates Quote/Chat                        | F-MATCH-01, 02, 09                |
| **System / AI Matching Engine** | Analyzes requirements, creates profiles, retrieves/filter/scores candidates, generates recommendations and performs learning | F-MATCH-03 .. 08, 10 .. 16        |
| **Guest**                       | Unauthorized actor; cannot access or see the AI Matching interface                                                           | F-MATCH-01 access rule            |
| **OpenAI API**                  | External AI processing dependency                                                                                            | System Configuration              |
| **Google Maps API**             | External route/distance calculation dependency                                                                               | F-MATCH-06 / System Configuration |
| **Chat module**                 | Supplies post-matching interaction signals and receives Quote/Chat handoff                                                   | F-MATCH-11, 13, 14                |

**3. User scenarios and acceptance criteria (mandatory)**

Because the final Use Case contains **one AI Tour Matching use case**, this section contains one main user scenario with acceptance cases covering its subfunctions.

## **US-1 (P1): AI Tour Matching — UC-DIS-05**

**Journey.** As a Tour Agency, I want to describe my tour needs conversationally and receive relevant Experience recommendations so that I can identify suitable Local Providers efficiently.

### **Acceptance scenarios**

1.  Given an authenticated Tour Agency, when it opens AI Tour Matching, then the matching interface is displayed.

2.  Given a Guest attempts to access AI Tour Matching directly, then the interface is not displayed and the Guest is redirected to Login.

3.  Given the Agency enters natural-language requirements, when the system analyzes them, then a structured tour context is produced.

4.  Given critical information is missing or unclear, when analysis completes, then the system asks contextual follow-up questions instead of immediately producing final recommendations.

5.  Given the requirements are sufficiently complete, when matching runs, then only eligible verified candidates are evaluated.

6.  Given candidates violate mandatory route, budget, capacity, availability or other hard constraints, then those candidates are excluded.

7.  Given eligible candidates exist, when scoring completes, then the system displays ranked recommendations with a match explanation.

8.  Given the Agency modifies its requirements, when it continues the matching conversation, then the Tour Preference Profile and recommendations are updated.

9.  Given no acceptable candidate exists, when matching finishes, then the system presents fallback suggestions such as relaxing budget, distance or dates.

10. Given the Agency selects **Request Quote**, then permission is checked, a Quote Request record is created and Chat is opened; **no Booking is created**.

11. Given the Agency selects **Chat**, then the existing/new Provider conversation is opened without automatically creating a Booking.

12. Given preference information has been captured, then the Agency Preference Profile may be saved for future matching and personalized Explore.

13. Given a matching-linked Chat session produces post-matching signals, then those signals may update the Agency Preference Profile according to the defined learning rules.

14. Given old and recent preference signals coexist, then recent signals receive greater influence according to the configured time-decay rule.

The Screen List describes AIT121 as a single chat-based matching screen where requirements are analyzed/refined and recommendations are returned directly in the conversation.

### **Edge cases**

- Agency submits an empty message.

- Agency enters highly ambiguous requirements.

- No verified Experiences exist.

- All candidates fail a hard constraint.

- Google Maps route/distance service is unavailable.

- AI processing service is unavailable.

- Agency changes constraints after recommendations have already been displayed.

- Same Experience has already received a Quote Request.

- Matching-linked Chat remains persistent but reaches the learning-loop inactivity threshold.

- Time-decay batch runs while new signals are being written.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> TA_Start(\["0. Start: Tour Agency"\])
>
> TA1\["1. Open AI Matching Assistant"\]
>
> TA2\[/"2. Input Natural Language Request"/\]
>
> TA3{"3. AI Needs Clarification?"}
>
> TA4\[/"4. Provide Missing Info"/\]
>
> TA5\["5. View AI Recommendations\n(Scores & Explanations)"\]
>
> TA6{"6. Switch/Case:\nSelect Follow-up Action"}
>
> TA7\["7a. View Full Detail"\]
>
> TA8\["7b. Request Quote"\]
>
> TA9\["7c. Initiate Chat"\]
>
> TA_End(\["8. End: Session Recorded for Learning Loop"\])
>
> TA_Start --\> TA1 --\> TA2 --\> TA3
>
> TA3 -- "Yes" --\> TA4 --\> TA5
>
> TA3 -- "No" --\> TA5
>
> TA5 --\> TA6
>
> TA6 -- "Detail" --\> TA7 --\> TA_End
>
> TA6 -- "Quote" --\> TA8 --\> TA_End
>
> TA6 -- "Chat" --\> TA9 --\> TA_End
>
> class TA_Start,TA_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 3: AI Tour Matching

actor Agency as Tour Agency

participant Frontend

participant Backend

participant AIEngine as AI Matching Engine

participant Database

Note over Agency, Database: UC-DIS-05 - AI Tour Matching

Note over Agency, Database: 1. Submit & Understand Tour Requirements

Agency-\>\>Frontend: Enter tour requirements in natural language

activate Agency

activate Frontend

Frontend-\>\>Backend: submitTourRequirements(requirements)

activate Backend

Backend-\>\>AIEngine: analyzeRequirements(requirements)

activate AIEngine

AIEngine-\>\>AIEngine: Extract tour context

AIEngine-\>\>AIEngine: Extract constraints

AIEngine-\>\>AIEngine: Extract preferences

AIEngine-\>\>AIEngine: Infer semantic preferences

AIEngine-\>\>AIEngine: Check requirement completeness

Note over Agency, Database: 2. Clarify Missing Requirements / 3. AI Matching & Recommendation

alt Requirements are incomplete

AIEngine-\>\>AIEngine: Identify missing critical criteria

AIEngine-\>\>AIEngine: Generate contextual follow-up question

AIEngine--\>\>Backend: followUpQuestion

Backend--\>\>Frontend: followUpQuestion

Frontend--\>\>Agency: Display follow-up question

Agency-\>\>Frontend: Provide clarification

Frontend-\>\>Backend: submitClarification(response)

Backend-\>\>AIEngine: updateConversationContext(response)

AIEngine-\>\>AIEngine: Re-analyze requirements

AIEngine-\>\>AIEngine: Check requirement completeness

else Requirements are complete

Note over Backend, Database: 3. AI Matching & Recommendation

Backend-\>\>AIEngine: findVerifiedLPsAndExperiences(tourPreferenceProfile)

AIEngine-\>\>Database: getVerifiedLPAndExperiences(tourPreferenceProfile)

Database--\>\>AIEngine: candidateLPsAndExperiences

AIEngine-\>\>AIEngine: Check hard constraints

AIEngine-\>\>AIEngine: Evaluate preferences

AIEngine-\>\>AIEngine: Evaluate route and distance

AIEngine-\>\>AIEngine: Calculate match scores

AIEngine-\>\>AIEngine: Rank candidates

AIEngine-\>\>AIEngine: Generate match explanations

AIEngine--\>\>Backend: rankedRecommendations

Backend--\>\>Frontend: rankedRecommendations

Frontend--\>\>Agency: Display ranked LP / Experience with match score and reasons

end

Note over Agency, Database: 4. Record Agency Preference Signals

loop During Matching Session

Agency-\>\>Frontend: View / Request Quote / Chat / Book / Schedule

Frontend-\>\>Backend: recordPreferenceSignal(signal)

Backend-\>\>Database: savePreferenceSignal(agencyId, sessionId, signal)

Database--\>\>Backend: signalSaved

end

Note over Agency, Database: 5. Analyze Preference Signals

Backend-\>\>Database: getCurrentSessionSignals(agencyId, sessionId)

Database--\>\>Backend: currentSessionSignals

Backend-\>\>AIEngine: analyzePreferenceSignals(currentSessionSignals)

AIEngine-\>\>AIEngine: Identify common factors among interacted items

AIEngine-\>\>AIEngine: Identify recurring preference patterns

AIEngine-\>\>AIEngine: Infer related preferences from non-interacted items

Note over Agency, Database: 6. Detect Session End

alt Agency closes AI matching chat

Frontend-\>\>Backend: closeMatchingSession(sessionId)

else 30-minute inactivity timeout

Backend-\>\>Backend: detectSessionTimeout(sessionId)

end

Note over Agency, Database: 7. Create Tour Preference Profile

AIEngine-\>\>AIEngine: Map semantic requirements

AIEngine-\>\>AIEngine: Assign preference weights

AIEngine-\>\>AIEngine: Generate Tour Preference Profile

AIEngine--\>\>Backend: tourPreferenceProfile

Backend--\>\>Frontend: tourPreferenceProfile

deactivate AIEngine

deactivate Backend

deactivate Frontend

deactivate Agency

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                                                               | **Actor**           | **Priority** |
|------------|--------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|--------------|
| **FR-001** | F-MATCH-01               | Allow only an authenticated Tour Agency to open the AI Tour Matching Assistant and redirect unauthorized Guests to Login.                       | Tour Agency / Guest | Must         |
| **FR-002** | F-MATCH-02               | Capture the Tour Agency's natural-language tour requirements within the matching conversation.                                                  | Tour Agency         | Must         |
| **FR-003** | F-MATCH-03               | Analyze and clarify tour requirements, identify missing critical information and ask follow-up questions where necessary.                       | System              | Must         |
| **FR-004** | F-MATCH-04               | Convert understood requirements into a structured Tour Preference Profile containing constraints, attributes, inferred preferences and weights. | System              | Must         |
| **FR-005** | F-MATCH-05               | Retrieve verified Provider/Experience candidates from the platform catalog.                                                                     | System              | Must         |
| **FR-006** | F-MATCH-06               | Calculate route/distance compatibility and remove candidates that fail mandatory constraints.                                                   | System              | Must         |
| **FR-007** | F-MATCH-07               | Score and rank eligible candidates using Experience fit, route relevance, preference alignment, distinctiveness and configured ranking factors. | System              | Must         |
| **FR-008** | F-MATCH-08               | Display top recommendations and additional suitable suggestions with concise match explanations.                                                | System              | Must         |
| **FR-009** | F-MATCH-09               | Allow the Agency to refine requirements and regenerate recommendations within the conversation.                                                 | Tour Agency         | Must         |
| **FR-010** | F-MATCH-10               | Save or update an Agency Preference Profile based on the completed matching session.                                                            | System              | Should       |
| **FR-011** | F-MATCH-11               | Verify permission and initiate Request Quote or Chat from a matching recommendation without creating a Booking.                                 | System              | Should       |
| **FR-012** | F-MATCH-12               | Display appropriate fallback options when no candidate satisfies the matching threshold.                                                        | System              | Must         |
| **FR-013** | F-MATCH-13               | Detect the end/inactivity boundary of a matching-linked Chat session for post-matching learning.                                                | System              | Should       |
| **FR-014** | F-MATCH-14               | Extract preference signals from a matching-linked Chat session.                                                                                 | System              | Should       |
| **FR-015** | F-MATCH-15               | Apply configured time decay to historical and recent preference signals.                                                                        | System              | Should       |
| **FR-016** | F-MATCH-16               | Update the Agency Preference Profile and that Agency's personalized Explore ranking using the reweighted signals.                               | System              | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field(s)**               | **Type**                    | **Required** | **Output field(s)**               | **Type** | **Notes / validation**                                                    |
|------------|----------------------------------|-----------------------------|--------------|-----------------------------------|----------|---------------------------------------------------------------------------|
| **FR-001** | page_request                     | HTTP Request                | Yes          | ai_matching_view                  | UI View  | Returned only to authorized Tour Agency.                                  |
|            | session_role                     | Enum                        | Yes          | matching_session_id               | ID       | Session creation timing TBD.                                              |
|            |                                  |                             |              | login_redirect_url                | URL      | Guest only.                                                               |
| **FR-002** | matching_session_id              | ID                          | Yes          | conversation_message              | Object   | Message max length TBD.                                                   |
|            | message_text                     | Text                        | Yes          |                                   |          | Must not be empty.                                                        |
| **FR-003** | conversation_context             | Array                       | Yes          | tour_context                      | Object   | Extracted field taxonomy TBD.                                             |
|            |                                  |                             |              | is_complete                       | Boolean  | Critical completeness criteria TBD.                                       |
|            |                                  |                             |              | follow_up_questions               | Array    | Optional when incomplete.                                                 |
| **FR-004** | tour_context                     | Object                      | Yes          | tour_preference_profile           | Object   | Contains hard constraints, attributes, inferred preferences and weights.  |
|            | domain_attributes                | TBD taxonomy                | Yes          |                                   |          | Taxonomy TBD.                                                             |
| **FR-005** | tour_preference_profile          | Object                      | Yes          | candidates                        | Array    | May be empty.                                                             |
|            | verified_catalog                 | Data Source                 | Yes          |                                   |          | Only verified candidates.                                                 |
| **FR-006** | route                            | TBD structured route        | Yes          | eligible_candidates               | Array    | May be empty.                                                             |
|            | candidate_locations              | Array                       | Yes          | route_distance_data               | Array    | Distance/travel-time units TBD.                                           |
|            | hard_constraints                 | Object                      | Yes          |                                   |          | Includes availability, capacity, budget and route feasibility.            |
| **FR-007** | eligible_candidates              | Array                       | Yes          | ranked_candidates                 | Array    | Contains Experience ID, score and rank.                                   |
|            | tour_preference_profile          | Object                      | Yes          |                                   |          | Match-score scale TBD.                                                    |
| **FR-008** | ranked_candidates                | Array                       | Yes          | top_matches                       | Array    | Number of top matches TBD.                                                |
|            |                                  |                             |              | additional_suggestions            | Array    | Optional.                                                                 |
| **FR-009** | matching_session_id              | ID                          | Yes          | conversation_message              | Object   | —                                                                         |
|            | message_text                     | Text                        | Yes          | updated_tour_preference_profile   | Object   | Optional if requirements change.                                          |
|            |                                  |                             |              | updated_recommendations           | Array    | Optional.                                                                 |
| **FR-010** | agency_id                        | ID                          | Yes          | agency_preference_profile         | Object   | Saved for later matching/Explore personalization.                         |
|            | matching_session_id              | ID                          | Yes          | updated_at                        | DateTime | —                                                                         |
|            | tour_preference_profile          | Object                      | Yes          |                                   |          | Current Function List has an output-description inconsistency to clarify. |
| **FR-011** | experience_id                    | ID                          | Yes          | chat_session_id                   | ID       | Always returned for Quote/Chat action.                                    |
|            | agency_id                        | ID                          | Yes          | quote_request_id                  | ID       | Request Quote only.                                                       |
|            | action_source                    | Enum\[Request Quote, Chat\] | Yes          | is_new_request                    | Boolean  | Request Quote only.                                                       |
|            | matching_session_id              | ID                          | No           |                                   |          | Quote Request schema/reuse rule TBD.                                      |
| **FR-012** | matching_criteria                | Tour Preference Profile     | Yes          | relaxation_suggestions            | Array    | Optional.                                                                 |
|            | results                          | Array                       | Yes          | conversation_prompt               | Text     | Optional.                                                                 |
|            | score_threshold                  | Decimal                     | Yes          |                                   |          | Threshold value TBD.                                                      |
| **FR-013** | chat_session_id                  | ID                          | Yes          | chat_session_end_event            | Object   | Persistent-chat/end semantics TBD.                                        |
|            | last_activity_at                 | DateTime                    | Yes          |                                   |          | Current timeout = 30 min in Function List.                                |
|            | agency_id                        | ID                          | Yes          |                                   |          | —                                                                         |
|            | experience_id                    | ID                          | Yes          |                                   |          | —                                                                         |
|            | matching_session_id              | ID                          | Yes          |                                   |          | Only matching-linked chats.                                               |
|            | closed_by_agency                 | Boolean                     | No           |                                   |          | —                                                                         |
| **FR-014** | chat_messages                    | Array                       | Yes          | preference_signals                | Array    | Signal taxonomy/extraction method TBD.                                    |
|            | chat_session_metadata            | Object                      | Yes          | agency_id                         | ID       | —                                                                         |
|            | experience_id                    | ID                          | Yes          |                                   |          | —                                                                         |
|            | previous_tour_preference_profile | Object                      | Yes          |                                   |          | —                                                                         |
| **FR-015** | historical_signals               | Array                       | Yes          | reweighted_signals                | Array    | Current reference points: 1h=1.0, 1 week=0.5, 1 month=0.2.                |
|            | recent_matching_signals          | Array                       | No           |                                   |          | —                                                                         |
|            | chat_signals                     | Array                       | No           |                                   |          | —                                                                         |
|            | decay_parameters                 | Object                      | Yes          |                                   |          | Interpolation/beyond-range rule TBD.                                      |
| **FR-016** | agency_preference_profile        | Object                      | Yes          | updated_agency_preference_profile | Object   | Agency-specific.                                                          |
|            | reweighted_signals               | Array                       | Yes          | reranked_explore_list             | Array    | Exact output behavior requires clarification.                             |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                         | **Why it exists**                                                   |
|-------------|------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| **BR-001**  | AI Tour Matching is available only to authenticated Tour Agencies.                                               | Prevents public/unauthorized use.                                   |
| **BR-002**  | Guest must not see the AI Matching interface; direct access redirects to Login.                                  | Enforces feature access consistently.                               |
| **BR-003**  | Matching must use only verified Provider/Experience candidates.                                                  | Prevents unverified content from being recommended.                 |
| **BR-004**  | Missing critical requirements must trigger clarification before final matching proceeds.                         | Avoids recommendations based on materially incomplete requirements. |
| **BR-005**  | Hard constraints are evaluated before final scoring/ranking.                                                     | Prevents high-scoring but infeasible recommendations.               |
| **BR-006**  | Ranking must be based on the Tour Preference Profile and configured matching factors.                            | Keeps recommendations tied to Agency requirements.                  |
| **BR-007**  | Recommendation explanations must state why an Experience matches the Agency requirements.                        | Provides interpretable results.                                     |
| **BR-008**  | Agency may refine requirements and re-run matching within the same conversation.                                 | Supports conversational search.                                     |
| **BR-009**  | Request Quote is an interest/pre-negotiation action and is **not a Booking**.                                    | Keeps Booking lifecycle under Local Provider control.               |
| **BR-010**  | A Booking is created later only through Schedule/Booking after negotiation.                                      | Preserves module responsibility.                                    |
| **BR-011**  | No-match results must provide criteria-relaxation or continuation options rather than an empty dead end.         | Maintains usable matching flow.                                     |
| **BR-012**  | Only Chat sessions associated with AI Matching should contribute to the matching post-interaction learning loop. | Prevents unrelated conversations from polluting preferences.        |
| **BR-013**  | Recent preference signals receive higher weight than older signals through time decay.                           | Keeps Agency preferences current.                                   |
| **BR-014**  | F-MATCH-16 personalizes results for the **same Agency**, not the global Explore ranking algorithm.               | Separates per-Agency learning from global Explore optimization.     |
| **BR-015**  | Tour Agency cannot directly inspect raw internal interaction-signal logs.                                        | Keeps internal learning metadata separate from user-facing data.    |

**6. Key entities (mandatory)**

| **Entity**                    | **Attributes from Input/Output**                                                | **Relationships**                               |
|-------------------------------|---------------------------------------------------------------------------------|-------------------------------------------------|
| **Matching Session**          | matching_session_id, agency_id, conversation context                            | belongs to one Tour Agency                      |
| **Conversation Message**      | message_id, session_id, sender, text, sent_at                                   | belongs to one Matching Session                 |
| **Tour Context**              | extracted requirements, constraints, preferences, completeness state            | derived from Matching Session                   |
| **Tour Preference Profile**   | hard_constraints, matching_attributes, inferred_preferences, preference_weights | belongs to one Matching Session                 |
| **Candidate Experience**      | experience_id, provider_id, village_id, location                                | references Experience, Provider and Village     |
| **Route Distance Record**     | experience_id, distance, travel_time                                            | belongs to Candidate Experience evaluation      |
| **Ranked Candidate**          | experience_id, match_score, experience_fit_score, rank                          | derived from candidate evaluation               |
| **Recommendation**            | experience_id, rank, match_score, explanation                                   | produced from Ranked Candidate                  |
| **Agency Preference Profile** | agency_id, preference signals/weights, updated_at                               | belongs to one Tour Agency                      |
| **Quote Request**             | quote_request_id, agency_id, experience_id                                      | initiates Chat; does not create Booking         |
| **Preference Signal**         | signal_type, value, captured_at                                                 | belongs to Agency / Matching-linked interaction |
| **Chat Session End Event**    | chat_session_id, ended_at, end_reason                                           | triggers post-matching signal processing        |
| **Reweighted Signal**         | preference signal, time-decayed weight                                          | updates Agency Preference Profile               |

**7. Screens involved**

| **Screen ID** | **Screen name**        | **Priority** | **Screen Spec File**          |
|---------------|------------------------|--------------|-------------------------------|
| **AIT121**    | AI Tour Matching       | Must         | screens/screen-spec-AIT121.md |
| **EXP017**    | Explore                | Must         | screens/screen-spec-EXP017.md |
| **DSC122**    | Provider Profile       | Must         | screens/screen-spec-DSC122.md |
| **DSC033**    | Experience Detail      | Must         | screens/screen-spec-DSC033.md |
| **COM048**    | Chat                   | Should       | screens/screen-spec-COM048.md |
| **—**         | Request Quote – Action | —            | Not a separate screen         |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                                         | **How it is measured**                                                                     |
|------------|-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------|
| **SC-001** | Guests cannot see or access the AI Tour Matching interface.                                                           | Test Guest UI and direct /ai-matching access.                                              |
| **SC-002** | Tour Agency can describe requirements in natural language and receive either a follow-up question or matching result. | Run representative complete and incomplete prompts.                                        |
| **SC-003** | Candidates failing mandatory constraints are not shown as valid recommendations.                                      | Seed candidates that violate budget/capacity/route/availability and inspect results.       |
| **SC-004** | Every displayed top recommendation contains a match explanation.                                                      | Inspect all recommendation cards in test sessions.                                         |
| **SC-005** | Refining requirements changes the profile/recommendation set when the changed criterion affects matching.             | Compare results before and after a meaningful refinement.                                  |
| **SC-006** | No-match conditions return actionable fallback suggestions rather than an empty result.                               | Use deliberately impossible requirements.                                                  |
| **SC-007** | Request Quote from matching opens the appropriate communication flow without creating a Booking.                      | Execute Request Quote and inspect Quote/Chat/Booking records.                              |
| **SC-008** | Only matching-linked Chat interaction signals contribute to the matching learning loop.                               | Compare matching-linked versus unrelated Chats.                                            |
| **SC-009** | Older preference signals have less influence than recent signals after time decay.                                    | Compare known signals at different ages after the scheduled decay process.                 |
| **SC-010** | Preference updates affect only the relevant Agency's personalized results, not another Agency's profile.              | Run two Agency accounts with different interaction histories and compare profiles/results. |

**9. Assumptions**

- Tour Agency is authenticated before a Matching Session can begin.

- Candidate retrieval uses only Providers/Experiences already marked Verified by their responsible modules.

- Profile Management and Schedule/Booking provide the data required for price, capacity, location and availability constraints.

- AI Tour Matching and Explore may share an Agency Preference Profile.

- F-MATCH-13–16 are treated as the **post-matching learning loop** within the AI Tour Matching module even though their Function Name currently says Update Explore After Chat with Time Decay.

- F-MATCH-16 changes personalized Explore ranking for one Agency; it does not replace the global Explore Learning Loop.

- The current DBIZ2 Sequence Diagram represents only part of F-MATCH-01–16 and does not fully show Quote/Chat, no-match and post-Chat learning.

- Chat itself remains persistent even if a 30-minute inactivity boundary is used to trigger signal processing; the exact meaning of “session end” remains unresolved.

**10. Open questions**

| **\#** | **Question**                                                                                                                                                                                                      | **Blocking?** | **Owner**    | **Status** | **Answer / Decsion**                                                                                                                                           |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|--------------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | Is matching_session_id created when AIT121 opens or only after the Agency sends its first message?                                                                                                                | No            | Tech / BA    | Closed     | Created only after the Agency sends the first message to prevent empty sessions.                                                                               |
| 2      | What is the maximum length of a natural-language matching message?                                                                                                                                                | No            | Tech         | Closed     | 1,000 characters.                                                                                                                                              |
| 3      | What exact fields are extracted into tour_context?                                                                                                                                                                | Yes           | BA / AI      | Closed     | Location/Region, Group Size, Dates, Budget, and Preferred Activities.                                                                                          |
| 4      | Which fields are considered critical before requirements are “complete”?                                                                                                                                          | Yes           | BA / AI      | Closed     | Location/Region, Group Size, and tentative Dates.                                                                                                              |
| 5      | What is the canonical matching-domain attribute taxonomy?                                                                                                                                                         | Yes           | BA / AI      | Closed     | Category (e.g., Workshop, Sightseeing), Vibe (e.g., Active, Relaxed), and Price Tier.                                                                          |
| 6      | What weight scale/normalization rule is used in Tour Preference Profile?                                                                                                                                          | Yes           | AI / Tech    | Closed     | A decimal scale from 0.0 to 1.0.                                                                                                                               |
| 7      | What exact route structure is required: origin, destination and/or waypoints?                                                                                                                                     | Yes           | BA / Tech    | Closed     | Origin and Destination only for calculating distance and travel time. Turn-by-turn routing or directions are explicitly NOT provided.                          |
| 8      | What units are used for distance and travel time?                                                                                                                                                                 | No            | Tech         | Closed     | Kilometers (km) and Minutes (min).                                                                                                                             |
| 9      | Is Google Maps definitively the route/distance source for F-MATCH-06?                                                                                                                                             | No            | Tech         | Closed     | Yes, Google Maps API (Distance Matrix).                                                                                                                        |
| 10     | Is match_score represented as 0–1, 0–100, or another scale?                                                                                                                                                       | Yes           | AI / BA      | Closed     | 0–100 percentage scale for better user readability.                                                                                                            |
| 11     | How many Top Matches are displayed before Additional Suggestions?                                                                                                                                                 | No            | UI/UX / BA   | Closed     | Top 3 matches.                                                                                                                                                 |
| 12     | What is the exact schema of the saved Agency Preference Profile?                                                                                                                                                  | Yes           | BA / AI      | Closed     | A JSON object mapping domain attributes (e.g., category, price tier, vibes) to their accumulated, time-decayed weights.                                        |
| 13     | What fields constitute a Quote Request record?                                                                                                                                                                    | Yes           | BA           | Closed     | quote_request_id, agency_id, experience_id, requested_date, group_size, and initial_message.                                                                   |
| 14     | When should an existing Quote Request be reused rather than creating a new one?                                                                                                                                   | Yes           | BA           | Closed     | Reuse if a "Pending" request already exists for the exact same Agency, Experience, and Date.                                                                   |
| 15     | What score threshold defines the no-match condition?                                                                                                                                                              | Yes           | AI / BA      | Closed     | A match score below 40/100.                                                                                                                                    |
| 16     | Does a 30-minute inactivity period truly “end” a persistent Chat, or only close a learning-analysis window?                                                                                                       | Yes           | BA / Tech    | Closed     | It only closes the learning-analysis window; the Chat session itself remains persistent.                                                                       |
| 17     | What Chat signal types are extracted and how are they calculated?                                                                                                                                                 | Yes           | AI / BA      | Closed     | Signals (e.g., "Price inquiry", "Availability check", "Customization request") are extracted via LLM intent analysis from chat messages.                       |
| 18     | Is “AI model retraining” actually part of MVP execution, or should the learning loop only update Agency Preference Profiles?                                                                                      | Yes           | Product / AI | Closed     | Only update the Agency Preference Profile; there is no foundational model retraining in the MVP.                                                               |
| 19     | How is decay calculated between/beyond the stated reference points 1h=1.0, 1 week=0.5 and 1 month=0.2?                                                                                                            | Yes           | AI           | Closed     | Linear interpolation between the defined points, maintaining a flat 0.2 weight for anything older than 1 month.                                                |
| 20     | Does F-MATCH-16 return a complete reranked Explore list or only an updated preference profile consumed later by F-EXPLORE-10?                                                                                     | Yes           | BA / AI      | Closed     | It returns only the updated Preference Profile, which is later consumed by the Explore module's ranking logic.                                                 |
| 21     | Should the Sequence Diagram be expanded to explicitly cover F-MATCH-11–16?                                                                                                                                        | No            | BA           | Closed     | No. These are asynchronous background processes. Treat them as system background jobs and document them via text to avoid modifying the main sequence diagram. |
| 22     | The current sequence records Book / Schedule as preference signals, while the final Function List explicitly exposes View Details, Quote and Chat from matching. Should Booking/Schedule remain matching signals? | No            | BA           | Closed     | Yes, Booking/Schedule remain strong preference signals, but they should be captured via system events rather than directly from the matching UI.               |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                                          |
|--------------------------------|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – AI Tour Matching**                                                                                  |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Tour Agency flow: “Choose Discovery Method” → “Input Natural Language” → “Use AI Tour Matching Assistant” → “View Local Provider Detail” → interaction decision** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 3: AI Tour Matching – UC-DIS-05**                                                                                                                          |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-MATCH-01 .. F-MATCH-16**                                                                                                                                          |
| **7. Screens**                 | Screen List                | **sheet ST, AIT121, EXP017, DSC122, DSC033, COM048; Request Quote – Action**                                                                                                          |
