**Spec Document: Profile Management**

| **Field**                 | **Value**                                                                                                                                                                                                            |
|---------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Module ID                 | PRF                                                                                                                                                                                                                  |
| Module name               | Profile Management                                                                                                                                                                                                   |
| Spec version              | v0.1                                                                                                                                                                                                                 |
| Author (team member)      | Group G                                                                                                                                                                                                              |
| Date                      | 22/09/2026                                                                                                                                                                                                           |
| Status                    | Clarified                                                                                                                                                                                                            |
| Approved by (Client role) |                                                                                                                                                                                                                      |
| DBIZ2 source              | Function List rows **F-PROFILE-01 .. F-PROFILE-07**; Use Case **UC-PRO-01 .. UC-PRO-06**; Screens **PRF019, PRF021, PRF127, PRF128, DSC122, DSC123, EXP067, EXP068, EXP069, EXP070, EXP132, VER146, VER119** |

**1. Purpose and scope (mandatory)**

> The Profile Management module allows Tour Agencies and Local Providers to maintain their own business information while controlling what profile information other actors are allowed to view. It also manages Local Provider Experiences, Provider profile verification by UBND, and optional AI-assisted description refinement.

**In scope**

- View Agency profile according to actor-specific visibility rules.

- Tour Agency updates its own Agency profile.

- View Local Provider profile according to actor-specific visibility rules.

- Local Provider updates its own business profile and media.

- UBND reviews and verifies Local Provider profiles within its assigned village.

- Local Provider creates, updates and deletes Experiences.

- Manage Experience pricing, capacity, images and booking conditions.

- Generate AI-refined Provider or Experience descriptions for Local Provider review.

- Feed saved Experience/Profile information to Explore and AI Tour Matching where applicable.

**Out of scope**

- User account creation, login, password or account-status management.

- HDT/UBND editing Agency or Local Provider business/profile content.

- Local Provider account creation.

- Booking creation or booking lifecycle management.

- Manual creation of On hold / Booked schedule blocks.

- Explore ranking logic.

- AI Tour Matching recommendation logic.

- Automatic publication of AI-generated descriptions without Provider approval.

**Depends on**

| **Dependency**                                     | **Purpose**                                                                                       |
|----------------------------------------------------|---------------------------------------------------------------------------------------------------|
| **AUT – Authentication, Access & User Management** | Role, ownership and data-scope checks before viewing/editing protected profile information.       |
| **Schedule/Booking**                               | Source of operational availability where profile/detail screens display availability information. |
| **Cloudinary**                                     | Provider and Experience image upload/optimization.                                                |
| **OpenAI API / AI Engine**                         | AI Description Refinement for F-PROFILE-07.                                                       |

**2. Actors (mandatory)**

| **Actor**          | **Role in this module**                                                                  | **Where it comes from**                                |
|--------------------|------------------------------------------------------------------------------------------|--------------------------------------------------------|
| **Tour Agency**    | Primary actor for managing own Agency profile and viewing Provider profiles              | F-PROFILE-01, F-PROFILE-02, F-PROFILE-03               |
| **Local Provider** | Primary actor for managing own Provider profile, Experiences and AI-refined descriptions | F-PROFILE-03, F-PROFILE-04, F-PROFILE-06, F-PROFILE-07 |
| **UBND Admin**     | Reviews Provider information and verifies Provider profiles within assigned village      | F-PROFILE-03, F-PROFILE-05                             |
| **HDT Admin**      | Has full-detail read access to profiles but does not edit business/profile content       | F-PROFILE-01, F-PROFILE-03                             |
| **Guest**          | Views only information permitted for public access                                       | F-PROFILE-01, F-PROFILE-03                             |
| **System**         | Generates AI-refined description drafts and enforces visibility/update rules             | F-PROFILE-07 + F-AUTH-16                               |

**3. User scenarios and acceptance criteria (mandatory)**

## **US-1 (P2): Manage Agency Profile — UC-PRO-01**

**Journey.** As a Tour Agency, I want to view and update my own Agency profile so that my business information remains accurate.

### **Acceptance scenarios**

1.  Given the Agency is authenticated and opens its own profile, when the profile loads, then the Agency sees its permitted full profile information.

2.  Given valid profile changes, when the Agency saves them, then the updated information and update timestamp are recorded.

3.  Given an Agency attempts to edit another Agency's profile, when the update is submitted, then the action is denied.

4.  Given an Approved Agency changes Company Name or Tax ID, when the Agency saves the change, then the change is stored as a pending major-change review for HDT. The Agency account remains Approved and operational, and the currently approved legal information remains effective until HDT approves the proposed change.

UC-PRO-01 maps to F-PROFILE-01 and F-PROFILE-02.

## **US-2 (P2): View Agency Profile — UC-PRO-02**

**Journey.** As an authorized platform user or Guest, I want to view permitted Agency information so that I can understand the Agency without accessing restricted information.

### **Acceptance scenarios**

1.  Given an actor opens an Agency profile, when the profile is displayed, then only fields permitted for that actor are shown.

2.  Given HDT views an Agency, then HDT receives the full permitted Agency detail.

3.  Given Guest, UBND or another non-owner actor views an Agency, then restricted Agency information such as Tax ID is not exposed unless explicitly permitted by the visibility rules.

4.  No view-only actor can modify the Agency profile from this use case.

## **US-3 (P1): View Local Provider Profile — UC-PRO-03**

**Journey.** As a Tour Agency, I want to view Local Provider information so that I can evaluate whether the Provider and its Experiences fit my tour needs.

### **Acceptance scenarios**

1.  Given an authenticated Tour Agency selects a Local Provider, when the profile loads, then the Agency sees the full Provider information permitted to Tour Agencies.

2.  Given a Local Provider views its own profile, then its full editable business information is available.

3.  Given another Local Provider views the profile, restricted information such as pricing/contact is not exposed where prohibited.

4.  Given a Guest accesses Provider information, then only public/basic information is shown.

Guest accesses Provider information through the dedicated DSC123 Public Provider Profile and sees public/basic information only. Restricted Provider information such as pricing, private contact information and verification data is not exposed to Guest.

