**Spec Document: In-app Chat**

| **Field**                 | **Value**                                                                                                         |
|---------------------------|-------------------------------------------------------------------------------------------------------------------|
| Module ID                 | IAC                                                                                                               |
| Module name               | In-app Chat                                                                                                       |
| Spec version              | v0.1                                                                                                              |
| Author (team member)      | Group G                                                                                                           |
| Date                      | 22/09/2026                                                                                                        |
| Status                    | Clarified                                                                                                         |
| Approved by (Client role) |                                                                                                                   |
| DBIZ2 source              | Function List rows **F-CHAT-01 .. F-CHAT-05**; Use Case **UC-COM-01**; Screens **COM048, COM065, COM125, COM126** |

**1. Purpose and scope (mandatory)**

> The In-app Chat module allows Tour Agencies and Local Providers to communicate directly within Artisan Bridge for clarification, negotiation and collaboration around Providers, Experiences and relevant Booking context. It maintains persistent conversation history and ensures only authorized conversation participants can view or send messages.

**In scope**

- Open an existing Chat session between a Tour Agency and Local Provider.

- Create a Chat session when no suitable conversation exists.

- Open Chat from AI Tour Matching.

- Open Chat from Explore.

- Open Chat from Provider context.

- Associate relevant Experience or Booking context with a conversation where applicable.

- Send text messages.

- Support plain text and basic markdown such as bold and italic.

- Upload one or more supported documents to an active Chat.

- Select existing generated Agency dossier documents or verified Provider assets where available.

- Attach documents to the current Chat conversation and relevant context.

- Display attached documents as part of persistent Chat history.

- Store message history.

- Display Chat list.

- Display latest message preview and timestamp.

- Display unread count.

- Display paginated Chat history.

- Enforce participant-only access.

- Reuse persistent Chat sessions across user sessions.

- Preserve the closed conversation history for later reference after the Chat session is closed.

**Out of scope**

- Message editing.

- Message deletion.

- Group Chat.

- Guest Chat access.

- HDT/UBND participation in Agency–Provider Chat.

- Audio/video calling.

- Booking creation by Chat itself.

- Permanent deletion of Chat sessions or Chat history.

- Read receipts beyond the currently defined unread-count behavior.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                           |
|----------------------------------------------------|-------------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Verifies that the actor is authorized and is a participant in the Chat.                               |
| **AIT – AI Tour Matching**                         | May initiate Chat from matching results.                                                              |
| **EXP – Explore**                                  | May initiate Chat from an Experience.                                                                 |
| **PRF – Profile Management**                       | Provides Provider/Agency identity information displayed in Chat.                                      |
| **BKG – Schedule / Booking Management**            | May associate Booking context and may generate Booking-update messages into an existing conversation. |

F-CHAT-01 explicitly references permission validation through F-AUTH-16 and allows Chat to originate from AI Matching, Explore and Provider-profile contexts.

**2. Actors (mandatory)**

| **Actor**                      | **Role in this module**                                                                  | **Where it comes from** |
|--------------------------------|------------------------------------------------------------------------------------------|-------------------------|
| **Tour Agency**                | Opens conversations, sends messages and views its own Chat list/history                  | F-CHAT-01–05            |
| **Local Provider**             | Opens/participates in conversations, sends messages and views its own Chat list/history  | F-CHAT-01–05            |
| **System**                     | Creates/reuses Chat sessions, stores messages, loads history and enforces data isolation | F-CHAT-01–05            |
| **Authentication/RBAC**        | Verifies participant permission before protected Chat actions                            | F-AUTH-16               |
| **AI Tour Matching / Explore** | Upstream sources that may hand off into a Chat session                                   | F-CHAT-01               |

**3. User scenarios and acceptance criteria (mandatory)**

## Because the final Use Case contains only **one Chat use case**, all five F-CHAT functions are covered by one main user scenario.

## **US-1 (P1): Communicate via Chat — UC-COM-01**

## **Journey.** As a Tour Agency or Local Provider, I want to communicate with my collaboration partner through persistent Chat so that we can clarify requirements and negotiate before or during collaboration.

### **Acceptance scenarios**

## Given an authorized Tour Agency or Local Provider selects Chat with a permitted counterpart, when the system checks permission, then an existing eligible Chat session is opened or a new one is created.

## Given the actor is not a participant or does not have permission, when Chat access is attempted, then access is denied.

