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

- Open Chat from Provider Profile, Quote Request or Booking context where permitted.

- Associate relevant Experience or Booking context with a conversation where applicable.

- Send text messages.

- Support plain text and basic markdown such as bold and italic.

- Upload 1–5 supported documents to an active Chat.

- Attach uploaded documents to the current Chat conversation.

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

F-CHAT-01 explicitly references permission validation through F-AUTH-16. Tour Agency may initiate Chat from AI Matching, Explore or Provider Profile; Local Provider may initiate only when an existing Quote Request or Booking establishes valid business context.

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

## Given a Tour Agency initiates Chat from AI Matching, Explore or Provider Profile, when permission is granted, then the system reuses the existing Active Chat for the Agency–Local Provider pair or creates a new Active Chat if none exists.

## Given a Local Provider initiates Chat, then an existing Quote Request or Booking with that Agency must establish the valid business context before an Active Chat may be reused or created.

## Given the actor is not a participant or does not have permission, when Chat access is attempted, then access is denied.

## Given Chat is opened with Experience, Quote Request or Booking context, then that identifier is retained as conversation/business context and does not create a separate Chat thread.

## Given Chat is initiated from AI Matching or Explore, then contextual information may be pre-populated into the conversation.

## Given a participant sends non-empty supported text, when Send is selected, then the message is stored with sender and timestamp and becomes part of Chat history.

## Given a participant uses supported basic markdown, then bold/italic formatting may be rendered.

## Given an authorized participant uploads 1–5 supported documents, when the attachment action succeeds, then the documents are attached to the active Chat and become part of the persistent conversation history.

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

## An uploaded file exceeds the 10 MB per-file limit.

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
| **FR-001** | F-CHAT-01                | Open or create an Active Chat between a Tour Agency and Local Provider according to valid initiation context; reuse the existing Active Chat for the Agency–Local Provider pair, while Experience / Quote Request / Booking identifiers remain context only. Closed Chats are never reopened. | Tour Agency / Local Provider | Should       |
| **FR-002** | F-CHAT-02                | Allow only Chat participants to send supported text messages and store each message in the conversation history.                                               | Tour Agency / Local Provider | Should       |
| **FR-003** | F-CHAT-03                | Display the logged-in user's Chat list and authorized message history with unread counts and pagination.                                                       | Tour Agency / Local Provider | Should       |
| FR-004     | F-CHAT-04                | Allow an authorized Tour Agency or Local Provider participant to close an active Chat session while retaining its existing conversation history.               | Tour Agency / Local Provider | Should       |
| **FR-005** | F-CHAT-05                | Allow an authorized Chat participant to upload 1–5 supported documents and attach them to an Active Chat session after participant and file validation. | Tour Agency / Local Provider | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field**    | **Type**                                       | **Required** | **Output field**       | **Type**                                                                   | **Notes / validation**                                   |
|------------|--------------------|------------------------------------------------|--------------|------------------------|----------------------------------------------------------------------------|----------------------------------------------------------|
| **FR-001** | initiator_id       | ID                                             | Yes          | chat_session_id        | ID                                                                         | Taken from authenticated session.                        |
|            | recipient_id       | ID                                             | Yes          | chat_status            | Enum\[Active\]                                                            | At most one Active Chat exists for an Agency–Local Provider pair. |
|            | source             | Enum\[AI Matching, Explore, Provider Profile, Quote Request, Booking\] | Yes | is_new_session | Boolean | False when an Active Chat already exists for the Agency–Local Provider pair; true when a new Active Chat is created. |
|            | experience_id      | ID                                             | No           |                        |                                                                            | Context only; does not define a separate Chat thread.     |
|            | quote_request_id   | ID                                             | Conditional  |                        |                                                                            | Required when source = Quote Request.                     |
|            | booking_id         | ID                                             | Conditional  |                        |                                                                            | Required when source = Booking.                           |
|            | permission_granted | Boolean                                        | Yes          |                        |                                                                            | Result of F-AUTH-16. Tour Agency may initiate from AI Matching, Explore or Provider Profile; Local Provider initiation requires an existing Quote Request or Booking context. |
| **FR-002** | chat_session_id    | ID                                             | Yes          | message_id             | ID                                                                         | Chat must be Active and sender must belong to Chat.       |
|            | message_text       | Text, plain text + bold/italic markdown, max 4000 characters | Yes | sent_at | DateTime | Must not be empty. |
|            | sender_id          | ID                                             | Yes          | last_message_timestamp | DateTime                                                                   | From authenticated session.                              |
|            | permission_granted | Boolean                                        | Yes          |                        |                                                                            | Verified through F-AUTH-16.                              |
| **FR-003** | user_id            | ID                                             | Yes          | chat_list              | Array<Object{chat_session_id, chat_status: Enum\[Active, Closed\], participant_name, organization, last_message_preview?, last_message_at?, unread_count}> | Sorted most recent first. |
|            | role               | Enum\[Tour Agency, Local Provider\]          | Yes          | message_history        | Array<Object{message_id, text?, attachments?: Array<Object{attachment_id, file_name, file_type, file_size}>, sender_name, sent_at}> | Optional — returned when chat_session_id is provided; 50 messages per page, chronological oldest → newest. |
|            | chat_session_id    | ID                                             | No           | has_more_messages      | Boolean                                                                    | Optional — returned when chat_session_id is provided.     |
|            | before_cursor      | String                                         | No           |                        |                                                                            | Loads older messages.                                     |
|            | permission_granted | Boolean                                        | Yes          |                        |                                                                            | User cannot access another user's Chat.                   |
| **FR-004** | chat_session_id    | ID                                             | Yes          | chat_session_id        | ID                                                                         | Chat must be Active.                                     |
|            | closed_by          | ID                                             | Yes          | chat_status            | Enum\[Closed\]                                                            | Closed is terminal for that Chat session and cannot be reopened. |
|            | permission_granted | Boolean                                        | Yes          | closed_at              | DateTime                                                                   | Verified through F-AUTH-16.                              |
|            | close_reason       | Text                                           | No           | closed_by              | ID                                                                         | Optional.                                                |
|            |                    |                                                |              | success_message        | String                                                                     | Existing history is retained.                            |
| **FR-005** | chat_session_id    | ID                                             | Yes          | message_id             | ID                                                                         | Chat must be Active.                                     |
|            | sender_id          | ID                                             | Yes          | attachments            | Array<Object{attachment_id, file_name, file_type, file_size}>              | Sender must be a participant.                            |
|            | files              | Array<File>, 1–5 files; PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG; max 10 MB/file | Yes | sent_at | DateTime | Direct uploaded files only. |
|            | permission_granted | Boolean                                        | Yes          |                        |                                                                            | Verified through F-AUTH-16.                              |