## **US-4 (P1): Manage Provider Profile — UC-PRO-04**

**Journey.** As a Local Provider, I want to complete and update my own Provider profile so that UBND can verify it and Agencies can view accurate information.

### **Acceptance scenarios**

1.  Given the Local Provider is authenticated, when it opens its own profile, then its existing profile information is displayed.

2.  Given the Provider saves an incomplete profile, when Save Changes is selected, then the entered information is stored and profile_verification_status remains Draft.

3.  Given an uploaded image violates the supported file/size/resolution rules, when Save is attempted, then the invalid image is rejected.

4.  Given the Provider chooses AI Refinement, when a description is submitted, then an AI-refined draft is returned without automatically replacing the original text.

5.  Given the Provider accepts or edits the AI draft, only then may it become the saved description.

6.  Given all required Provider profile fields are complete, when Save Changes succeeds for the first completed profile, then the profile is automatically submitted to UBND and profile_verification_status becomes Pending Verification.

7.  Given a previously Verified Provider changes Business Name, Craft Type or Business Registration, when Save Changes succeeds, then the edited revision enters Pending Verification while the last Verified profile version remains publicly visible and continues to be used by Explore and AI Tour Matching.

8.  Given the Provider updates operating_hours, when the profile is saved, then the recurring weekly operating hours become the baseline operating window consumed by F-SCHED-09 for availability calculation.

The current Sequence Diagram includes Provider profile update and optional AI refinement.

## **US-5 (P1): Manage Experiences — UC-PRO-05**

**Journey.** As a Local Provider, I want to manage my Experiences, pricing, media and booking conditions so that Agencies can discover accurate offerings.

### **Acceptance scenarios**

1.  Given valid Experience data, when the Provider creates an Experience, then the Experience is saved under that Provider.

2.  Each Experience must include at least three required image categories: **Activity/Experience**, **Space/Location**, and **Product/Result**.

3.  Given price_per_person \<= 0, max_participants \<= 0, or notice_period \< 0, when Save is attempted, then validation fails.

4.  The Provider can update only its own Experiences.

5.  Given Delete is requested:
    - if the Experience has an On hold or Booked Booking, deletion is blocked;
    - if it is referenced only by Completed or Cancelled historical Bookings, the Experience is archived;
    - if it has no Booking references, it may be permanently deleted.

6.  Given an Experience has an On hold or Booked Booking, price_per_person, group_discounts, special_rates, group_size, max_participants, duration and experience_location_address are read-only during edit. Description, images, notice_period and cancellation_policy remain editable.

7.  Given the Provider attempts to delete the last image in Activity/Experience, Space/Location or Product/Result category, the deletion is blocked until a replacement image exists in the same category.

8.  Changes to an Experience belonging to a Verified Provider go live immediately and do not trigger full Provider-profile re-verification.

9.  AI Refinement may be used for an Experience description, but the generated draft cannot replace the original automatically.

F-PROFILE-06 defines Experience creation/edit/delete together with pricing, capacity, image and booking-condition management.

## **US-6 (P1): Verify Provider Profile — UC-PRO-06**

**Journey.** As a UBND Admin, I want to review Provider profiles in my assigned village so that only reviewed Providers become Verified.

### **Acceptance scenarios**

1.  Given a Provider in the UBND's assigned village has submitted a completed profile, when UBND opens it for review, then its submitted profile information is displayed.

2.  When UBND selects **Approve**, then profile_verification_status = Verified.

3.  When UBND selects **Request Revision**, then profile_verification_status = Revision Required and the revision comments are available to the Provider.

4.  Given the Provider belongs to another village, when UBND attempts verification, then access is denied.

5.  UBND cannot directly edit Provider profile content while reviewing it.

6.  Only Verified Provider profiles are eligible for public display and use in Explore / AI Tour Matching.

UC-PRO-06 maps directly to F-PROFILE-05.

### **Edge cases**

- Two users attempt to update the same Provider profile at the same time.

- UBND opens a Provider profile that was changed after it was submitted for review.

- Provider submits fewer than three required Experience images.

- AI refinement service is unavailable.

- Image upload succeeds but profile save fails, or vice versa.

- A Verified Provider makes a major change after verification.

- An Experience is referenced by active or historical bookings when deletion is requested.

- An Experience with active bookings is edited: price/capacity/date-sensitive fields are locked per BR-014; other fields (description, images, policies) remain editable.

- Provider tries to delete the last image in a required category before uploading a replacement: blocked per BR-015 until a replacement in the same category is uploaded.

**4. Flows (mandatory)**

**4.1 Usage flow**

**MERMAID**

> graph TD
>
> classDef default fill:#FFFFFF,stroke:#000000,stroke-width:1.5px,color:#000000;
>
> classDef startend fill:#FFFFFF,stroke:#000000,stroke-width:2.5px,color:#000000;
>
> subgraph Agency_Flow \["Actor: Tour Agency"\]
>
> TA_Start(\["0. Start: Tour Agency"\])
>
> TA1\["1. Access Agency Profile"\]
>
> TA2\[/"2. Update Contact & Preferences"/\]
>
> TA3\["3. Save to Database"\]
>
> TA_End(\["4. End"\])
>
> TA_Start --\> TA1 --\> TA2 --\> TA3 --\> TA_End
>
> end
>
> subgraph Provider_Flow \["Actor: Local Provider"\]
>
> LP_Start(\["0. Start: Local Provider"\])
>
> LP1\["1. Access Experience Profile"\]
>
> LP2\[/"2. Update Details & Pricing"/\]
>
> LP3\[/"3. Upload Media (Min 3 images)\nAuto-crop 16:9/4:3"/\]
>
> LP4\["4. Save to Database"\]
>
> LP_End(\["5. End"\])
>
> LP_Start --\> LP1 --\> LP2 --\> LP3 --\> LP4 --\> LP_End
>
> end
>
> subgraph ReadOnly_Flow \["Actor: Admin (Read-Only)"\]
>
> RO_Start(\["0. Start: Admin"\])
>
> RO1\["1. Access Target Profile"\]
>
> RO2\["2. View Profile Details\n(No Edit Rights)"\]
>
> RO_End(\["3. End"\])
>
> RO_Start --\> RO1 --\> RO2 --\> RO_End
>
> end
>
> class TA_Start,TA_End,LP_Start,LP_End,RO_Start,RO_End startend;

