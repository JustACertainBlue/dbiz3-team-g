import { describe, it, expect } from "vitest";
import { registrationSchema } from "@/lib/validation";

describe("T014: FR-002 Field Validation Rules", () => {
  const validPayload = {
    full_name: "Nguyen Van A",
    email: "agency@example.com",
    password: "Password123!",
    confirm_password: "Password123!",
    company_name: "Hanoi Heritage Travel",
    company_type: "Tour Operator",
    tax_id: "0101234567",
    location: {
      street: "123 Hang Bac",
      ward: "Hang Bac",
      district: "Hoan Kiem",
      city_province: "Ha Noi",
    },
    contact_information: {
      contact_person_name: "Nguyen Van A",
      phone_number: "+84912345678",
      business_email: "contact@example.com",
    },
    team_size: 15,
    tour_types: ["Cultural/Heritage", "Craft Village/Experiential"],
    registration_documents: [
      { name: "cert.pdf", type: "application/pdf", size: 1024 * 1024 },
    ],
  };

  it("accepts a completely valid registration payload", () => {
    const result = registrationSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("validates full_name (max 100 chars, required)", () => {
    const tooLong = { ...validPayload, full_name: "A".repeat(101) };
    expect(registrationSchema.safeParse(tooLong).success).toBe(false);

    const empty = { ...validPayload, full_name: "" };
    expect(registrationSchema.safeParse(empty).success).toBe(false);
  });

  it("validates email (RFC format and max 254)", () => {
    const invalidEmail = { ...validPayload, email: "not-an-email" };
    expect(registrationSchema.safeParse(invalidEmail).success).toBe(false);

    const tooLongEmail = { ...validPayload, email: "a".repeat(250) + "@b.com" };
    expect(registrationSchema.safeParse(tooLongEmail).success).toBe(false);
  });

  it("validates password complexity (8-64 chars, >=1 upper, >=1 lower, >=1 digit, >=1 special, no whitespace)", () => {
    expect(registrationSchema.safeParse({ ...validPayload, password: "short1!", confirm_password: "short1!" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, password: "nouppercase1!", confirm_password: "nouppercase1!" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, password: "NOLOWERCASE1!", confirm_password: "NOLOWERCASE1!" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, password: "NoDigitsSpecial!", confirm_password: "NoDigitsSpecial!" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, password: "NoSpecial123", confirm_password: "NoSpecial123" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, password: "Has Space 1!", confirm_password: "Has Space 1!" }).success).toBe(false);
  });

  it("validates confirm_password must match password", () => {
    const mismatched = { ...validPayload, confirm_password: "DifferentPassword123!" };
    expect(registrationSchema.safeParse(mismatched).success).toBe(false);
  });

  it("validates company_name (max 255 chars, required)", () => {
    const tooLong = { ...validPayload, company_name: "C".repeat(256) };
    expect(registrationSchema.safeParse(tooLong).success).toBe(false);
  });

  it("validates company_type is one of Travel Agency | Tour Operator | TMC", () => {
    const invalidType = { ...validPayload, company_type: "Invalid Type" };
    expect(registrationSchema.safeParse(invalidType).success).toBe(false);
  });

  it("validates tax_id (exactly 10 or 13 numeric digits)", () => {
    expect(registrationSchema.safeParse({ ...validPayload, tax_id: "0101234567" }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...validPayload, tax_id: "0101234567890" }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...validPayload, tax_id: "123456789" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, tax_id: "12345678901" }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, tax_id: "010123456A" }).success).toBe(false);
  });

  it("validates location (all four sub-fields required)", () => {
    const missingStreet = {
      ...validPayload,
      location: { ward: "Hang Bac", district: "Hoan Kiem", city_province: "Ha Noi" },
    };
    expect(registrationSchema.safeParse(missingStreet).success).toBe(false);
  });

  it("validates contact_information phone_number (10-15 digits with optional leading +)", () => {
    expect(registrationSchema.safeParse({
      ...validPayload,
      contact_information: { ...validPayload.contact_information, phone_number: "+84912345678" }
    }).success).toBe(true);

    expect(registrationSchema.safeParse({
      ...validPayload,
      contact_information: { ...validPayload.contact_information, phone_number: "0912345678" }
    }).success).toBe(true);

    expect(registrationSchema.safeParse({
      ...validPayload,
      contact_information: { ...validPayload.contact_information, phone_number: "12345" }
    }).success).toBe(false);
  });

  it("validates team_size (integer >= 1)", () => {
    expect(registrationSchema.safeParse({ ...validPayload, team_size: 0 }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, team_size: -5 }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, team_size: 1.5 }).success).toBe(false);
  });

  it("validates tour_types (array with >= 1 value and valid enum)", () => {
    expect(registrationSchema.safeParse({ ...validPayload, tour_types: [] }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...validPayload, tour_types: ["Unknown Tour Type"] }).success).toBe(false);
  });

  it("validates registration_documents (>= 1 file)", () => {
    expect(registrationSchema.safeParse({ ...validPayload, registration_documents: [] }).success).toBe(false);
  });
});