## Given Chat is opened from an Experience-related context, then the conversation may retain the related Experience context.

## Given Chat is initiated from AI Matching or Explore, then contextual information may be pre-populated into the conversation.

## Given a participant sends non-empty supported text, when Send is selected, then the message is stored with sender and timestamp and becomes part of Chat history.

## Given a participant uses supported basic markdown, then bold/italic formatting may be rendered.

## Given an authorized participant uploads or selects one or more supported documents, when the attachment action succeeds, then the documents are attached to the active Chat and become part of the persistent conversation history.

## Given the user opens the Chat list, then only conversations in which that user participates are displayed.

## Given a Chat is opened, then its message history is displayed chronologically.

## Given more than 50 messages exist, then the latest 50 are initially loaded and older messages can be retrieved through pagination/scroll.

## Given a Chat is opened by the recipient, then the conversation's unread count is reset according to the defined unread behavior.

## Given the user leaves the platform and returns later, the existing Chat conversation remains available.

1.  Given an active Chat session, when either authorized participant selects End Chat, then the system closes the active Chat session and records its closing state.

2.  Given a Chat session has been closed, when its history is viewed later, then previously stored messages remain available according to the user's access permission.

3.  Given a user who is not a participant attempts to close a Chat session, then the action is denied.

## The Function List defines persistent Chat sessions, participant-only access and paginated message history. 

### **Edge cases**

## The same pair attempts to open Chat simultaneously.

## A Chat already exists for the same participants.

## A user attempts to access a Chat by manually changing the Chat ID.

## Sender loses account access while Chat is open.

## Empty or whitespace-only message is submitted.

## Message is sent twice due to repeated user action/network retry.

## Conversation has no previous messages.

## Message history exceeds 50 records.

## AI Matching/Explore opens Chat without an Experience context.

## Booking-related context is supplied but no defined Chat-from-Booking entry point exists.

## An uploaded file uses an unsupported format.

## An uploaded file exceeds the 25 MB per-file limit.

## A multi-file attachment contains one or more invalid files.

## File upload succeeds but attachment to the Chat fails.


**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> C_Start(\["0. Start: Agency / Local Provider"\])
>
> C1\["1. Initiate Chat Session\n(From Explore, Detail, or Booking)"\]
>
> C2\[/"2. Input Message / Attach Files"/\]
>
> C3\["3. Real-time Message Exchange"\]
>
> C4{"4. Session Action"}
>
> C5\["5. Close Chat Session"\]
>
> C6\["6. System Saves Conversation History"\]
>
> C_End(\["7. End"\])
>
> C_Start --\> C1 --\> C2 --\> C3 --\> C4
>
> C4 -- "Reply" --\> C2
>
> C4 -- "End" --\> C5 --\> C6 --\> C_End
>
> class C_Start,C_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 7: In-app Chat

actor Provider as Local Provider

actor Agency as Tour Agency

participant Frontend

participant Backend

participant Database

Note over Provider, Database: UC-COM-01: Chat

alt Tour Agency starts chat

Agency-\>\>Frontend: Select Chat

Frontend-\>\>Backend: startChat(agencyId, providerId)

else Local Provider starts chat

Provider-\>\>Frontend: Select Chat

Frontend-\>\>Backend: startChat(providerId, agencyId)

end

Backend-\>\>Database: createOrGetChatSession(participantIds)

Database--\>\>Backend: chatSession

Backend--\>\>Frontend: chatSessionReady

Frontend--\>\>Agency: Display chat interface

Frontend--\>\>Provider: Display chat interface

loop While chat session is active

alt Tour Agency sends message

Agency-\>\>Frontend: Send message(text)

Frontend-\>\>Backend: sendMessage(sessionId, senderId, text)

Backend-\>\>Database: saveMessage(sessionId, senderId, text)

Database--\>\>Backend: messageSaved

Backend--\>\>Frontend: deliverMessage(message)

Frontend--\>\>Provider: Display incoming message

else Local Provider sends message

Provider-\>\>Frontend: Send message(text)

Frontend-\>\>Backend: sendMessage(sessionId, senderId, text)

Backend-\>\>Database: saveMessage(sessionId, senderId, text)

Database--\>\>Backend: messageSaved

Backend--\>\>Frontend: deliverMessage(message)

Frontend--\>\>Agency: Display incoming message