**4.2 Sequence for the main flow**

**MERMAID**

sequenceDiagram

title Module 2: Profile Management

actor Agency as Tour Agency

participant Frontend

participant Backend

participant Database

Note over Agency, Database: UC-PRO-02: View Agency Profile

Agency-\>\>Frontend: Open Profile

Frontend-\>\>Backend: getAgencyProfile(agencyId)

Backend-\>\>Database: getAgencyProfile(agencyId)

Database--\>\>Backend: profileData

Backend--\>\>Frontend: profileData

Frontend--\>\>Agency: Display Agency Profile

Note over Agency, Database: UC-PRO-01: Manage Agency Profile

Agency-\>\>Frontend: Edit Profile Information

Agency-\>\>Frontend: Save Profile

Frontend-\>\>Backend: saveAgencyProfile(profileData)

Backend-\>\>Database: saveAgencyProfile(profileData)

Database--\>\>Backend: profileSaved

Backend--\>\>Frontend: saveSuccess

Frontend--\>\>Agency: Display updated profile

sequenceDiagram

title Module 2: Profile Management

actor LP as Local Provider

actor Admin

participant Frontend

participant Backend

participant Database

Note over LP, Database: UC-PRO-03 - View Local Provider Profile

LP-\>\>Frontend: Open Profile

Frontend-\>\>Backend: getProviderProfile(lpId)

Backend-\>\>Database: getProviderProfile(lpId)

Database--\>\>Backend: profileData

Backend--\>\>Frontend: profileData

Frontend--\>\>LP: Display Provider Profile

Note over LP, Database: UC-PRO-04 - Manage Provider Profile

LP-\>\>Frontend: Open Profile Management

Frontend-\>\>Backend: getProviderProfile(lpId)

Backend-\>\>Database: getProviderProfile(lpId)

Database--\>\>Backend: profileData

Backend--\>\>Frontend: profileData

Frontend--\>\>LP: Display Provider Profile

LP-\>\>Frontend: Fill / Update Information

LP-\>\>Frontend: Enter / Edit Description

opt AI Refinement

LP-\>\>Frontend: Click "AI Refinement"

Frontend-\>\>Backend: refineDescription(description)

Backend-\>\>Backend: generateRefinedDescription(description)

Backend--\>\>Frontend: refinedDescription

Frontend--\>\>LP: Display refined description

LP-\>\>Frontend: Accept / Edit refined description

end

LP-\>\>Frontend: Save Profile

Frontend-\>\>Backend: saveProviderProfile(profileData, images)

Backend-\>\>Database: saveProviderProfile(profileData, images)

Database--\>\>Backend: profileSaved

Backend--\>\>Frontend: saveSuccess

Frontend--\>\>LP: Display updated profile

Note over LP, Database: UC-PRO-05 - Manage Experiences

LP-\>\>Frontend: Open Experience Management

Frontend-\>\>Backend: getExperiences(lpId)

Backend-\>\>Database: getExperiences(lpId)

Database--\>\>Backend: experiences

Backend--\>\>Frontend: experiences

Frontend--\>\>LP: Display Experiences

LP-\>\>Frontend: Create / Edit Experience

LP-\>\>Frontend: Enter / Edit Experience Description

opt AI Refinement

LP-\>\>Frontend: Click "AI Refinement"

Frontend-\>\>Backend: refineExperienceDescription(description)

Backend-\>\>Backend: generateRefinedDescription(description)

Backend--\>\>Frontend: refinedDescription

Frontend--\>\>LP: Display refined description

LP-\>\>Frontend: Accept / Edit refined description

end

LP-\>\>Frontend: Save Experience

Frontend-\>\>Backend: saveExperience(experienceData, images)

Backend-\>\>Database: saveExperience(experienceData, images)

Database--\>\>Backend: experienceSaved

Backend--\>\>Frontend: saveSuccess

Frontend--\>\>LP: Display updated Experience

Note over Admin, Database: UC-PRO-06 - Verify Provider Profile

Admin-\>\>Frontend: Open Provider Profile for review

Frontend-\>\>Backend: getProviderProfile(providerId)

Backend-\>\>Database: getProviderProfile(providerId)

Database--\>\>Backend: profileData

Backend--\>\>Frontend: profileData

Frontend--\>\>Admin: Display submitted Profile

alt Approve

Admin-\>\>Frontend: Select "Approve"

Frontend-\>\>Backend: approveProviderProfile(providerId)

Backend-\>\>Database: updateProfileVerificationStatus(providerId, "Verified")

Database--\>\>Backend: statusUpdated

Backend--\>\>Frontend: approveSuccess

Frontend--\>\>Admin: Display profile status "Verified"

else Request Revision

Admin-\>\>Frontend: Select "Request Revision"

Admin-\>\>Frontend: Enter revision comments

Frontend-\>\>Backend: requestProfileRevision(providerId, comments)

Backend-\>\>Database: updateProfileVerificationStatus(providerId, "Revision Required")

Backend-\>\>Database: saveRevisionComments(providerId, comments)

Database--\>\>Backend: statusUpdated

Backend--\>\>Frontend: revisionRequested

Frontend--\>\>Admin: Display profile status "Revision Required"

Frontend--\>\>LP: Display revision comments

end

**5. Functional requirements (mandatory)**

