// TODO: Zod schemas for FR-002 and FR-023 (implemented in T018)
import { z } from "zod";

export const registrationSchema = z.object({
  // Stub placeholder
});

export const otpVerifySchema = z.object({
  // Stub placeholder
});

export type RegistrationFormData = z.infer<typeof registrationSchema>;
export type OtpVerifyData = z.infer<typeof otpVerifySchema>;