end

opt Authorized participant attaches document
Agency->>Frontend: Attach supported document(s)
Frontend->>Backend: attachDocuments(sessionId, senderId, filesOrAssetIds)
Backend->>Database: saveChatAttachments(sessionId, senderId, attachments)
Database-->>Backend: attachmentsSaved
Backend-->>Frontend: attachmentMessage
Frontend-->>Provider: Display attached document(s)
end

end

alt Tour Agency ends chat

Agency-\>\>Frontend: End Chat

Frontend-\>\>Backend: endChat(sessionId)

else Local Provider ends chat

Provider-\>\>Frontend: End Chat

Frontend-\>\>Backend: endChat(sessionId)

end

Backend-\>\>Database: saveConversation(sessionId)

Database--\>\>Backend: conversationSaved

Backend-\>\>Database: closeChatSession(sessionId)

Database--\>\>Backend: sessionClosed

Backend--\>\>Frontend: chatSessionClosed

Frontend--\>\>Agency: Display chat ended

Frontend--\>\>Provider: Display chat ended

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                                                                              | **Actor**                    | **Priority** |
|------------|--------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------|--------------|
| **FR-001** | F-CHAT-01                | Open an existing permitted Chat session or create a new one between a Tour Agency and Local Provider, retaining relevant interaction context where applicable. | Tour Agency / Local Provider | Should       |
| **FR-002** | F-CHAT-02                | Allow only Chat participants to send supported text messages and store each message in the conversation history.                                               | Tour Agency / Local Provider | Should       |
| **FR-003** | F-CHAT-03                | Display the logged-in user's Chat list and authorized message history with unread counts and pagination.                                                       | Tour Agency / Local Provider | Should       |
| FR-004     | F-CHAT-04                | Allow an authorized Tour Agency or Local Provider participant to close an active Chat session while retaining its existing conversation history.               | Tour Agency / Local Provider | Should       |
| **FR-005** | F-CHAT-05                | Allow an authorized Chat participant to upload or select one or more supported documents and attach them to an active Chat session.                           | Tour Agency / Local Provider | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field**    | **Type**                                       | **Required** | **Output field**       | **Type**                                                                   | **Notes / validation**                                   |
|------------|--------------------|------------------------------------------------|--------------|------------------------|----------------------------------------------------------------------------|----------------------------------------------------------|
| **FR-001** | initiator_id       | ID                                             | Yes          | chat_session_id        | ID                                                                         | Taken from authenticated session.                        |
|            | recipient_id       | ID                                             | Yes          | is_new_session         | Boolean                                                                    | Existing conversation should be reused when appropriate. |
|            | source             | Enum\[AI Matching, Explore, Provider Profile\] | Yes          |                        | Local Provider initiation source is not fully represented by current enum. |                                                          |
|            | experience_id      | ID                                             | No           |                        | Context association only.                                                  |                                                          |
|            | booking_id         | ID                                             | No           |                        | No defined Booking entry point currently exists.                           |                                                          |
|            | permission_granted | Boolean                                        | Yes          |                        | Result of F-AUTH-16.                                                       |                                                          |
| **FR-002** | chat_session_id    | ID                                             | Yes          | message_id             | ID                                                                         | Sender must belong to Chat.                              |
|            | message_text       | Text                                           | Yes          | sent_at                | DateTime                                                                   | Plain text + bold/italic markdown; max length TBD.       |
|            | sender_id          | ID                                             | Yes          | last_message_timestamp | DateTime                                                                   | From authenticated session.                              |
|            | permission_granted | Boolean                                        | Yes          |                        | Verified through F-AUTH-16.                                                |                                                          |
| **FR-003** | user_id            | ID                                             | Yes          | chat_list              | Array                                                                      | Sorted most recent first.                                |
|            | role               | Enum\[Tour Agency, Local Provider\]            | Yes          | message_history        | Array                                                                      | Latest 50 per page when Chat opened.                     |
|            | chat_session_id    | ID                                             | No           | has_more_messages      | Boolean                                                                    | Required only for history.                               |
|            | before_cursor      | String                                         | No           |                        | Loads older messages.                                                      |                                                          |
|            | permission_granted | Boolean                                        | Yes          |                        | User cannot access another user's Chat.                                    |                                                          |
| **FR-004** | chat_session_id    | ID                                             | Yes          | chat_status            | Enum\[Closed\]                                                             | Chat must exist.                                         |
|            | closed_by          | ID                                             | Yes          | closed_at              | DateTime                                                                   | Must be one of the Chat participants.                    |
|            | permission_granted | Boolean                                        | Yes          | success_message        | String                                                                     | Verified through F-AUTH-16.                              |
|            | close_reason       | Text                                           | No           |                        |                                                                            | Optional unless business decides otherwise.              |
| **FR-005** | chat_session_id    | ID                                             | Yes          | attachment_ids         | Array<ID>                                                                  | Chat must exist and sender must be a participant.         |
|            | sender_id          | ID                                             | Yes          | message_id             | ID                                                                         | Taken from authenticated session.                         |
|            | uploaded_files     | Array<File>                                    | Conditional  | attached_files         | Array<Object>                                                              | Required when no existing asset is selected.              |
|            | selected_asset_ids | Array<ID>                                      | Conditional  | sent_at                | DateTime                                                                   | Agency Dossier / Provider Vault assets.                   |
|            | source_type        | Enum[Upload, AgencyDossier, ProviderVault]     | Yes          | validation_errors      | Array<String>?                                                             | Identifies document source.                               |
|            | active_reference_id| ID                                             | No           |                        |                                                                            | Booking / Experience context where applicable.            |