| **FR ID**  | **DBIZ2 Subfunction ID** | **Requirement (system MUST ...)**                                                                                                        | **Actor**               | **Priority** |
|------------|--------------------------|------------------------------------------------------------------------------------------------------------------------------------------|-------------------------|--------------|
| **FR-001** | F-PROFILE-01             | Display Agency profile information according to the requesting actor's permitted visibility scope.                                       | Member / Guest          | Must         |
| **FR-002** | F-PROFILE-02             | Allow a Tour Agency to update only its own permitted Agency profile information.                                                         | Tour Agency             | Must         |
| **FR-003** | F-PROFILE-03             | Display Local Provider information according to actor-specific visibility rules.                                                         | Member / Guest          | Must         |
| **FR-004** | F-PROFILE-04             | Allow a Local Provider to update only its own business profile, description and profile media.                                           | Local Provider          | Must         |
| **FR-005** | F-PROFILE-05             | Allow UBND to Approve or Request Revision for submitted Local Provider profiles within its assigned village.                             | UBND Admin              | Must         |
| **FR-006** | F-PROFILE-06             | Allow Local Provider to create, update and delete its own Experiences and manage their pricing, images, capacity and booking conditions. | Local Provider          | Must         |
| **FR-007** | F-PROFILE-07             | Generate an AI-refined Provider/Experience description draft without automatically replacing the original description.                   | Local Provider / System | Should       |

**5.1 Input / Output contract**

