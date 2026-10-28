import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { query as defaultQuery } from "./db";
import { hashPassword } from "./password";
import type pg from "pg";

const repoRoot = path.resolve(process.cwd());
const outboxDir = path.join(repoRoot, "var", "outbox");

function ensureOutboxDir() {
  if (!fs.existsSync(outboxDir)) {
    fs.mkdirSync(outboxDir, { recursive: true });
  }
}

/** Generate a temporary password that satisfies all complexity rules:
 *  8–64 chars, ≥1 upper, ≥1 lower, ≥1 digit, ≥1 special, no whitespace.
 */
function generateTempPassword(): string {
  const base = randomBytes(12).toString("base64").replace(/[+/=]/g, "X");
  // Guarantee presence of required character classes
  return base.slice(0, 14) + "Aa1!";
}

function validatePhone(phone: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(phone);
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

export interface CreateUbndAccountInput {
  name: string;
  email: string;
  phone: string;
  assignedVillageId: string;
  assignedByUserId: string;
  /** "HDT" required; any other value → 403 */
  actorAdminType: string;
}

export interface CreateUbndAccountResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  userId?: string;
  accountStatus?: "Active";
  mustChangePassword?: boolean;
  credentialEmailStatus?: "Success" | "Fail";
  villageAssignment?: { ubndUserId: string; villageId: string };
  successNotification?: string;
}

