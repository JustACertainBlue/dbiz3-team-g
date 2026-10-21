import { z } from "zod";

const TOUR_TYPES = [
  "Cultural/Heritage",
  "Craft Village/Experiential",
  "Culinary",
  "Educational/Study Tour",
  "Corporate/MICE",
  "Family/Leisure",
  "Other",
] as const;

const COMPANY_TYPES = ["Travel Agency", "Tour Operator", "TMC"] as const;

export const registrationSchema = z
  .object({
    full_name: z
      .string()
      .min(1, "Full name is required")
      .max(100, "Full name must be at most 100 characters"),
    email: z
      .string()
      .email("Invalid email address")
      .max(254, "Email must be at most 254 characters"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(64, "Password must be at most 64 characters")
      .refine(
        (val) =>
          /[A-Z]/.test(val) &&
          /[a-z]/.test(val) &&
          /[0-9]/.test(val) &&
          /[^A-Za-z0-9]/.test(val) &&
          !/\s/.test(val),
        "Password must contain uppercase, lowercase, number, special character, and no whitespace"
      ),
    confirm_password: z.string().min(1, "Please confirm your password"),
    company_name: z
      .string()
      .min(1, "Company name is required")
      .max(255, "Company name must be at most 255 characters"),
    company_type: z.enum(COMPANY_TYPES, {
      error: "Invalid company type",
    }),
    tax_id: z
      .string()
      .regex(/^([0-9]{10}|[0-9]{13})$/, "Tax ID must be exactly 10 or 13 numeric digits"),
    location: z.object({
      street: z.string().min(1, "Street is required"),
      ward: z.string().min(1, "Ward is required"),
      district: z.string().min(1, "District is required"),
      city_province: z.string().min(1, "City/Province is required"),
    }),
    contact_information: z.object({
      contact_person_name: z.string().min(1, "Contact person name is required"),
      phone_number: z
        .string()
        .regex(/^\+?[0-9]{10,15}$/, "Phone number must be 10-15 digits with optional leading +"),
      business_email: z.string().email("Invalid business email").optional(),
    }),
    team_size: z
      .number()
      .int("Team size must be an integer")
      .min(1, "Team size must be at least 1"),
    tour_types: z
      .array(z.enum(TOUR_TYPES))
      .min(1, "At least one tour type must be selected"),
    registration_documents: z
      .array(z.any())
      .min(1, "At least one registration document is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });

export const otpVerifySchema = z.object({
  registration_request_id: z.string().uuid("Invalid registration request ID"),
  otp_code: z
    .string()
    .regex(/^[0-9]{6}$/, "OTP must be exactly 6 numeric digits"),
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifySchema>;