| **FR ID**  | **Input field**       | **Type**                                                                                                                       | **Required**                                   | **Output field**                    | **Type**                                                                                     | **Notes / validation**                                                                                                                                                                                                 |
|------------|-----------------------|--------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------|-------------------------------------|----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **FR-001** | agency_id             | ID                                                                                                                             | No, omitted for own profile                    | Agency profile fields               | Object                                                                                       | Public fields: agency_name, company_type, structured location and team_size. Contact is visible to authenticated Local Provider, UBND and HDT. Full-detail fields are available to own Agency / HDT. No Agency verification_status. |
| **FR-002** | agency_id             | ID                                                                                                                             | Yes                                            | updated_profile                     | Object                                                                                       | Must belong to current Agency; only the highest-level authorized Agency user (Agency Owner) may edit.                                                                                                                  |
|            | company_name          | String ≤255                                                                                                                    | No                                             | success_message                     | String                                                                                       | Company Name is a major change requiring HDT re-review.                                                                                                                                                                |
|            | tax_id                | String, 10 or 13 numeric digits                                                                                                | No                                             | updated_at                          | DateTime                                                                                     | Tax ID is a major change requiring HDT re-review.                                                                                                                                                                       |
|            | location              | Object{street, ward, district, city_province}                                                                                  | No                                             | change_log_entry                    | Object{editor_id, changed_fields, edited_at, ip_address}                                     | Structured Agency location.                                                                                                                                                                                            |
|            | description           | Text ≤1000                                                                                                                     | No                                             | requires_hdt_rereview               | Boolean                                                                                      | Non-major changes are applied immediately.                                                                                                                                                                              |
|            | contact_info          | Object{contact_person_name, phone_number, business_email}                                                                      | No                                             | major_change_review_status          | Enum[Not Required, Pending Review, Approved, Rejected]                                       | Proposed major legal-information changes remain pending until HDT review.                                                                                                                                               |
|            | team_size             | Integer > 0                                                                                                                    | No                                             | account_status                      | Enum[Approved]                                                                               | An already Approved Agency remains Approved while a major-change review is pending.                                                                                                                                     |
|            | tour_types            | Array<Enum>                                                                                                                    | No                                             |                                     |                                                                                              | Not public; visible to own Agency and HDT.                                                                                                                                                                              |
|            | images                | Array<Image: JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720>                                                                        | No                                             |                                     |                                                                                              | Auto-crop supported.                                                                                                                                                                                                    |
| **FR-003** | provider_id           | ID                                                                                                                             | No, omitted for own profile                    | Provider profile fields             | Object                                                                                       | Role-specific field visibility. Public fields include provider_name, craft_type, general_description and public_images.                                                                                                 |
|            |                       |                                                                                                                                |                                                | verification_status                 | Enum[Draft, Pending Verification, Verified, Revision Required]                               | Visible only to own Provider / UBND / HDT.                                                                                                                                                                              |
|            |                       |                                                                                                                                |                                                | quality_metrics                     | Object{total_bookings, average_booking_value, cancellation_rate, profile_completeness_score} | HDT only.                                                                                                                                                                                                               |
| **FR-004** | provider_id           | ID                                                                                                                             | Yes                                            | updated_profile                     | Object                                                                                       | Must be current Provider.                                                                                                                                                                                               |
|            | business_name         | String ≤255                                                                                                                    | Yes for submission                             | success_message                     | String                                                                                       | Major field; changing it after verification requires UBND re-verification.                                                                                                                                              |
|            | craft_type            | Enum[Ceramics, Silk/Textile, Woodcarving, Food/Culinary, Metalwork, Paper/Painting, Other]                                   | Yes for submission                             | updated_at                          | DateTime                                                                                     | Major field; changing it after verification requires UBND re-verification.                                                                                                                                              |
|            | artisan_names         | Array<String>                                                                                                                  | No                                             | change_log_entry                    | Object                                                                                       | —                                                                                                                                                                                                                      |
|            | business_registration_number | String                                                                                                                    | Yes for submission                             | profile_verification_status         | Enum[Draft, Pending Verification, Verified, Revision Required]                               | Current editable/review version. Business Registration is a major field.                                                                                                                                                |
|            | business_registration_certificate | File[PDF/JPG/JPEG/PNG], max 10MB                                                                                      | Yes for submission                             | published_profile_version_status    | Enum[None, Verified]                                                                          | Last Verified version remains published while a major revision is under review.                                                                                                                                         |
|            | location_address      | String                                                                                                                         | Yes for submission                             | rereview_required                   | Boolean                                                                                      | Canonical Provider location is address only.                                                                                                                                                                            |
|            | description           | Text ≤1000                                                                                                                     | No                                             |                                     |                                                                                              | May use F-PROFILE-07.                                                                                                                                                                                                   |
|            | operating_hours       | Object{Monday..Sunday: Array<TimeRange> Optional}                                                                              | No                                             |                                     |                                                                                              | Recurring weekly Provider operating hours; canonical baseline availability source for F-SCHED-09.                                                                                                                      |
|            | booking_conditions    | Object                                                                                                                         | No                                             |                                     |                                                                                              | —                                                                                                                                                                                                                      |
|            | profile_images        | Array<Image: JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720>                                                                        | No                                             |                                     |                                                                                              | —                                                                                                                                                                                                                      |
| **FR-005** | provider_id           | ID                                                                                                                             | Yes                                            | submitted_profile_view              | UI View, read-only                                                                           | Provider must belong to UBND assigned village.                                                                                                                                                                          |
|            | decision              | Enum[Approve, Request Revision]                                                                                                | Yes                                            | verification_status                 | Enum[Verified, Revision Required]                                                            | —                                                                                                                                                                                                                      |
|            | revision_comments     | Text                                                                                                                           | Yes when Request Revision; otherwise No        | reviewer_id                         | ID                                                                                           | Revision comments are mandatory for Request Revision.                                                                                                                                                                   |
|            |                       |                                                                                                                                |                                                | reviewed_at                         | DateTime                                                                                     | Recorded for every decision.                                                                                                                                                                                            |
|            |                       |                                                                                                                                |                                                | revision_comments                   | Text                                                                                         | Optional output.                                                                                                                                                                                                        |
|            |                       |                                                                                                                                |                                                | published_version_updated           | Boolean                                                                                      | True when an approved revision replaces a previous Verified version.                                                                                                                                                    |
| **FR-006** | provider_id           | ID                                                                                                                             | Yes                                            | experience                          | Object                                                                                       | Provider-owned Experience only; returned for Create/Update.                                                                                                                                                             |
|            | operation             | Enum[Create, Update, Delete]                                                                                                   | Yes                                            | success_message                     | String                                                                                       | —                                                                                                                                                                                                                      |
|            | experience_id         | ID                                                                                                                             | Required for Update/Delete; omitted for Create | explore_listing_updated             | Boolean                                                                                      | Experience edits for a Verified Provider go live immediately.                                                                                                                                                           |
|            | name                  | String                                                                                                                         | Required for Create; Optional for Update; omitted for Delete | matching_data_refreshed             | Boolean                                                                                      | —                                                                                                                                                                                                                      |
|            | description           | Text                                                                                                                           | Required for Create; Optional for Update; omitted for Delete | deletion_result                     | Enum[Hard Deleted, Archived, Blocked by Active Booking]                                     | Delete is blocked by On hold/Booked Bookings; historical-only references are archived; no Booking references may be hard-deleted.                                                                                       |
|            | category              | Enum[Workshop/Hands-on, Sightseeing, Culinary/Tasting, Cultural Show, Combo]                                                   | Required for Create; Optional for Update; omitted for Delete | archived_at                         | DateTime                                                                                     | Returned when archived because historical Booking references exist.                                                                                                                                                     |
|            | group_size            | Object{min_pax: Integer > 0, max_pax: Integer > 0}                                                                             | No for Create/Update; omitted for Delete       | validation_errors                   | Array<Enum[Active Booking Field Locked, Active Booking Prevents Deletion, Required Image Category Missing, Last Required Category Image Cannot Be Deleted, Invalid Price, Invalid Capacity, Invalid Notice Period]> | Recommended/ideal participant range; max_pax must not exceed max_participants.                                                                                                   |
|            | duration              | Integer > 0, minutes                                                                                                           | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | Locked while an On hold or Booked Booking exists.                                                                                                                                                                       |
|            | experience_location_address | String                                                                                                                    | No for Create/Update; omitted for Delete       |                                     |                                                                                              | Defaults to Provider main location; coordinates required internally for route/matching may be system-derived. Locked while an On hold or Booked Booking exists.                                                         |
|            | images                | Array<Image: JPG/JPEG/PNG/WEBP, max 10MB, min 1280×720>                                                                        | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | At least one image in each required category: Activity/Experience, Space/Location, Product/Result.                                                                                                                       |
|            | price_per_person      | Decimal > 0, VND                                                                                                               | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | Locked while an On hold or Booked Booking exists.                                                                                                                                                                       |
|            | group_discounts       | Array<Object{pax_threshold: Integer > 0, discount_percentage: Decimal 0–100}>                                                   | No for Create/Update; omitted for Delete       |                                     |                                                                                              | Locked while an On hold or Booked Booking exists.                                                                                                                                                                       |
|            | special_rates         | Array<Object{pax_threshold: Integer > 0, discount_percentage: Decimal 0–100}>                                                   | No for Create/Update; omitted for Delete       |                                     |                                                                                              | Locked while an On hold or Booked Booking exists.                                                                                                                                                                       |
|            | max_participants      | Integer > 0                                                                                                                    | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | Hard capacity; locked while an On hold or Booked Booking exists.                                                                                                                                                        |
|            | notice_period         | Integer ≥ 0, hours                                                                                                             | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | Remains editable while active Bookings exist.                                                                                                                                                                           |
|            | cancellation_policy   | Object{rules: Array<Object{threshold_hours: Integer ≥ 0, fee_percentage: Decimal 0–100}>, notes: Text Optional}                | Required for Create; Optional for Update; omitted for Delete |                                     |                                                                                              | Structured rules plus optional notes; remains editable while active Bookings exist.                                                                                                                                     |
| **FR-007** | original_description  | Text                                                                                                                           | Yes                                            | refined_description_draft           | Text                                                                                         | Original factual meaning must be preserved.                                                                                                                                                                             |
|            | source_type           | Enum[Provider, Experience]                                                                                                     | Yes                                            | original_description                | Text                                                                                         | Original retained.                                                                                                                                                                                                      |
|            | experience_type       | Enum                                                                                                                           | No, Experience only                            |                                     |                                                                                              | —                                                                                                                                                                                                                      |
|            | profile_context       | Object{business_name, craft_type, location, target_audience, raw_description}                                                  | No                                             |                                     |                                                                                              | Only these fields may be supplied as AI profile context.                                                                                                                                                                |

**5.2 Business rules**