export async function createUbndAccount(
  input: CreateUbndAccountInput,
  pool?: pg.Pool
): Promise<CreateUbndAccountResult> {
  // AS-3 / BR-007: only HDT can create UBND accounts
  if (!input.actorAdminType || input.actorAdminType !== "HDT") {
    return {
      success: false,
      status: 403,
      errorMessage: "Forbidden: only HDT admins can create UBND accounts",
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  // --- Input validation (FR-019) ---
  const fieldErrors: Array<{ field: string; message: string }> = [];

  if (!input.name || !input.name.trim()) {
    fieldErrors.push({ field: "name", message: "Name is required" });
  }
  if (!input.email || !input.email.trim()) {
    fieldErrors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(input.email.trim())) {
    fieldErrors.push({ field: "email", message: "Email is invalid" });
  }
  if (!input.phone || !input.phone.trim()) {
    fieldErrors.push({ field: "phone", message: "Phone is required" });
  } else if (!validatePhone(input.phone.trim())) {
    fieldErrors.push({
      field: "phone",
      message: "Phone must be 10–15 digits with optional leading +",
    });
  }
  if (!input.assignedVillageId || !input.assignedVillageId.trim()) {
    fieldErrors.push({
      field: "assigned_village_id",
      message: "Assigned village is required",
    });
  }

  if (fieldErrors.length > 0) {
    return {
      success: false,
      status: 400,
      errorMessage: fieldErrors[0].message,
      fieldErrors,
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  // --- Email uniqueness check ---
  const emailRes = await queryFn(
    `SELECT user_id FROM user_accounts WHERE lower(email) = $1`,
    [normalizedEmail]
  );
  if (emailRes.rows.length > 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Email already exists",
      fieldErrors: [{ field: "email", message: "Email already exists" }],
    };
  }

  // --- Village existence check (FR-019) ---
  const villageRes = await queryFn(
    `SELECT village_id FROM villages WHERE village_id = $1 AND is_active = true`,
    [input.assignedVillageId]
  );
  if (villageRes.rows.length === 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Village not found or not active",
      fieldErrors: [
        { field: "assigned_village_id", message: "Village not found or not active" },
      ],
    };
  }

  // --- Village already assigned check (BR-008) ---
  const assignmentRes = await queryFn(
    `SELECT ubnd_user_id FROM ubnd_village_assignments WHERE village_id = $1`,
    [input.assignedVillageId]
  );
  if (assignmentRes.rows.length > 0) {
    return {
      success: false,
      status: 409,
      errorMessage: "Village already has an assigned UBND account",
    };
  }

  // --- Create account and assignment ---
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // INSERT user_accounts
  const userRes = await queryFn(
    `INSERT INTO user_accounts (
      user_id, email, password_hash, role_code, admin_type, account_status,
      full_name, must_change_password, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, 'ADMIN', 'UBND', 'Active',
      $3, true, now(), now()
    ) RETURNING user_id`,
    [normalizedEmail, passwordHash, input.name.trim()]
  );
  const newUserId: string = userRes.rows[0].user_id;

  // INSERT ubnd_village_assignments
  await queryFn(
    `INSERT INTO ubnd_village_assignments (ubnd_user_id, village_id, assigned_by, assigned_at)
     VALUES ($1, $2, $3, now())`,
    [newUserId, input.assignedVillageId, input.assignedByUserId]
  );

  // INSERT audit_logs (SC-008)
  await queryFn(
    `INSERT INTO audit_logs (
      audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
    ) VALUES (
      gen_random_uuid(), $1, 'UBND_ACCOUNT_CREATED', 'UserAccount', $2, $3, now()
    )`,
    [
      input.assignedByUserId,
      newUserId,
      JSON.stringify({
        email: normalizedEmail,
        assigned_village_id: input.assignedVillageId,
        name: input.name.trim(),
      }),
    ]
  );

  // Write credential outbox email
  let credentialEmailStatus: "Success" | "Fail" = "Success";
  try {
    ensureOutboxDir();
    const outboxPath = path.join(
      outboxDir,
      `ubnd_credentials_${newUserId}_${Date.now()}.json`
    );
    fs.writeFileSync(
      outboxPath,
      JSON.stringify(
        {
          to: normalizedEmail,
          subject: "Your UBND account has been created",
          name: input.name.trim(),
          note: "Temporary password is for one-time login only. Change it immediately after login.",
        },
        null,
        2
      )
    );
  } catch {
    credentialEmailStatus = "Fail";
  }

  return {
    success: true,
    status: 201,
    userId: newUserId,
    accountStatus: "Active",
    mustChangePassword: true,
    credentialEmailStatus,
    villageAssignment: {
      ubndUserId: newUserId,
      villageId: input.assignedVillageId,
    },
    successNotification: "UBND account created and credentials sent.",
  };
}

export interface CreateLocalProviderAccountInput {
  actorUserId: string;
  /** "UBND" required; any other value → 403 */
  actorAdminType: string;
  providerName: string;
  address: string;
  contact: {
    contactPersonName: string;
    phoneNumber: string;
  };
  email: string;
  requestedVillageId?: string;
}

export interface CreateLocalProviderAccountResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
  userId?: string;
  accountStatus?: "Active";
  mustChangePassword?: boolean;
  credentialEmailStatus?: "Success" | "Fail";
  successNotification?: string;
  providerProfileId?: string;
  profileVerificationStatus?: "Draft";
}

export async function createLocalProviderAccount(
  input: CreateLocalProviderAccountInput,
  pool?: pg.Pool
): Promise<CreateLocalProviderAccountResult> {
  // BR-007 / AS-3 / FR-016: Only UBND can create Local Provider accounts
  if (!input.actorAdminType || input.actorAdminType !== "UBND") {
    return {
      success: false,
      status: 403,
      errorMessage: "Forbidden: only UBND admins can create Local Provider accounts",
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  // --- Input validation (FR-020) ---
  const fieldErrors: Array<{ field: string; message: string }> = [];

  if (!input.providerName || !input.providerName.trim()) {
    fieldErrors.push({ field: "provider_name", message: "Provider name is required" });
  }
  if (!input.address || !input.address.trim()) {
    fieldErrors.push({ field: "address", message: "Address is required" });
  }
  if (!input.contact) {
    fieldErrors.push({ field: "contact", message: "Contact information is required" });
  } else {
    if (!input.contact.contactPersonName || !input.contact.contactPersonName.trim()) {
      fieldErrors.push({
        field: "contact.contact_person_name",
        message: "Contact person name is required",
      });
    }
    if (!input.contact.phoneNumber || !input.contact.phoneNumber.trim()) {
      fieldErrors.push({
        field: "contact.phone_number",
        message: "Phone number is required",
      });
    } else if (!validatePhone(input.contact.phoneNumber.trim())) {
      fieldErrors.push({
        field: "contact.phone_number",
        message: "Phone must be 10–15 digits with optional leading +",
      });
    }
  }
  if (!input.email || !input.email.trim()) {
    fieldErrors.push({ field: "email", message: "Email is required" });
  } else if (!validateEmail(input.email.trim())) {
    fieldErrors.push({ field: "email", message: "Email is invalid" });
  }

  if (fieldErrors.length > 0) {
    return {
      success: false,
      status: 400,
      errorMessage: fieldErrors[0].message,
      fieldErrors,
    };
  }

  // --- Lookup UBND assigned village (FR-020 / BR-009) ---
  const assignmentRes = await queryFn(
    `SELECT village_id FROM ubnd_village_assignments WHERE ubnd_user_id = $1`,
    [input.actorUserId]
  );
  if (assignmentRes.rows.length === 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "UBND administrator has no assigned village",
    };
  }
  const assignedVillageId: string = assignmentRes.rows[0].village_id;

  // AS-2 / BR-009: Check cross-village mismatch
  if (input.requestedVillageId && input.requestedVillageId !== assignedVillageId) {
    return {
      success: false,
      status: 403,
      errorMessage: "Forbidden: Provider belongs to another village (outside assigned village)",
    };
  }

  const normalizedEmail = input.email.trim().toLowerCase();

  // --- Email uniqueness check ---
  const emailRes = await queryFn(
    `SELECT user_id FROM user_accounts WHERE lower(email) = $1`,
    [normalizedEmail]
  );
  if (emailRes.rows.length > 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Email already exists",
      fieldErrors: [{ field: "email", message: "Email already exists" }],
    };
  }

  // --- Create credentials ---
  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  // INSERT user_accounts
  const userRes = await queryFn(
    `INSERT INTO user_accounts (
      user_id, email, password_hash, role_code, admin_type, account_status,
      full_name, phone, must_change_password, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, 'Local_Provider', NULL, 'Active',
      $3, $4, true, now(), now()
    ) RETURNING user_id`,
    [
      normalizedEmail,
      passwordHash,
      input.providerName.trim(),
      input.contact.phoneNumber.trim(),
    ]
  );
  const newUserId: string = userRes.rows[0].user_id;

  // INSERT provider_profiles (BR-015: verification_status = 'Draft')
  const profileRes = await queryFn(
    `INSERT INTO provider_profiles (
      provider_id, user_id, village_id, verification_status,
      current_version_no, published_version_no, created_at, updated_at
    ) VALUES (
      gen_random_uuid(), $1, $2, 'Draft',
      NULL, NULL, now(), now()
    ) RETURNING provider_id`,
    [newUserId, assignedVillageId]
  );
  const newProfileId: string = profileRes.rows[0].provider_id;

  // INSERT provider_profile_versions (version 1 Draft)
  await queryFn(
    `INSERT INTO provider_profile_versions (
      provider_id, version_no, version_status,
      business_name, location_address, contact_information
    ) VALUES (
      $1, 1, 'Draft',
      $2, $3, $4
    )`,
    [
      newProfileId,
      input.providerName.trim(),
      input.address.trim(),
      JSON.stringify({
        contact_person_name: input.contact.contactPersonName.trim(),
        phone_number: input.contact.phoneNumber.trim(),
      }),
    ]
  );

  // Link current_version_no = 1
  await queryFn(
    `UPDATE provider_profiles SET current_version_no = 1, updated_at = now() WHERE provider_id = $1`,
    [newProfileId]
  );

  // INSERT audit_logs (SC-008)
  await queryFn(
    `INSERT INTO audit_logs (
      audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
    ) VALUES (
      gen_random_uuid(), $1, 'LOCAL_PROVIDER_ACCOUNT_CREATED', 'UserAccount', $2, $3, now()
    )`,
    [
      input.actorUserId,
      newUserId,
      JSON.stringify({
        email: normalizedEmail,
        provider_name: input.providerName.trim(),
        provider_profile_id: newProfileId,
        village_id: assignedVillageId,
      }),
    ]
  );

  // Write outbox credential email
  let credentialEmailStatus: "Success" | "Fail" = "Success";
  try {
    ensureOutboxDir();
    const outboxPath = path.join(
      outboxDir,
      `provider_credentials_${newUserId}_${Date.now()}.json`
    );
    fs.writeFileSync(
      outboxPath,
      JSON.stringify(
        {
          to: normalizedEmail,
          subject: "Your Local Provider account has been created",
          provider_name: input.providerName.trim(),
          note: "Temporary password is for one-time login only. Change it immediately after login.",
        },
        null,
        2
      )
    );
  } catch {
    credentialEmailStatus = "Fail";
  }

  return {
    success: true,
    status: 201,
    userId: newUserId,
    accountStatus: "Active",
    mustChangePassword: true,
    credentialEmailStatus,
    providerProfileId: newProfileId,
    profileVerificationStatus: "Draft",
    successNotification: "Local Provider account created and credentials sent.",
  };
}

