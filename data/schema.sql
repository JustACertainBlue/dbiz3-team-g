-- Hanoi Artisan Bridge — PostgreSQL candidate schema
-- Derived from docs/spec and data/04-data-model.md. PostgreSQL choice remains subject to Plan.
-- Review fixes applied 2026-09-29 (see CHANGELOG_SUMMARY.md §"Áp lỗi lần 2").
BEGIN;

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE roles (
    role_code varchar(32) PRIMARY KEY,
    display_name varchar(80) NOT NULL,
    CONSTRAINT roles_code_chk CHECK (role_code IN ('ADMIN', 'Tour_Agency', 'Local_Provider'))
);

CREATE TABLE permissions (
    permission_code varchar(80) PRIMARY KEY,
    action varchar(80) NOT NULL,
    resource varchar(80) NOT NULL
);

CREATE TABLE role_permissions (
    role_code varchar(32) NOT NULL REFERENCES roles(role_code) ON DELETE CASCADE,
    permission_code varchar(80) NOT NULL REFERENCES permissions(permission_code) ON DELETE CASCADE,
    admin_type varchar(8),
    PRIMARY KEY (role_code, permission_code),
    CONSTRAINT role_permission_admin_type_chk CHECK (admin_type IS NULL OR (role_code = 'ADMIN' AND admin_type IN ('HDT', 'UBND')))
);