| **Rule ID** | **Rule**                                                                                                                                  | **Why it exists**                                                   |
|-------------|-------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| **BR-001**  | Only the highest-level authorized Agency user (Agency Owner) may edit its own Agency profile. Other Agency users follow their assigned read/access permissions. | Protects organization ownership and Agency-level edit authority. |
| **BR-002**  | A Local Provider can edit only its own Provider profile and Experiences.                                                                  | Prevents cross-provider modification.                               |
| **BR-003**  | HDT and UBND have read-only access to profile content; account-management authority does not grant profile-edit authority.                | Separates identity administration from business content ownership.  |
| **BR-004**  | Profile fields displayed to a user must follow actor-specific visibility rules.                                                           | Prevents disclosure of restricted commercial/contact information.   |
| **BR-005**  | UBND may verify only Local Providers within its assigned village.                                                                         | Enforces local administrative scope.                                |
| **BR-006**  | A newly created Provider profile begins in Draft. Incomplete Save Changes keeps the profile in Draft. The first successful Save Changes after all required fields are complete automatically submits the profile and changes its verification status to Pending Verification. | Supports controlled Provider submission and verification. |
| **BR-007**  | Only Verified Provider profile versions are eligible for public display and use in Explore / AI Tour Matching. When a major revision of a previously Verified Provider is pending review or requires revision, the last Verified profile version remains published until the new revision is approved. | Prevents unreviewed Provider data from entering discovery/matching while preserving the last approved public version. |
| **BR-008**  | Provider/profile images must use JPG/JPEG/PNG/WEBP, maximum 10MB and minimum 1280×720.                                                    | Ensures usable media quality.                                       |
| **BR-009**  | Each Experience requires at least three image types: Activity/Experience, Space/Location and Product/Result.                              | Provides sufficient visual representation.                          |
| **BR-010**  | Experience price must be greater than 0, capacity greater than 0, and notice period at least 0.                                           | Prevents invalid Experience configuration.                          |
| **BR-011**  | AI refinement must preserve the factual meaning of the original description.                                                              | Prevents invented Provider information.                             |
| **BR-012**  | The original description must be retained and the AI draft cannot be saved as the final description without explicit Provider acceptance. | Keeps the Provider in control of published content.                 |
| **BR-013**  | AI refinement may be Accepted, Edited, Regenerated or Discarded.                                                                          | Supports human review of generated content.                         |
| **BR-014**  | When an Experience has at least one On hold or Booked Booking, price_per_person, group_discounts, special_rates, group_size, max_participants, duration and experience_location_address are locked during edit. Description, images, notice_period and cancellation_policy remain editable. | Prevents changes that would invalidate pax, price, capacity or schedule/location details already committed to an active Booking. |
| **BR-015**  | The last remaining image in a required category (Activity/Experience, Space/Location, Product/Result) cannot be deleted until a replacement image in that same category has been uploaded. | Keeps the Experience compliant with BR-009 at every point in time, not only at save. |
| **BR-016**  | Tapping a gallery image on the Experience Detail – Owner View opens a lightbox showing that image full-size, with navigation to browse the other images in the same gallery. | Lets the Provider inspect image quality/detail without leaving the screen or entering edit mode. |
| **BR-017**  | Company Name and Tax ID are major Agency-profile fields. Changing either creates an HDT review request while the existing Agency account remains Approved and the currently approved legal information remains effective until approval. | Prevents unapproved legal-information changes from replacing the approved Agency record. |
| **BR-018**  | Business Name, Craft Type and Business Registration are major Provider-profile fields. Changes by a previously Verified Provider require UBND re-verification while the last Verified version remains published. | Preserves a reviewed public Provider version during major-profile re-review. |
| **BR-019**  | Experience deletion is blocked while On hold or Booked Bookings exist. An Experience referenced only by Completed/Cancelled historical Bookings is archived; an Experience with no Booking references may be permanently deleted. | Preserves Booking history and prevents deletion of actively referenced Experiences. |
| **BR-020**  | Experience edits for a Verified Provider go live immediately and do not require full Provider-profile re-verification. | Avoids unnecessary administrative re-verification for ordinary Experience changes. |
| **BR-021**  | Provider operating_hours are recurring weekly profile information maintained through F-PROFILE-04 and are the canonical baseline for F-SCHED-09 availability calculation. Experience-level operating_hours and manually configured blackout/ad-hoc unavailable periods are outside MVP scope. | Maintains one canonical source for baseline operating availability. |

**6. Key entities (mandatory)**

| **Entity**                       | **Attributes (from Input/Output fields)**                                                                                                                             | **Relationships**                                                           |
|----------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| **Agency Profile**               | agency_id, company_name, company_type, tax_id, location, description, contact_info, team_size, tour_types, images, account_status                                      | belongs to one Tour Agency account                                          |
| **Local Provider Profile**       | provider_id, business_name, craft_type, artisan_names, business_registration_number, business_registration_certificate, location_address, description, operating_hours, booking_conditions, profile_images, profile_verification_status, published_profile_version_status | belongs to one Local Provider; associated with one Village                  |
| **Provider Verification Review** | provider_id, decision, revision_comments, reviewer_id, reviewed_at, verification_status                                                                               | belongs to one Provider profile; performed by UBND                          |
| **Experience**                   | experience_id, provider_id, name, description, category, group_size, duration, experience_location_address, price_per_person, group_discounts, special_rates, max_participants, notice_period, cancellation_policy | belongs to one Local Provider                                               |
| **Experience Image**             | image, image category/type, media metadata                                                                                                                            | belongs to one Experience                                                   |
| **Profile Image**                | image/media metadata                                                                                                                                                  | belongs to Agency or Provider Profile                                       |
| **AI Refined Description Draft** | original_description, source_type, refined_description_draft, profile_context                                                                                         | generated for one Provider or Experience description                        |
| **Village**                      | village_id                                                                                                                                                            | has one or more Local Providers; Provider verification is scoped by Village |

**7. Screens involved**