**5.2 Business rules**

| **Rule ID** | **Rule** | **Why it exists** |
|-------------|----------|-------------------|
| **BR-001** | Chat is available only between Tour Agency and Local Provider actors. | Limits communication to intended collaboration participants. |
| **BR-002** | A user may access only Chat sessions in which they are a participant. | Prevents conversation data leakage. |
| **BR-003** | F-AUTH-16 permission must be satisfied before Chat access, messaging or document attachment. | Enforces authorization. |
| **BR-004** | At most one Active Chat exists for an Agency–Local Provider pair at a time. If an Active Chat already exists, it is reused; Experience, Quote Request and Booking identifiers provide context only and do not define separate threads. | Maintains conversation continuity without context-specific duplicate threads. |
| **BR-005** | Active Chat sessions persist across user login sessions until an authorized participant closes the Chat. | Preserves long-running negotiation history. |
| **BR-006** | Messages are stored as immutable history in MVP; users cannot edit or delete them. | Maintains communication traceability. |
| **BR-007** | MVP Chat supports plain text plus basic bold/italic markdown. | Defines the supported text-messaging scope. |
| **BR-008** | Chat supports document attachments for authorized Tour Agency and Local Provider participants. | Supports B2B document exchange within collaboration. |
| **BR-009** | Only PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG and PNG files are supported. Each attachment action accepts 1–5 files, with a maximum size of 10 MB per file. | Defines the MVP attachment boundary. |
| **BR-010** | Between 1 and 5 documents may be attached in a single attachment action. | Supports COM125/COM126 multi-select behavior within the current Function List limit. |
| **BR-011** | Attached documents become part of persistent Chat history and follow the same participant-access rules as the parent Chat session. | Maintains security and communication traceability. |
| **BR-012** | Chat/Experience/Booking context is an association to the conversation, not a document attachment. | Distinguishes contextual metadata from uploaded documents. |
| **BR-013** | Chat list is sorted by latest-message time, newest first. | Surfaces active conversations. |
| **BR-014** | Message history is shown oldest-to-newest within the opened conversation. | Maintains natural reading order. |
| **BR-015** | Initial history load is the latest 50 messages; older messages load progressively. | Controls history pagination. |
| **BR-016** | Tour Agency sees only conversations with Local Providers; Local Provider sees only conversations with Tour Agencies. | Enforces role-specific communication model. |
| **BR-017** | For MVP, unread count resets when the user opens the relevant Chat. This is a BA/UI decision layered on top of the Function List's unread-count display behavior. | Keeps Chat list state current without overstating the Function List contract. |
| **BR-018** | Chat does not itself create a Booking. | Booking remains Local Provider-controlled. |
| **BR-019** | Only a participant of the Chat may close that Chat session. | Prevents unauthorized lifecycle changes. |
| **BR-020** | Closing a Chat does not delete its messages, attachments or conversation history. | Preserves collaboration records. |
| **BR-021** | A Closed Chat is terminal and immutable. It cannot be reopened and cannot accept new messages or attachments. If the same Agency and Local Provider need to communicate again, F-CHAT-01 creates a new Active Chat while retaining the historical Closed Chat. | Maintains clear Chat lifecycle state and preserves history. |
| **BR-022** | A Local Provider may initiate a new Chat with an Agency only when an existing Quote Request or Booking establishes valid business context. | Prevents unsolicited Provider-initiated conversations outside an established collaboration context. |