CREATE TABLE villages (
    village_id uuid PRIMARY KEY,
    source_code varchar(80) NOT NULL UNIQUE,
    name varchar(255) NOT NULL,
    district varchar(120),
    city_province varchar(120) NOT NULL,
    is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE user_accounts (
    user_id uuid PRIMARY KEY,
    email varchar(254) NOT NULL,
    password_hash text NOT NULL,
    role_code varchar(32) NOT NULL REFERENCES roles(role_code),
    admin_type varchar(8),
    account_status varchar(24) NOT NULL,
    full_name varchar(100) NOT NULL,
    title varchar(120),
    phone varchar(16),
    avatar_file_id uuid,
    must_change_password boolean NOT NULL DEFAULT false,
    password_changed_at timestamptz,
    last_login timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT user_admin_type_chk CHECK (
        (role_code = 'ADMIN' AND admin_type IN ('HDT', 'UBND')) OR
        (role_code <> 'ADMIN' AND admin_type IS NULL)
    ),
    CONSTRAINT user_status_by_role_chk CHECK (
        (role_code = 'Tour_Agency' AND account_status IN ('Pending Approval', 'Approved', 'Rejected', 'Disabled')) OR
        (role_code IN ('ADMIN', 'Local_Provider') AND account_status IN ('Active', 'Disabled'))
    ),
    CONSTRAINT user_phone_chk CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{10,15}$'),
    CONSTRAINT user_updated_chk CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX user_accounts_email_uq ON user_accounts (lower(email));

CREATE TABLE account_status_history (
    history_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    from_status varchar(24),
    to_status varchar(24) NOT NULL,
    changed_by uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    changed_at timestamptz NOT NULL,
    reason text
);

CREATE INDEX account_status_history_asof_idx ON account_status_history (user_id, changed_at DESC);

CREATE TABLE ubnd_village_assignments (
    ubnd_user_id uuid PRIMARY KEY REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    village_id uuid NOT NULL REFERENCES villages(village_id) ON DELETE RESTRICT,
    assigned_by uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    assigned_at timestamptz NOT NULL
);

CREATE INDEX ubnd_village_assignments_village_idx ON ubnd_village_assignments (village_id);

CREATE TABLE sessions (
    session_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    role_context varchar(32) NOT NULL,
    token_hash text,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    created_at timestamptz NOT NULL,
    CONSTRAINT session_expiry_chk CHECK (expires_at > created_at),
    CONSTRAINT session_revoke_chk CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX sessions_user_active_idx ON sessions (user_id, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE password_reset_tokens (
    token_id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    token_verifier text NOT NULL UNIQUE,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    CONSTRAINT reset_token_expiry_chk CHECK (expires_at = issued_at + interval '15 minutes'),
    CONSTRAINT reset_token_used_chk CHECK (used_at IS NULL OR used_at >= issued_at)
);

CREATE TABLE agency_registration_requests (
    registration_request_id uuid PRIMARY KEY,
    email varchar(254) NOT NULL,
    pending_password_hash text,
    current_status varchar(32) NOT NULL,
    agency_user_id uuid UNIQUE REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    current_version_no integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT registration_status_chk CHECK (current_status IN (
        'Awaiting OTP', 'Pending Approval', 'Request More Information', 'Approved', 'Rejected'
    )),
    CONSTRAINT registration_version_chk CHECK (current_version_no >= 0),
    CONSTRAINT registration_updated_chk CHECK (updated_at >= created_at)
);

CREATE INDEX registration_request_email_idx ON agency_registration_requests (lower(email));

CREATE TABLE registration_otp_challenges (
    challenge_id uuid PRIMARY KEY,
    registration_request_id uuid NOT NULL REFERENCES agency_registration_requests(registration_request_id) ON DELETE RESTRICT,
    email varchar(254) NOT NULL,
    otp_verifier text NOT NULL,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    invalidated_at timestamptz,
    attempt_count smallint NOT NULL DEFAULT 0,
    resend_sequence smallint NOT NULL DEFAULT 0,
    CONSTRAINT otp_expiry_chk CHECK (expires_at = issued_at + interval '10 minutes'),
    CONSTRAINT otp_attempt_chk CHECK (attempt_count BETWEEN 0 AND 5),
    CONSTRAINT otp_resend_chk CHECK (resend_sequence BETWEEN 0 AND 3),
    CONSTRAINT otp_terminal_chk CHECK (used_at IS NULL OR invalidated_at IS NULL)
);

CREATE UNIQUE INDEX registration_one_active_otp_uq
    ON registration_otp_challenges (registration_request_id)
    WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE TABLE registration_resubmission_tokens (
    token_id uuid PRIMARY KEY,
    registration_request_id uuid NOT NULL REFERENCES agency_registration_requests(registration_request_id) ON DELETE RESTRICT,
    token_verifier text NOT NULL UNIQUE,
    issued_at timestamptz NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    invalidated_at timestamptz,
    CONSTRAINT resubmit_expiry_chk CHECK (expires_at = issued_at + interval '24 hours'),
    CONSTRAINT resubmit_terminal_chk CHECK (used_at IS NULL OR invalidated_at IS NULL)
);

CREATE UNIQUE INDEX registration_one_active_resubmit_uq
    ON registration_resubmission_tokens (registration_request_id)
    WHERE used_at IS NULL AND invalidated_at IS NULL;

CREATE TABLE registration_submission_versions (
    registration_request_id uuid NOT NULL REFERENCES agency_registration_requests(registration_request_id) ON DELETE RESTRICT,
    version_no integer NOT NULL,
    submitted_at timestamptz NOT NULL,
    submitted_by uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    full_name varchar(100) NOT NULL,
    company_name varchar(255) NOT NULL,
    company_type varchar(32) NOT NULL,
    tax_id varchar(13) NOT NULL,
    location jsonb NOT NULL,
    contact_information jsonb NOT NULL,
    team_size integer NOT NULL,
    tour_types jsonb NOT NULL,
    PRIMARY KEY (registration_request_id, version_no),
    CONSTRAINT registration_submission_version_chk CHECK (version_no > 0),
    CONSTRAINT registration_company_type_chk CHECK (company_type IN ('Travel Agency', 'Tour Operator', 'TMC')),
    CONSTRAINT registration_tax_chk CHECK (tax_id ~ '^([0-9]{10}|[0-9]{13})$'),
    CONSTRAINT registration_team_size_chk CHECK (team_size > 0),
    CONSTRAINT registration_tour_types_chk CHECK (jsonb_typeof(tour_types) = 'array')
);

CREATE TABLE stored_files (
    file_id uuid PRIMARY KEY,
    storage_key text NOT NULL UNIQUE,
    file_name varchar(255) NOT NULL,
    media_type varchar(100) NOT NULL,
    file_size_bytes bigint NOT NULL,
    width_px integer,
    height_px integer,
    uploaded_by uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL,
    CONSTRAINT stored_file_size_chk CHECK (file_size_bytes > 0 AND file_size_bytes <= 10485760),
    CONSTRAINT stored_file_dim_chk CHECK (
        (width_px IS NULL AND height_px IS NULL) OR (width_px > 0 AND height_px > 0)
    ),
    -- BR-008: an image must be at least 1280x720 (consistency contract §Shared field)
    CONSTRAINT stored_file_image_minsize_chk CHECK (
        media_type NOT LIKE 'image/%' OR (width_px >= 1280 AND height_px >= 720)
    )
);

CREATE TABLE registration_documents (
    registration_request_id uuid NOT NULL,
    version_no integer NOT NULL,
    file_id uuid NOT NULL REFERENCES stored_files(file_id) ON DELETE RESTRICT,
    document_type varchar(80) NOT NULL,
    PRIMARY KEY (registration_request_id, version_no, file_id),
    FOREIGN KEY (registration_request_id, version_no)
        REFERENCES registration_submission_versions(registration_request_id, version_no) ON DELETE RESTRICT,
    CONSTRAINT registration_document_type_chk CHECK (
        document_type IN ('Business Registration Certificate', 'Travel Service Business License', 'Other')
    )
);

CREATE TABLE agency_profiles (
    agency_id uuid PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    registration_request_id uuid NOT NULL UNIQUE REFERENCES agency_registration_requests(registration_request_id) ON DELETE RESTRICT,
    company_name varchar(255) NOT NULL,
    company_type varchar(32) NOT NULL,
    tax_id varchar(13) NOT NULL,
    location jsonb NOT NULL,
    description varchar(1000),
    contact_info jsonb NOT NULL,
    team_size integer NOT NULL,
    tour_types jsonb NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT agency_company_type_chk CHECK (company_type IN ('Travel Agency', 'Tour Operator', 'TMC')),
    CONSTRAINT agency_tax_chk CHECK (tax_id ~ '^([0-9]{10}|[0-9]{13})$'),
    CONSTRAINT agency_team_size_chk CHECK (team_size > 0),
    CONSTRAINT agency_updated_chk CHECK (updated_at >= created_at)
);

CREATE UNIQUE INDEX agency_profiles_tax_uq ON agency_profiles (tax_id);

CREATE TABLE agency_major_change_requests (
    major_change_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    proposed_company_name varchar(255),
    proposed_tax_id varchar(13),
    review_status varchar(32) NOT NULL,
    submitted_at timestamptz NOT NULL,
    reviewed_at timestamptz,
    CONSTRAINT major_change_value_chk CHECK (proposed_company_name IS NOT NULL OR proposed_tax_id IS NOT NULL),
    CONSTRAINT major_change_tax_chk CHECK (proposed_tax_id IS NULL OR proposed_tax_id ~ '^([0-9]{10}|[0-9]{13})$'),
    CONSTRAINT major_change_status_chk CHECK (review_status IN ('Pending Review', 'Request More Information', 'Approved', 'Rejected')),
    CONSTRAINT major_change_reviewed_chk CHECK (
        (review_status IN ('Pending Review', 'Request More Information') AND reviewed_at IS NULL) OR
        (review_status IN ('Approved', 'Rejected') AND reviewed_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX agency_one_pending_major_change_uq
    ON agency_major_change_requests (agency_id)
    WHERE review_status IN ('Pending Review', 'Request More Information');

CREATE TABLE agency_review_records (
    review_id uuid PRIMARY KEY,
    registration_request_id uuid,
    registration_version_no integer,
    major_change_id uuid REFERENCES agency_major_change_requests(major_change_id) ON DELETE RESTRICT,
    hdt_user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    decision varchar(32) NOT NULL,
    comments text,
    decided_at timestamptz NOT NULL,
    CONSTRAINT agency_review_subject_chk CHECK (
        (registration_request_id IS NOT NULL AND registration_version_no IS NOT NULL AND major_change_id IS NULL) OR
        (registration_request_id IS NULL AND registration_version_no IS NULL AND major_change_id IS NOT NULL)
    ),
    CONSTRAINT agency_review_decision_chk CHECK (decision IN ('Approve', 'Request More Information', 'Reject')),
    CONSTRAINT agency_review_comment_chk CHECK (decision = 'Approve' OR comments IS NOT NULL),
    FOREIGN KEY (registration_request_id, registration_version_no)
        REFERENCES registration_submission_versions(registration_request_id, version_no) ON DELETE RESTRICT,
    -- B12: at most one review per submitted subject
    CONSTRAINT agency_review_reg_subject_uq UNIQUE (registration_request_id, registration_version_no)
);

CREATE TABLE provider_profiles (
    provider_id uuid PRIMARY KEY,
    user_id uuid NOT NULL UNIQUE REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    village_id uuid NOT NULL REFERENCES villages(village_id) ON DELETE RESTRICT,
    current_version_no integer,
    published_version_no integer,
    verification_status varchar(32) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT provider_verification_status_chk CHECK (verification_status IN ('Draft', 'Pending Verification', 'Verified', 'Revision Required')),
    CONSTRAINT provider_version_numbers_chk CHECK (
        (current_version_no IS NULL OR current_version_no > 0) AND
        (published_version_no IS NULL OR published_version_no > 0)
    ),
    CONSTRAINT provider_updated_chk CHECK (updated_at >= created_at)
);

CREATE INDEX provider_profiles_village_idx ON provider_profiles (village_id);

CREATE TABLE provider_profile_versions (
    provider_id uuid NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    version_no integer NOT NULL,
    version_status varchar(32) NOT NULL,
    -- A4: business_registration_number is a versioned major field (moved here from provider_profiles)
    business_registration_number varchar(80),
    business_name varchar(255),
    craft_type varchar(120),
    artisan_names jsonb,
    location_address text,
    description text,
    contact_information jsonb,
    booking_conditions jsonb,
    submitted_at timestamptz,
    published_at timestamptz,
    PRIMARY KEY (provider_id, version_no),
    CONSTRAINT provider_version_no_chk CHECK (version_no > 0),
    CONSTRAINT provider_version_status_chk CHECK (version_status IN ('Draft', 'Pending Verification', 'Verified', 'Revision Required', 'Superseded')),
    CONSTRAINT provider_craft_type_chk CHECK (craft_type IS NULL OR craft_type IN (
        'Ceramics', 'Silk/Textile', 'Woodcarving', 'Food/Culinary', 'Metalwork', 'Paper/Painting', 'Other'
    )),
    CONSTRAINT provider_artisan_names_chk CHECK (artisan_names IS NULL OR jsonb_typeof(artisan_names) = 'array'),
    -- A1: required-for-submission fields may be NULL only while Draft
    CONSTRAINT provider_version_required_chk CHECK (
        version_status = 'Draft' OR (
            business_registration_number IS NOT NULL AND business_name IS NOT NULL AND
            craft_type IS NOT NULL AND artisan_names IS NOT NULL AND
            location_address IS NOT NULL AND contact_information IS NOT NULL
        )
    ),
    CONSTRAINT provider_publish_chk CHECK (
        (version_status IN ('Verified', 'Superseded') AND published_at IS NOT NULL) OR
        (version_status IN ('Draft', 'Pending Verification', 'Revision Required') AND published_at IS NULL)
    )
);

CREATE UNIQUE INDEX provider_one_working_version_uq
    ON provider_profile_versions (provider_id)
    WHERE version_status IN ('Draft', 'Pending Verification', 'Revision Required');

CREATE UNIQUE INDEX provider_one_published_version_uq
    ON provider_profile_versions (provider_id)
    WHERE version_status = 'Verified';

-- A4: registration number unique across currently published/verified versions
CREATE UNIQUE INDEX provider_registration_number_uq
    ON provider_profile_versions (business_registration_number)
    WHERE version_status IN ('Verified', 'Superseded');

ALTER TABLE provider_profiles
    ADD CONSTRAINT provider_current_version_fk FOREIGN KEY (provider_id, current_version_no)
        REFERENCES provider_profile_versions(provider_id, version_no) DEFERRABLE INITIALLY DEFERRED,
    ADD CONSTRAINT provider_published_version_fk FOREIGN KEY (provider_id, published_version_no)
        REFERENCES provider_profile_versions(provider_id, version_no) DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE provider_verification_reviews (
    review_id uuid PRIMARY KEY,
    provider_id uuid NOT NULL,
    version_no integer NOT NULL,
    reviewer_user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    decision varchar(24) NOT NULL,
    revision_comments text,
    reviewed_at timestamptz NOT NULL,
    FOREIGN KEY (provider_id, version_no) REFERENCES provider_profile_versions(provider_id, version_no) ON DELETE RESTRICT,
    CONSTRAINT provider_review_decision_chk CHECK (decision IN ('Approve', 'Request Revision')),
    CONSTRAINT provider_review_comment_chk CHECK (decision = 'Approve' OR revision_comments IS NOT NULL),
    -- B12: at most one review per (provider, version)
    CONSTRAINT provider_review_subject_uq UNIQUE (provider_id, version_no)
);

-- A3: supporting documents (e.g. business registration certificate) for a Provider version
CREATE TABLE provider_version_documents (
    provider_id uuid NOT NULL,
    version_no integer NOT NULL,
    file_id uuid NOT NULL REFERENCES stored_files(file_id) ON DELETE RESTRICT,
    document_type varchar(80) NOT NULL,
    PRIMARY KEY (provider_id, version_no, file_id),
    FOREIGN KEY (provider_id, version_no) REFERENCES provider_profile_versions(provider_id, version_no) ON DELETE RESTRICT,
    CONSTRAINT provider_version_document_type_chk CHECK (
        document_type IN ('Business Registration Certificate', 'Other')
    )
);

CREATE TABLE provider_operating_hours (
    operating_hour_id uuid PRIMARY KEY,
    provider_id uuid NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    weekday smallint NOT NULL,
    local_start time NOT NULL,
    local_end time NOT NULL,
    CONSTRAINT operating_weekday_chk CHECK (weekday BETWEEN 1 AND 7),
    CONSTRAINT operating_time_chk CHECK (local_start < local_end),
    UNIQUE (provider_id, weekday, local_start, local_end),
    EXCLUDE USING gist (
        provider_id WITH =,
        weekday WITH =,
        (int4range(
            extract(epoch FROM local_start)::integer,
            extract(epoch FROM local_end)::integer,
            '[)'
        )) WITH &&
    )
);

CREATE TABLE experiences (
    experience_id uuid PRIMARY KEY,
    provider_id uuid NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    name varchar(255) NOT NULL,
    description text NOT NULL,
    category varchar(80) NOT NULL,
    duration_minutes integer NOT NULL,
    price_per_person numeric(18,2) NOT NULL,
    max_participants integer NOT NULL,
    notice_period_hours integer NOT NULL,
    experience_location_address text NOT NULL,
    cancellation_policy jsonb NOT NULL,
    archived_at timestamptz,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    CONSTRAINT experience_category_chk CHECK (category IN (
        'Workshop/Hands-on', 'Sightseeing', 'Culinary/Tasting', 'Cultural Show', 'Combo'
    )),
    CONSTRAINT experience_duration_chk CHECK (duration_minutes > 0),
    CONSTRAINT experience_price_chk CHECK (price_per_person > 0),
    CONSTRAINT experience_capacity_chk CHECK (max_participants > 0),
    CONSTRAINT experience_notice_chk CHECK (notice_period_hours >= 0),
    CONSTRAINT experience_updated_chk CHECK (updated_at >= created_at),
    UNIQUE (experience_id, provider_id)
);

CREATE INDEX experiences_provider_active_idx ON experiences (provider_id) WHERE archived_at IS NULL;

-- D1: owned child rows cascade with a hard-deleted Experience.
CREATE TABLE experience_discount_rules (
    rule_id uuid PRIMARY KEY,
    experience_id uuid NOT NULL REFERENCES experiences(experience_id) ON DELETE CASCADE,
    rule_kind varchar(24) NOT NULL,
    pax_threshold integer NOT NULL,
    discount_percentage numeric(5,2) NOT NULL,
    CONSTRAINT discount_kind_chk CHECK (rule_kind IN ('Group Discount', 'Special Rate')),
    CONSTRAINT discount_threshold_chk CHECK (pax_threshold > 0),
    CONSTRAINT discount_percent_chk CHECK (discount_percentage BETWEEN 0 AND 100),
    UNIQUE (experience_id, rule_kind, pax_threshold)
);

CREATE TABLE profile_media (
    profile_media_id uuid PRIMARY KEY,
    file_id uuid NOT NULL REFERENCES stored_files(file_id) ON DELETE RESTRICT,
    agency_id uuid REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    provider_id uuid REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE CASCADE,
    category varchar(80),
    display_order integer NOT NULL DEFAULT 0,
    CONSTRAINT profile_media_one_owner_chk CHECK (num_nonnulls(agency_id, provider_id, experience_id) = 1),
    CONSTRAINT profile_media_order_chk CHECK (display_order >= 0),
    -- BR-009: each Experience image belongs to one of three required categories (NOT NULL for Experience media)
    CONSTRAINT profile_media_exp_category_chk CHECK (
        experience_id IS NULL OR category IN ('Activity', 'Space', 'Product')
    )
);

CREATE TABLE provider_version_media (
    provider_id uuid NOT NULL,
    version_no integer NOT NULL,
    file_id uuid NOT NULL REFERENCES stored_files(file_id) ON DELETE RESTRICT,
    category varchar(80) NOT NULL,
    display_order integer NOT NULL DEFAULT 0,
    PRIMARY KEY (provider_id, version_no, file_id),
    FOREIGN KEY (provider_id, version_no) REFERENCES provider_profile_versions(provider_id, version_no) ON DELETE RESTRICT,
    CONSTRAINT provider_version_media_category_chk CHECK (category IN ('Activity', 'Space', 'Product')),
    CONSTRAINT provider_version_media_order_chk CHECK (display_order >= 0)
);

CREATE TABLE ai_description_drafts (
    draft_id uuid PRIMARY KEY,
    provider_id uuid REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE CASCADE,
    original_description text NOT NULL,
    refined_description_draft text NOT NULL,
    profile_context jsonb,
    created_at timestamptz NOT NULL,
    accepted_at timestamptz,
    CONSTRAINT ai_draft_owner_chk CHECK (num_nonnulls(provider_id, experience_id) = 1),
    CONSTRAINT ai_draft_accept_chk CHECK (accepted_at IS NULL OR accepted_at >= created_at)
);

CREATE TABLE matching_sessions (
    matching_session_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    conversation_context jsonb,
    started_at timestamptz NOT NULL,
    last_activity_at timestamptz NOT NULL,
    CONSTRAINT matching_activity_chk CHECK (last_activity_at >= started_at)
);

CREATE TABLE matching_messages (
    message_id uuid PRIMARY KEY,
    matching_session_id uuid NOT NULL REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    sender varchar(16) NOT NULL,
    text varchar(2000) NOT NULL,
    sent_at timestamptz NOT NULL,
    CONSTRAINT matching_sender_chk CHECK (sender IN ('Agency', 'Assistant'))
);

CREATE TABLE tour_preference_profiles (
    matching_session_id uuid PRIMARY KEY REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    hard_constraints jsonb NOT NULL,
    matching_attributes jsonb NOT NULL,
    inferred_preferences jsonb,
    preference_weights jsonb NOT NULL,
    is_complete boolean NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE recommendation_results (
    result_id uuid PRIMARY KEY,
    matching_session_id uuid NOT NULL REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    run_no integer NOT NULL,
    experience_id uuid NOT NULL REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    rank integer NOT NULL,
    match_score numeric(5,2) NOT NULL,
    experience_fit_score numeric(5,2) NOT NULL,
    explanation text NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT recommendation_run_chk CHECK (run_no > 0),
    CONSTRAINT recommendation_rank_chk CHECK (rank > 0),
    CONSTRAINT recommendation_score_chk CHECK (match_score BETWEEN 0 AND 100 AND experience_fit_score BETWEEN 0 AND 100),
    UNIQUE (matching_session_id, run_no, rank),
    UNIQUE (matching_session_id, run_no, experience_id)
);

CREATE TABLE agency_preference_profiles (
    agency_id uuid PRIMARY KEY REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    preference_weights jsonb NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE TABLE preference_signals (
    signal_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    matching_session_id uuid REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    signal_type varchar(80) NOT NULL,
    signal_value jsonb NOT NULL,
    confidence_score numeric(4,3),
    base_weight numeric(8,5),
    captured_at timestamptz NOT NULL,
    CONSTRAINT signal_type_chk CHECK (signal_type IN (
        'Positive Experience Interest', 'Negative Experience Interest', 'Price Concern',
        'Availability Concern', 'Capacity Concern', 'Route/Distance Concern',
        'Experience Preference', 'Follow-up Intent'
    )),
    CONSTRAINT signal_confidence_chk CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 1),
    CONSTRAINT signal_weight_chk CHECK (base_weight IS NULL OR base_weight >= 0)
);

CREATE TABLE quote_requests (
    quote_request_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    experience_id uuid NOT NULL REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    source varchar(24) NOT NULL,
    matching_session_id uuid REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL,
    CONSTRAINT quote_source_chk CHECK (source IN ('Matching', 'Explore')),
    -- A8: a Matching-sourced quote is linked to the originating matching session
    CONSTRAINT quote_matching_link_chk CHECK (source <> 'Matching' OR matching_session_id IS NOT NULL),
    UNIQUE (agency_id, experience_id)
);

CREATE TABLE explore_sessions (
    session_id uuid PRIMARY KEY,
    agency_id uuid REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    anonymous_session_ref varchar(120),
    analytics_consent boolean NOT NULL,
    tracking_scope varchar(32) NOT NULL,
    started_at timestamptz NOT NULL,
    ended_at timestamptz,
    CONSTRAINT explore_scope_chk CHECK (tracking_scope IN ('Personalized', 'Anonymous Analytics', 'No Non-essential Tracking')),
    CONSTRAINT explore_identity_chk CHECK (
        (tracking_scope = 'Personalized' AND agency_id IS NOT NULL AND anonymous_session_ref IS NULL) OR
        (tracking_scope <> 'Personalized' AND agency_id IS NULL)
    ),
    CONSTRAINT explore_consent_chk CHECK (tracking_scope <> 'Anonymous Analytics' OR analytics_consent),
    CONSTRAINT explore_end_chk CHECK (ended_at IS NULL OR ended_at >= started_at)
);

CREATE TABLE explore_interactions (
    interaction_id uuid PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES explore_sessions(session_id) ON DELETE RESTRICT,
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    provider_id uuid REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    action_type varchar(32) NOT NULL,
    occurred_at timestamptz NOT NULL,
    duration_on_previous_screen integer,
    filter_values jsonb,
    CONSTRAINT explore_action_chk CHECK (action_type IN ('click_card', 'expand_preview', 'view_detail', 'apply_filter', 'scroll', 'request_quote', 'open_chat')),
    CONSTRAINT explore_duration_chk CHECK (duration_on_previous_screen IS NULL OR duration_on_previous_screen >= 0)
);

CREATE TABLE ranking_parameter_versions (
    version_id uuid PRIMARY KEY,
    parameter_map jsonb NOT NULL,
    tuning_log text,
    version_status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL,
    CONSTRAINT ranking_version_status_chk CHECK (version_status IN ('Draft', 'Active', 'Retired'))
);

CREATE UNIQUE INDEX ranking_one_active_version_uq ON ranking_parameter_versions ((1)) WHERE version_status = 'Active';

-- Capture the version actually shown to each tracked session for before/after KPI attribution.
-- NULL covers no-consent/no-personalization sessions. Seed loading defers the FK because
-- explore_sessions precedes ranking_parameter_versions in the load order.
ALTER TABLE explore_sessions ADD COLUMN ranking_version_id uuid;
ALTER TABLE explore_sessions ADD COLUMN ranked_results jsonb;
ALTER TABLE explore_sessions ADD CONSTRAINT explore_ranking_version_fk
    FOREIGN KEY (ranking_version_id) REFERENCES ranking_parameter_versions(version_id)
    ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE explore_sessions ADD CONSTRAINT explore_ranking_tracking_chk CHECK (
    tracking_scope <> 'No Non-essential Tracking' OR
    (ranking_version_id IS NULL AND ranked_results IS NULL)
);

CREATE TABLE ranking_quality_assessments (
    assessment_id uuid PRIMARY KEY,
    version_id uuid NOT NULL REFERENCES ranking_parameter_versions(version_id) ON DELETE RESTRICT,
    period_start date NOT NULL,
    period_end date NOT NULL,
    score numeric(5,2) NOT NULL,
    assessment varchar(8) NOT NULL,
    kpi_values jsonb NOT NULL,
    CONSTRAINT ranking_period_chk CHECK (period_end >= period_start),
    CONSTRAINT ranking_score_chk CHECK (score BETWEEN 0 AND 100),
    -- A10: assessment is the defined Good/Poor label, not free text
    CONSTRAINT ranking_assessment_chk CHECK (assessment IN ('Good', 'Poor'))
);

CREATE TABLE bookings (
    booking_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    provider_id uuid NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    experience_id uuid NOT NULL,
    source_chat_session_id uuid,
    start_at timestamptz NOT NULL,
    duration_minutes integer NOT NULL,
    group_size integer NOT NULL,
    agreed_price_total numeric(18,2) NOT NULL,
    conditions_snapshot jsonb NOT NULL,
    status varchar(16) NOT NULL,
    created_at timestamptz NOT NULL,
    updated_at timestamptz NOT NULL,
    hold_expires_at timestamptz NOT NULL,
    -- end_at is a plain (immutable) column set to start_at + duration by the application/seed.
    -- timestamptz + interval is only STABLE, so it cannot appear inside a GiST exclusion/generated expression.
    end_at timestamptz NOT NULL,
    arrival_at timestamptz,
    FOREIGN KEY (experience_id, provider_id) REFERENCES experiences(experience_id, provider_id) ON DELETE RESTRICT,
    CONSTRAINT booking_duration_chk CHECK (duration_minutes > 0),
    CONSTRAINT booking_group_chk CHECK (group_size > 0),
    CONSTRAINT booking_price_chk CHECK (agreed_price_total > 0),
    CONSTRAINT booking_status_chk CHECK (status IN ('On hold', 'Booked', 'Completed', 'Cancelled')),
    CONSTRAINT booking_hold_expiry_chk CHECK (hold_expires_at = created_at + interval '72 hours'),
    CONSTRAINT booking_updated_chk CHECK (updated_at >= created_at),
    CONSTRAINT booking_end_chk CHECK (end_at > start_at),
    CONSTRAINT booking_duration_end_chk CHECK (EXTRACT(EPOCH FROM (end_at - start_at)) = duration_minutes * 60),
    CONSTRAINT booking_conditions_chk CHECK (
        jsonb_typeof(conditions_snapshot) = 'object'
        AND conditions_snapshot ? 'notice_period_hours'
        AND conditions_snapshot ? 'cancellation_policy'
        AND jsonb_typeof(conditions_snapshot -> 'notice_period_hours') = 'number'
        AND (conditions_snapshot ->> 'notice_period_hours') ~ '^[0-9]+$'
        AND jsonb_typeof(conditions_snapshot -> 'cancellation_policy') = 'object'
        AND (conditions_snapshot -> 'cancellation_policy') <> '{}'::jsonb
    ),
    CONSTRAINT booking_arrival_chk CHECK ((status = 'Completed' AND arrival_at IS NOT NULL AND arrival_at >= start_at AND updated_at >= arrival_at) OR (status <> 'Completed' AND arrival_at IS NULL)),
    EXCLUDE USING gist (
        provider_id WITH =,
        tstzrange(start_at, end_at, '[)') WITH &&
    ) WHERE (status IN ('On hold', 'Booked'))
);

CREATE INDEX bookings_agency_start_idx ON bookings (agency_id, start_at);
CREATE INDEX bookings_provider_start_idx ON bookings (provider_id, start_at);
CREATE INDEX bookings_created_status_idx ON bookings (created_at, status);
CREATE INDEX bookings_experience_idx ON bookings (experience_id);

CREATE TABLE booking_status_history (
    history_id uuid PRIMARY KEY,
    booking_id uuid NOT NULL REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    from_status varchar(16),
    to_status varchar(16) NOT NULL,
    changed_by uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    changed_at timestamptz NOT NULL,
    reason text,
    CONSTRAINT booking_history_from_chk CHECK (from_status IS NULL OR from_status IN ('On hold', 'Booked', 'Completed', 'Cancelled')),
    CONSTRAINT booking_history_to_chk CHECK (to_status IN ('On hold', 'Booked', 'Completed', 'Cancelled')),
    CONSTRAINT booking_history_change_chk CHECK (from_status IS NULL OR from_status <> to_status),
    -- B5: a cancellation must record a reason
    CONSTRAINT booking_history_reason_chk CHECK (to_status <> 'Cancelled' OR reason IS NOT NULL)
);

CREATE INDEX booking_status_history_asof_idx ON booking_status_history (booking_id, changed_at DESC);

CREATE TABLE chat_sessions (
    chat_session_id uuid PRIMARY KEY,
    agency_id uuid NOT NULL REFERENCES agency_profiles(agency_id) ON DELETE RESTRICT,
    provider_id uuid NOT NULL REFERENCES provider_profiles(provider_id) ON DELETE RESTRICT,
    source varchar(24) NOT NULL,
    matching_session_id uuid REFERENCES matching_sessions(matching_session_id) ON DELETE RESTRICT,
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    quote_request_id uuid REFERENCES quote_requests(quote_request_id) ON DELETE RESTRICT,
    booking_id uuid REFERENCES bookings(booking_id) ON DELETE RESTRICT DEFERRABLE INITIALLY DEFERRED,
    status varchar(8) NOT NULL,
    started_at timestamptz NOT NULL,
    last_message_at timestamptz,
    closed_at timestamptz,
    closed_by uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    CONSTRAINT chat_source_chk CHECK (source IN ('AI Matching', 'Explore', 'Provider Profile', 'Quote Request', 'Booking')),
    CONSTRAINT chat_matching_link_chk CHECK (source <> 'AI Matching' OR matching_session_id IS NOT NULL),
    CONSTRAINT chat_status_chk CHECK (status IN ('Active', 'Closed')),
    CONSTRAINT chat_closed_chk CHECK (
        (status = 'Active' AND closed_at IS NULL AND closed_by IS NULL) OR
        (status = 'Closed' AND closed_at IS NOT NULL AND closed_by IS NOT NULL)
    ),
    CONSTRAINT chat_activity_chk CHECK (last_message_at IS NULL OR last_message_at >= started_at)
);

CREATE UNIQUE INDEX chat_one_active_pair_uq ON chat_sessions (agency_id, provider_id) WHERE status = 'Active';

ALTER TABLE bookings ADD CONSTRAINT booking_source_chat_fk
    FOREIGN KEY (source_chat_session_id) REFERENCES chat_sessions(chat_session_id) ON DELETE RESTRICT
    DEFERRABLE INITIALLY DEFERRED;

CREATE TABLE chat_participants (
    chat_session_id uuid NOT NULL REFERENCES chat_sessions(chat_session_id) ON DELETE RESTRICT,
    user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    last_read_message_id uuid,
    unread_count integer NOT NULL DEFAULT 0,
    PRIMARY KEY (chat_session_id, user_id),
    CONSTRAINT chat_unread_chk CHECK (unread_count >= 0)
);

CREATE TABLE chat_messages (
    message_id uuid PRIMARY KEY,
    chat_session_id uuid NOT NULL REFERENCES chat_sessions(chat_session_id) ON DELETE RESTRICT,
    sender_user_id uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    text varchar(4000),
    message_kind varchar(24) NOT NULL,
    -- C1: per-message business context (a conversation may reference several experiences/quotes/bookings)
    experience_id uuid REFERENCES experiences(experience_id) ON DELETE RESTRICT,
    quote_request_id uuid REFERENCES quote_requests(quote_request_id) ON DELETE RESTRICT,
    booking_id uuid REFERENCES bookings(booking_id) ON DELETE RESTRICT,
    sent_at timestamptz NOT NULL,
    CONSTRAINT chat_message_kind_chk CHECK (message_kind IN ('User Text', 'Quote Request', 'Booking Update', 'Attachment')),
    CONSTRAINT chat_message_sender_chk CHECK ((message_kind = 'Booking Update') OR sender_user_id IS NOT NULL),
    CONSTRAINT chat_message_content_chk CHECK (text IS NOT NULL OR message_kind = 'Attachment')
);

ALTER TABLE chat_participants ADD CONSTRAINT chat_last_read_message_fk
    FOREIGN KEY (last_read_message_id) REFERENCES chat_messages(message_id) ON DELETE RESTRICT;

CREATE TABLE chat_attachments (
    attachment_id uuid PRIMARY KEY,
    message_id uuid NOT NULL REFERENCES chat_messages(message_id) ON DELETE RESTRICT,
    file_id uuid NOT NULL REFERENCES stored_files(file_id) ON DELETE RESTRICT,
    uploaded_by uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    created_at timestamptz NOT NULL,
    UNIQUE (message_id, file_id)
);

CREATE TABLE notifications (
    notification_id uuid PRIMARY KEY,
    recipient_user_id uuid NOT NULL REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    event_type varchar(80) NOT NULL,
    source_type varchar(80) NOT NULL,
    source_id uuid,
    payload jsonb NOT NULL,
    created_at timestamptz NOT NULL,
    read_at timestamptz,
    email_delivery_status varchar(16),
    CONSTRAINT notification_event_type_chk CHECK (event_type IN (
        'Booking Status Changed', 'Registration Reviewed', 'Profile Reviewed', 'Account Status Changed'
    )),
    CONSTRAINT notification_read_chk CHECK (read_at IS NULL OR read_at >= created_at),
    CONSTRAINT notification_email_chk CHECK (email_delivery_status IS NULL OR email_delivery_status IN ('Success', 'Fail', 'Not Applicable'))
);

CREATE INDEX notifications_recipient_unread_idx ON notifications (recipient_user_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE audit_logs (
    audit_id uuid PRIMARY KEY,
    actor_user_id uuid REFERENCES user_accounts(user_id) ON DELETE RESTRICT,
    action varchar(120) NOT NULL,
    target_type varchar(80) NOT NULL,
    target_id uuid,
    occurred_at timestamptz NOT NULL,
    change_or_result jsonb
);

CREATE INDEX audit_logs_target_idx ON audit_logs (target_type, target_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, occurred_at DESC);

-- ACC130: avatar file lives in stored_files (single file path), added after stored_files exists.
ALTER TABLE user_accounts ADD CONSTRAINT user_avatar_file_fk
    FOREIGN KEY (avatar_file_id) REFERENCES stored_files(file_id) ON DELETE SET NULL;

-- ---------------------------------------------------------------------------
-- Cross-row guards that a single-row CHECK cannot express (B5/B6).
-- ---------------------------------------------------------------------------

-- B6: a Closed chat is immutable — reject any message sent AFTER the chat was closed.
-- Historical messages (sent_at <= closed_at) remain loadable/readable.
CREATE OR REPLACE FUNCTION chat_message_not_closed() RETURNS trigger AS $$
DECLARE cs record;
BEGIN
    SELECT status, closed_at INTO cs FROM chat_sessions WHERE chat_session_id = NEW.chat_session_id;
    IF cs.status = 'Closed' AND (cs.closed_at IS NULL OR NEW.sent_at > cs.closed_at) THEN
        RAISE EXCEPTION 'Cannot post a message after a chat session was closed (%).', NEW.chat_session_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_not_closed_trg
    BEFORE INSERT ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION chat_message_not_closed();

-- Messages are append-only, including after a conversation closes. Retention is a separate policy.
CREATE OR REPLACE FUNCTION chat_message_immutable() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'Chat messages are immutable; create a new message instead.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_message_immutable_trg
    BEFORE UPDATE OR DELETE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION chat_message_immutable();

-- B5: a Booking group size must not exceed its Experience max_participants.
CREATE OR REPLACE FUNCTION booking_group_within_capacity() RETURNS trigger AS $$
DECLARE cap integer;
BEGIN
    SELECT max_participants INTO cap FROM experiences WHERE experience_id = NEW.experience_id;
    IF cap IS NOT NULL AND NEW.group_size > cap THEN
        RAISE EXCEPTION 'group_size % exceeds Experience max_participants % for booking %.',
            NEW.group_size, cap, NEW.booking_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER booking_group_within_capacity_trg
    BEFORE INSERT OR UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION booking_group_within_capacity();

COMMIT;