| **Screen ID** | **Screen name**                | **Priority** | **Screen Spec file**          |
|---------------|--------------------------------|--------------|-------------------------------|
| DSC122        | Provider Profile               | Must         | screens/screen-spec-DSC122.md |
| DSC123        | Public Provider Profile        | Must         | screens/screen-spec-DSC123.md |
| DSC033        | Experience Detail              | Must         | screens/screen-spec-DSC033.md |
| DSH018        | Local Provider Dashboard       | Must         | screens/screen-spec-DSH018.md |
| PRF127        | Provider Profile               | Must         | screens/screen-spec-PRF127.md |
| PRF128        | Edit Provider Profile          | Must         | screens/screen-spec-PRF128.md |
| PRF019        | Agency Profile                 | Must         | screens/screen-spec-PRF019.md |
| PRF021        | Edit Agency Profile            | Must         | screens/screen-spec-PRF021.md |
| EXP067        | Experience Management          | Must         | screens/screen-spec-EXP067.md |
| EXP069        | Add Experience                 | Must         | screens/screen-spec-EXP069.md |
| EXP068        | Experience Detail – Owner View | Must         | screens/screen-spec-EXP068.md |
| EXP070        | Edit Experience                | Must         | screens/screen-spec-EXP070.md |
| EXP132        | Delete Experience Confirmation | Must         | screens/screen-spec-EXP132.md |

**8. Success criteria (mandatory)**

| **SC ID**  | **Criterion**                                                                                                  | **How it is measured**                                                |
|------------|----------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **SC-001** | An Agency can update its own profile but cannot modify another Agency's profile.                               | Test own-profile update and cross-Agency update attempt.              |
| **SC-002** | A Local Provider can update only its own profile and Experiences.                                              | Attempt updates against own and another Provider's records.           |
| **SC-003** | Restricted profile information is hidden from actors without the corresponding visibility permission.          | Compare rendered fields across Guest, Agency, LP, UBND and HDT roles. |
| **SC-004** | UBND can verify only Provider profiles belonging to its assigned village.                                      | Test own-village and cross-village verification attempts.             |
| **SC-005** | A Provider profile approved by UBND reaches Verified status, while Request Revision reaches Revision Required. | Execute both review decisions and inspect resulting state.            |
| **SC-006** | An Experience cannot be saved as valid without the required image set, positive price and positive capacity.   | Submit invalid boundary-value Experience data.                        |
| **SC-007** | AI refinement never replaces the Provider's original description without explicit Provider acceptance.         | Generate a draft and exit/discard without accepting.                  |
| **SC-008** | Admin profile review does not allow HDT/UBND to directly modify Provider business content.                     | Review Admin screen actions and attempt profile-content modification. |

**9. Assumptions**

- A Local Provider belongs to a Village, and a Village may contain multiple Local Providers.

- Provider profile verification status is separate from account status.

- Local Provider account creation occurs before profile completion; therefore a Provider can log in while its business profile is not yet Verified.

- F-PROFILE-07 AI Description Refinement is an inline supporting function rather than a standalone Profile screen.

- Provider operating_hours are maintained in Profile Management through F-PROFILE-04. Schedule/Booking consumes these recurring operating hours together with active Booking blocks to calculate operational availability through F-SCHED-09.

- The MVP does not support Experience-specific operating hours, manually configured blackout dates or ad-hoc unavailable periods.

- The current Sequence Diagram's UC-PRO-03 Manage Provider Profile and UC-PRO-04 Manage Experiences labels are treated as older IDs; final mappings are UC-PRO-04 and UC-PRO-05.

- Current DBIZ2 Usage Flow/Sequence does not yet visually represent UC-PRO-06 Provider Verification.

**10. Open questions**

