// TypeScript interfaces for US-1 registration flow
// Authoritative definitions from data/schema.sql and data/07-data-dictionary.md

export interface RegistrationRequest {
  registration_request_id: string; // uuid
  email: string;
  pending_password_hash: string | null;
  current_status: 'Awaiting OTP' | 'Pending Approval' | 'Request More Information' | 'Approved' | 'Rejected';
  agency_user_id: string | null; // uuid
  current_version_no: number;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionVersion {
  registration_request_id: string; // uuid
  version_no: number;
  submitted_at: Date;
  submitted_by: string | null; // uuid
  full_name: string;
  company_name: string;
  company_type: 'Travel Agency' | 'Tour Operator' | 'TMC';
  tax_id: string;
  location: {
    street: string;
    ward: string;
    district: string;
    city_province: string;
  };
  contact_information: {
    contact_person_name: string;
    phone_number: string;
    business_email?: string;
  };
  team_size: number;
  tour_types: string[];
}

export interface OtpChallenge {
  challenge_id: string; // uuid
  registration_request_id: string; // uuid
  email: string;
  otp_verifier: string;
  issued_at: Date;
  expires_at: Date;
  used_at: Date | null;
  invalidated_at: Date | null;
  attempt_count: number;
  resend_sequence: number;
}

export interface StoredFileRecord {
  file_id: string; // uuid
  storage_key: string;
  file_name: string;
  media_type: string;
  file_size_bytes: number;
  width_px?: number | null;
  height_px?: number | null;
  uploaded_by?: string | null;
  created_at: Date;
}
