import { describe, it, expect } from "vitest";
import { resetPasswordWithToken } from "@/lib/recovery";

describe("T005: FR-012 New Password Complexity and Confirmation Validation", () => {
  it("rejects when passwords do not match", async () => {
    const result = await resetPasswordWithToken("some_token", "Password123!", "MismatchPass123!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Passwords do not match");
  });

  it("rejects when password is shorter than 8 characters", async () => {
    const result = await resetPasswordWithToken("some_token", "Pass1!", "Pass1!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Password does not meet requirements");
  });

  it("rejects when password contains whitespace", async () => {
    const result = await resetPasswordWithToken("some_token", "Pass word123!", "Pass word123!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Password does not meet requirements");
  });

  it("rejects when password lacks a special character", async () => {
    const result = await resetPasswordWithToken("some_token", "Password123", "Password123");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Password does not meet requirements");
  });

  it("rejects when password lacks a number", async () => {
    const result = await resetPasswordWithToken("some_token", "PasswordTest!", "PasswordTest!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Password does not meet requirements");
  });

  it("rejects when password lacks uppercase or lowercase letter", async () => {
    const result1 = await resetPasswordWithToken("some_token", "password123!", "password123!");
    expect(result1.success).toBe(false);
    expect(result1.errorMessage).toBe("Password does not meet requirements");

    const result2 = await resetPasswordWithToken("some_token", "PASSWORD123!", "PASSWORD123!");
    expect(result2.success).toBe(false);
    expect(result2.errorMessage).toBe("Password does not meet requirements");
  });
});