**6. Key entities (mandatory)**

| **Entity**           | **Attributes from Input/Output**                                                                                          | **Relationships**                       |
|----------------------|---------------------------------------------------------------------------------------------------------------------------|-----------------------------------------|
| **Chat Session**     | chat_session_id, initiator_id, participants, start_time, **status, closed_at, closed_by**, source, last_message_timestamp | has two participants and many messages  |
| **Chat Participant** | user_id, role, organization                                                                                               | belongs to Chat Session                 |
| **Chat Message**     | message_id, chat_session_id, sender_id, text, sent_at                                                                     | belongs to one Chat Session and sender  |
| **Chat Context**     | experience_id, quote_request_id, booking_id, source                                                                       | optionally associated with Chat Session |
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
| **SC-001** | The system keeps at most one Active Chat per Agency–Local Provider pair and reuses that Active Chat when valid context exists. | Open the same participant pair from multiple permitted contexts and verify that no duplicate Active Chat is created. |
| **SC-002** | A non-participant cannot read or send messages in another user's Chat.                                        | Attempt Chat access using an unrelated account.                              |
| **SC-003** | A successfully sent message appears in stored Chat history with sender and timestamp.                         | Send a test message and reload the conversation.                             |
| **SC-004** | Chat history persists after logout and later login.                                                           | Send messages, logout, return and reopen Chat.                               |
| **SC-005** | An authorized Tour Agency or Local Provider can attach supported documents to an active Chat and the attachments remain visible in the persisted conversation history. | Attach valid documents, reload the Chat and verify that the attachments remain accessible. |
| **SC-006** | Chat list is ordered by the latest conversation activity.                                                     | Send messages in multiple conversations and inspect ordering.                |
| **SC-007** | Opening a Chat updates its unread state according to the defined rule.                                        | Create unread messages and open the conversation.                            |
| **SC-008** | Conversations with more than 50 messages initially show only the latest page and allow older history to load. | Use a seeded Chat with more than 50 messages.                                |
| **SC-009** | Agency accounts see Provider conversations only and Provider accounts see Agency conversations only.          | Inspect Chat list using each actor type.                                     |
| **SC-010** | Experience, Quote Request or Booking context is associated with the relevant Active conversation without creating separate context-specific Chat threads or creating/modifying a Booking automatically. | Trigger Chat from supported contexts and inspect Chat/thread and Booking records. |
| **SC-011** | An authorized participant can close an active Chat session.                                                   | Close a Chat using Agency and Provider accounts.                             |
| **SC-012** | A non-participant cannot close another user's Chat.                                                           | Attempt close using unrelated account.                                       |
| **SC-013** | Closing a Chat preserves all existing message history.                                                        | Close Chat, reopen/view history and compare messages.                        |
| **SC-014** | A Closed Chat cannot accept new messages or attachments and cannot be reopened; a later interaction between the same parties creates a new Active Chat. | Attempt to send/attach to a Closed Chat and then initiate a later valid interaction. |
| **SC-015** | Unsupported file formats, more than 5 files in one action, or files larger than 10 MB are rejected before attachment. | Attempt invalid formats, too many files and oversized files. |