**5.2 Business rules**

| **Rule ID** | **Rule** | **Why it exists** |
|-------------|----------|-------------------|
| **BR-001** | Chat is available only between Tour Agency and Local Provider actors. | Limits communication to intended collaboration participants. |
| **BR-002** | A user may access only Chat sessions in which they are a participant. | Prevents conversation data leakage. |
| **BR-003** | F-AUTH-16 permission must be satisfied before Chat access, messaging or document attachment. | Enforces authorization. |
| **BR-004** | If an appropriate Chat session already exists, the system reuses it instead of blindly creating another session. | Maintains conversation continuity. |
| **BR-005** | Active Chat sessions persist across user login sessions until an authorized participant closes the Chat. | Preserves long-running negotiation history. |
| **BR-006** | Messages are stored as immutable history in MVP; users cannot edit or delete them. | Maintains communication traceability. |
| **BR-007** | MVP Chat supports plain text plus basic bold/italic markdown. | Defines the supported text-messaging scope. |
| **BR-008** | Chat supports document attachments for authorized Tour Agency and Local Provider participants. | Supports B2B document exchange within collaboration. |
| **BR-009** | Only PDF, DOCX, XLSX, JPG and PNG files up to 25 MB per file are supported. | Defines the MVP attachment boundary. |
| **BR-010** | One or more documents may be attached in a single attachment action. | Supports COM125/COM126 multi-select behavior. |
| **BR-011** | Attached documents become part of persistent Chat history and follow the same participant-access rules as the parent Chat session. | Maintains security and communication traceability. |
| **BR-012** | Chat/Experience/Booking context is an association to the conversation, not a document attachment. | Distinguishes contextual metadata from uploaded documents. |
| **BR-013** | Chat list is sorted by latest-message time, newest first. | Surfaces active conversations. |
| **BR-014** | Message history is shown oldest-to-newest within the opened conversation. | Maintains natural reading order. |
| **BR-015** | Initial history load is the latest 50 messages; older messages load progressively. | Controls history pagination. |
| **BR-016** | Tour Agency sees only conversations with Local Providers; Local Provider sees only conversations with Tour Agencies. | Enforces role-specific communication model. |
| **BR-017** | Unread count resets when the user opens the relevant Chat according to the current Function List rule. | Keeps Chat list state current. |
| **BR-018** | Chat does not itself create a Booking. | Booking remains Local Provider-controlled. |
| **BR-019** | Only a participant of the Chat may close that Chat session. | Prevents unauthorized lifecycle changes. |
| **BR-020** | Closing a Chat does not delete its messages, attachments or conversation history. | Preserves collaboration records. |
| **BR-021** | A Closed Chat does not accept new messages or attachments unless it is explicitly reopened according to the defined business rule. | Maintains clear Chat lifecycle state. |

**6. Key entities (mandatory)**