| **\#** | **Question**                                                                                                                                                            | **Blocking?** | **Owner**     | **Status** | **Answer/Decision**                                                                                                                                                                                    |
|--------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------|---------------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| 1      | What are the allowed values for company_type, and where is it initially captured?                                                                                       | No            | BA            | Closed     | **Enum:** Travel Agency, Tour Operator, TMC. Captured during the initial Account Registration form (F-AUTH-02).                                                                                        |
| 2      | Is Agency location required, and what format should it use?                                                                                                             | No            | BA            | Closed     | **Yes, required.** Format: Structured address (Street, Ward, District, City/Province).                                                                                                                 |
| 3      | Are Agency tour_types public information?                                                                                                                               | No            | Client / BA   | Closed     | **No.** Only visible to the Agency itself and Admin (HDT).                                                                                                                                             |
| 4      | Which actors may see Agency contact information?                                                                                                                        | Yes           | Client        | Closed     | **All authenticated actors** (Provider, HDT, UBND) can view it to facilitate collaboration.                                                                                                            |
| 5      | What does Agency verification_status mean when Agency approval is already stored as account status?                                                                     | Yes           | BA            | Closed     | **Duplicate field.** Remove verification_status from Agency Profile. Account status (Pending/Approved/Rejected) handles this.                                                                          |
| 6      | Which Agency fields constitute a **major change** requiring re-review?                                                                                                  | Yes           | Client        | Closed     | **Company Name** and **Tax ID**. Changing these triggers an HDT re-review.                                                                                                                             |
| 7      | Can any Agency staff user edit the Agency profile, or only the highest-level authorized Agency user as stated in the Screen List?                                       | Yes           | Client / BA   | Closed     | **Only the highest-level authorized user** (Owner role within the Agency).                                                                                                                             |
| 8      | What technical validation rules apply to Agency profile images?                                                                                                         | No            | UI/UX / Tech  | Closed     | Format: JPG/JPEG/PNG/WEBP. Max size: 10MB. Min resolution: 1280x720. Auto-crop supported.                                                                                                              |
| 9      | What is the canonical craft_type enum?                                                                                                                                  | Yes           | BA            | Closed     | **Enum:** Ceramics, Silk/Textile, Woodcarving, Food/Culinary, Metalwork, Paper/Painting, Other.                                                                                                        |
| 10     | For Guests, is Provider information shown only as Explore preview, or through dedicated screen DSC123 Public Provider Profile?                                          | Yes           | UI/UX / BA    | Closed     | **Dedicated screen (DSC123).** Information is shown directly through the DSC123 Public Provider Profile screen.                                                                                        |
| 11     | What is the Provider verification state before first submission: Incomplete, Draft, or another value?                                                                   | Yes           | BA            | Closed     | **Draft.** Changes to "Pending Verification" upon submission.                                                                                                                                          |
| 12     | What are the HDT-only quality_metrics referenced by F-PROFILE-03?                                                                                                       | No            | BA            | Closed     | **Aggregated metrics:** Total Bookings, Average Booking Value, Cancellation Rate, Profile Completeness Score.                                                                                          |
| 13     | Is business_registration a registration number, uploaded document, or both?                                                                                             | Yes           | Client / BA   | Closed     | **Both.** Requires inputting the Registration Number and uploading a PDF/Image of the certificate.                                                                                                     |
| 14     | What is the canonical structure of Provider location — address only or address + coordinates?                                                                           | Yes           | Tech / BA     | Closed     | Address only.                                                                                                                                                                                          |
| 15     | How does profile operating_hours relate to F-SCHED-09 Manage Provider Availability?                                                                                     | Yes           | BA            | Closed     | operating_hours is recurring weekly Provider profile information configured through F-PROFILE-04 and is the canonical baseline operating window. F-SCHED-09 calculates available/occupied periods from these operating hours together with On hold / Booked Booking blocks. Manually configured blackout dates or ad-hoc unavailable periods are outside MVP scope. |
| 16     | Which Provider profile changes count as major changes requiring re-verification?                                                                                        | Yes           | Client        | Closed     | Business Name, Craft Type, and Business Registration details.                                                                                                                                          |
| 17     | Must revision_comments be required when UBND chooses Request Revision?                                                                                                  | Yes           | Client        | Closed     | **Yes.** Mandatory to explain what needs fixing.                                                                                                                                                       |
| 18     | Is reviewed_at recorded for Request Revision as well as approval?                                                                                                       | No            | Tech          | Closed     | **Yes.** Every review decision logs a timestamp.                                                                                                                                                       |
| 19     | What is the allowed Experience category enum?                                                                                                                           | Yes           | BA            | Closed     | **Enum:** Workshop/Hands-on, Sightseeing, Culinary/Tasting, Cultural Show, Combo.                                                                                                                      |
| 20     | What is the difference between group_size and max_participants?                                                                                                         | Yes           | BA            | Closed     | group_size is the recommended/ideal range (e.g., 5-10 pax). max_participants is the strict hard limit (e.g., 20 pax).                                                                                  |
| 21     | What unit is used for Experience duration?                                                                                                                              | Yes           | BA            | Closed     | **Minutes** (can be converted to Hours/Days on UI).                                                                                                                                                    |
| 22     | What currency is used for Experience pricing?                                                                                                                           | Yes           | Client        | Closed     | **VND (Vietnamese Dong)** as the system base currency.                                                                                                                                                 |
| 23     | What is the structure of group_discounts and special_rates?                                                                                                             | No            | BA            | Closed     | **JSON Object:** \[{"pax_threshold": 10, "discount_percentage": 5}, ...\].                                                                                                                             |
| 24     | Is notice_period stored in hours or days?                                                                                                                               | Yes           | BA            | Closed     | Hours.                                                                                                                                                                                                 |
| 25     | Is cancellation_policy free text or structured rules?                                                                                                                   | No            | BA            | Closed     | **Structured rules** (e.g., Free before X hours, Y% fee if \< X hours) + an optional Free Text field for notes.                                                                                        |
| 26     | After a Verified Provider edits an Experience, does the change go live immediately or require re-verification?                                                          | Yes           | Client        | Closed     | **Goes live immediately.** Experience edits do not trigger a full profile re-verification to reduce admin bottleneck.                                                                                  |
| 27     | Which Provider/Profile fields may be sent to the AI as profile_context?                                                                                                 | No            | Tech / Client | Closed     | Business Name, Craft Type, Location, Target Audience, and existing raw Description.                                                                                                                    |
| 28     | EXP131 Repin Location exists in Screen List but no explicit Experience location input exists in F-PROFILE-06. Should Experience location be added to the Function List? | Yes           | BA            | Closed     | **Yes.** F-PROFILE-06 includes experience_location_address as a plain address, defaulting to the Provider's main location when omitted. Coordinates required internally for route/matching may be derived by the system. **EXP131 Repin Location is removed from scope**; no separate map-repin screen is required. |
| 29     | What exact UI/action submits a completed Provider profile for UBND verification?                                                                                        | Yes           | UI/UX / BA    | Closed     | **"Save Changes" button.** Incomplete saves remain Draft. The first successful Save Changes after all required fields are complete automatically submits the Provider profile for UBND verification and changes the editable revision to Pending Verification. |
| 30     | UC-PRO-06 Provider Verification is absent from the current Sequence Diagram. Should Module 2 Sequence be updated to include the UBND verification flow?                 | No            | BA            | Closed     | **Yes.** Update the Sequence Diagram to show UBND retrieving profiles (Status: Pending) and executing Approve/Request Revision.                                                                        |

**11. Traceability to DBIZ2**

| **Spec section**               | **DBIZ2 source**           | **Location**                                                                                                                                                 |
|--------------------------------|----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Purpose**                 | Schematic design 1.1 / 1.2 | **sheet Schematic, sections 1.1 System Objectives and 1.2 System Main Functions – Profile Management**                                                       |
| **4.1 Usage flow**             | Usage Flow figure          | **sheet Schematic2, Local Provider flow: “Upload Media & Edit Info” → “Update Tour & Experience Profile”; Admin flow: “View all Profiles (Read-only Mode)”** |
| **4.2 Sequence**               | Sequence Diagram figure    | **sheet Schematic2, Module 2: Profile Management – Tour Agency profile sequence and Local Provider profile/Experience sequence**                             |
| **5. Functional requirements** | Function List              | **sheet FL&Cost1, F-PROFILE-01 .. F-PROFILE-07**                                                                                                             |
| **7. Screens**                 | Screen List                | **sheet ST, PRF019, PRF021, PRF127, PRF128, DSC122, DSC123, EXP067, EXP068, EXP069, EXP070, EXP132, VER146, VER119**                                 |