**9. Assumptions**

- A Chat is one-to-one between a Tour Agency and a Local Provider.

- Chat sessions persist across login sessions while active and remain stored after being closed; Closed sessions are never reopened, and later interaction creates a new Active Chat.

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
| 1      | What is the maximum allowed message_text length?                                                                                                                                   | **Yes**       | BA / Tech   | Closed     | 4,000 characters. |
| 2      | The Function List allows Local Provider as an actor but source only lists AI Matching, Explore and Provider Profile. What source value represents a Local Provider-initiated Chat? | **Yes**       | BA          | Closed     | Canonical source values are **AI Matching, Explore, Provider Profile, Quote Request, Booking**. A Local Provider may initiate only when an existing **Quote Request** or **Booking** establishes valid business context. |
| 3      | Which exact UI entry point allows Local Provider to initiate a new Chat with an Agency?                                                                                            | **Yes**       | UI/UX / BA  | Closed     | A Local Provider may initiate Chat only from a valid **Quote Request** or **Booking** context. Generic initiation from Agency Profile is not part of the current Function List. |
| 4      | When deciding whether an existing Chat should be reused, is uniqueness based only on Agency + Provider, or Agency + Provider + Experience/context?                                 | **Yes**       | BA / Tech   | Closed     | Uniqueness is based on the **Agency–Local Provider Active pair**. Experience, Quote Request and Booking are context only and do not create separate Chat threads. |
| 5      | If the same Agency and Provider discuss multiple Experiences, should they share one conversation or separate Experience-specific chats?                                            | **Yes**       | Client / BA | Closed     | They share the same **Active Chat** for that Agency–Local Provider pair; different Experience contexts are appended to that conversation rather than creating Experience-specific threads. |
| 6      | F-CHAT-01 includes optional booking_id, but no current entry point opens Chat from a Booking. Should Booking be added as a source or should booking_id be removed?                 | No            | BA          | Closed     | **Booking is a canonical source**, and **Quote Request** is also a canonical source. `booking_id` is required when source = Booking; `quote_request_id` is required when source = Quote Request. |
| 7      | What exact context message is auto-populated when Chat is opened from AI Matching or Explore?                                                                                      | No            | BA / UI     | Closed     | The current Function List supports carrying Experience / Quote Request / Booking context but does not define a mandatory greeting sentence. Any greeting copy is treated as UI copy rather than a canonical business rule. |
| 10     | Is unread count tracked per message or maintained as a conversation-level counter?                                                                                                 | No            | Tech        | Closed     | Maintained as a conversation-level counter.                                                                                                                    |
| 11     | Does opening a conversation immediately mark all loaded messages as read?                                                                                                          | No            | BA / Tech   | Closed     | Yes. Opening the conversation immediately resets the counter to 0.                                                                                             |
| 12     | Is a separate “read receipt” (Seen) required per message? Current F-CHAT functions do not define one.                                                                              | No            | BA          | Closed     | No. A per-message read receipt (Seen) is out of scope for MVP.                                                                                                 |
| 13     | Should Chat support explicit archived conversations, or are all persistent Chats permanently visible in the list?                                                                  | No            | Product     | Closed     | Permanently visible in the list (sorted by most recent). Archiving is out of scope for MVP.                                                                    |
| 14     | After a Chat is Closed, can either participant reopen the same session, or must a new Chat session be created?                                                                     | Yes           | BA / Client | Closed     | **No.** A Closed Chat session is terminal and cannot be reopened. A later valid interaction creates a **new Active Chat** through F-CHAT-01. |
| 15     | If the same Agency and Provider start Chat again after a previous session was Closed, should the old history remain in the same thread or a new thread?                            | Yes           | BA / Client | Closed     | The old Closed Chat remains available as immutable history, while the later interaction occurs in a **new Active Chat**. |
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