| **Entity**           | **Attributes from Input/Output**                                                                                          | **Relationships**                       |
|----------------------|---------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| **Chat Session**     | chat_session_id, initiator_id, participants, start_time, **status, closed_at, closed_by**, source, last_message_timestamp | has two participants and many messages  |
| **Chat Participant** | user_id, role, organization                                                                                               | belongs to Chat Session                 |
| **Chat Message**     | message_id, chat_session_id, sender_id, text, sent_at                                                                     | belongs to one Chat Session and sender  |
| **Chat Context**     | experience_id, booking_id, source                                                                                         | optionally associated with Chat Session |
| **Chat List Entry**  | chat_session_id, participant_name, organization, last_message_preview, last_message_at, unread_count                      | derived per logged-in user              |
| **Unread State**     | user_id, chat_session_id, unread_count                                                                                    | belongs to one participant/chat pair    |
| **Message Cursor**   | before_cursor, has_more_messages                                                                                          | supports history pagination             |
| **Chat Attachment**  | attachment_id, chat_session_id, message_id, uploaded_by, source_type, file_name, file_type, file_size, active_reference_id, created_at | belongs to one Chat Session and one Chat Message |

**7. Screens involved**

| **Screen ID** | **Screen name** | **Priority** | **Screen Spec file**          |
|---------------|-----------------|--------------|-------------------------------|
| COM048        | Chat            | Should       | screens/screen-spec-COM048.md |
| COM065        | Chat            | Should       | screens/screen-spec-COM065.md |
| COM125        | Attach Document | Should       | screens/screen-spec-COM125.md |
| COM126        | Attach Document | Should       | screens/screen-spec-COM126.md |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                                 | **How it is measured**                                                       |
|------------|---------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| **SC-001** | Tour Agency and Local Provider can open/reuse an authorized conversation.                                     | Open the same participant conversation more than once and verify continuity. |
| **SC-002** | A non-participant cannot read or send messages in another user's Chat.                                        | Attempt Chat access using an unrelated account.                              |
| **SC-003** | A successfully sent message appears in stored Chat history with sender and timestamp.                         | Send a test message and reload the conversation.                             |
| **SC-004** | Chat history persists after logout and later login.                                                           | Send messages, logout, return and reopen Chat.                               |
| **SC-005** | An authorized Tour Agency or Local Provider can attach supported documents to an active Chat and the attachments remain visible in the persisted conversation history. | Attach valid documents, reload the Chat and verify that the attachments remain accessible. |
| **SC-006** | Chat list is ordered by the latest conversation activity.                                                     | Send messages in multiple conversations and inspect ordering.                |
| **SC-007** | Opening a Chat updates its unread state according to the defined rule.                                        | Create unread messages and open the conversation.                            |
| **SC-008** | Conversations with more than 50 messages initially show only the latest page and allow older history to load. | Use a seeded Chat with more than 50 messages.                                |
| **SC-009** | Agency accounts see Provider conversations only and Provider accounts see Agency conversations only.          | Inspect Chat list using each actor type.                                     |
| **SC-010** | Experience or Booking context can open the relevant conversation without creating or modifying a Booking automatically. | Trigger Chat from each supported context and inspect Chat and Booking records. |
| **SC-011** | An authorized participant can close an active Chat session.                                                   | Close a Chat using Agency and Provider accounts.                             |
| **SC-012** | A non-participant cannot close another user's Chat.                                                           | Attempt close using unrelated account.                                       |
| **SC-013** | Closing a Chat preserves all existing message history.                                                        | Close Chat, reopen/view history and compare messages.                        |
| **SC-014** | A Closed Chat cannot accept new messages unless reopening is explicitly supported.                            | Attempt to send into a Closed Chat.                                          |
| **SC-015** | Unsupported file formats or files larger than 25 MB are rejected before attachment. | Attempt to attach an invalid format and an oversized file. |

**9. Assumptions**

- A Chat is one-to-one between a Tour Agency and a Local Provider.

- Chat sessions persist across login sessions while active and remain stored after being closed.

- Closing a Chat changes its lifecycle state but does not delete the conversation or its messages.

- Leaving the Chat UI does not delete or permanently close the conversation.

- Context such as Experience or Booking IDs is metadata associated with Chat rather than a message attachment.

- COM048 and COM065 are the primary Chat screens.

- COM125 and COM126 are supporting MVP screens for document attachment.

- Attachments are stored as Chat-related records and follow the authorization rules of the parent Chat session.

- System-generated Booking update messages may appear in Chat, but their generation logic belongs to Schedule/Booking rather than F-CHAT.

- The 30-minute inactivity concept used by AI Matching's learning loop does not automatically mean that the persistent Chat conversation is deleted or closed.

**10. Open questions**

| **\#** | **Question**                                                                                                                                                                       | **Blocking?** | **Owner**   | **Status** | **Answer/Decision**                                                                                                                                            |
|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|-------------|------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What is the maximum allowed message_text length?                                                                                                                                   | **Yes**       | BA / Tech   | Closed     | 2,000 characters.                                                                                                                                              |
| 2      | The Function List allows Local Provider as an actor but source only lists AI Matching, Explore and Provider Profile. What source value represents a Local Provider-initiated Chat? | **Yes**       | BA          | Open       | **"Booking Management"** (Schedule) or **"Agency Profile"**, or Add Chat opened from the Chat button as a source value.                                        |
| 3      | Which exact UI entry point allows Local Provider to initiate a new Chat with an Agency?                                                                                            | **Yes**       | UI/UX / BA  | Closed     | Local Provider can initiate a new Chat from the **Agency Profile** screen via the **“Chat”** action, or through a "Chat" button on the Booking Details screen. |
| 4      | When deciding whether an existing Chat should be reused, is uniqueness based only on Agency + Provider, or Agency + Provider + Experience/context?                                 | **Yes**       | BA / Tech   | Closed     | **Agency + Provider + Experience** (context-specific threading is required to avoid mixing different negotiations).                                            |
| 5      | If the same Agency and Provider discuss multiple Experiences, should they share one conversation or separate Experience-specific chats?                                            | **Yes**       | Client / BA | Closed     | One Conversation                                                                                                                                               |
| 6      | F-CHAT-01 includes optional booking_id, but no current entry point opens Chat from a Booking. Should Booking be added as a source or should booking_id be removed?                 | No            | BA          | Closed     | **Add Booking as a source.** Post-booking communication is a critical real-world workflow.                                                                     |
| 7      | What exact context message is auto-populated when Chat is opened from AI Matching or Explore?                                                                                      | No            | BA / UI     | Closed     | A system-generated message block containing the Experience Name, link, and a standard greeting (e.g., "I am interested in this experience").                   |
| 10     | Is unread count tracked per message or maintained as a conversation-level counter?                                                                                                 | No            | Tech        | Closed     | Maintained as a conversation-level counter.                                                                                                                    |
| 11     | Does opening a conversation immediately mark all loaded messages as read?                                                                                                          | No            | BA / Tech   | Closed     | Yes. Opening the conversation immediately resets the counter to 0.                                                                                             |
| 12     | Is a separate “read receipt” (Seen) required per message? Current F-CHAT functions do not define one.                                                                              | No            | BA          | Closed     | No. A per-message read receipt (Seen) is out of scope for MVP.                                                                                                 |
| 13     | Should Chat support explicit archived conversations, or are all persistent Chats permanently visible in the list?                                                                  | No            | Product     | Closed     | Permanently visible in the list (sorted by most recent). Archiving is out of scope for MVP.                                                                    |
| 14     | After a Chat is Closed, can either participant reopen the same session, or must a new Chat session be created?                                                                     | Yes           | BA / Client | Closed     | Participant reopen the same session                                                                                                                            |
| 15     | If the same Agency and Provider start Chat again after a previous session was Closed, should the old history remain in the same thread or a new thread?                            | Yes           | BA / Client | Closed     | The old history remain in the same thread                                                                                                                      |
| 16     | Is a close reason required or optional?                                                                                                                                            | No            | BA          | Closed     | Optional.                                                                                                                                                      |
| 17     | Does 30-minute inactivity in F-MATCH-13 only end the AI learning window, or can it ever automatically close F-CHAT-04?                                                             | Yes           | BA / AI     | Closed     | It **only** ends the learning analysis window. It does NOT automatically close the Chat session.                                                               |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                 |
|--------------------------------|----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – In-app Chat**                                                              |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Tour Agency flow: “Choose Interaction” → “Input Message” → “Communicate via Chat”; Local Provider Chat flow** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 7: In-app Chat – UC-COM-01 Chat**                                                                                                 |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-CHAT-01 .. F-CHAT-05**                                                                                                                   |
| **7. Screens**                 | Screen List                | **sheet ST, COM048, COM065, COM125, COM126**                                                                                                                                 |
