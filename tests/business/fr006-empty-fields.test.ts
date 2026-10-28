import { describe, it, expect } from "vitest";
import { authenticate } from "@/lib/auth";

describe("T001: FR-006 Empty Field Validation", () => {
  it("rejects login attempt when email is empty", async () => {
    const result = await authenticate("", "ValidPassword123!");
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toBe("Email and password are required");
    expect(result.emptyFieldErrors).toContain("email");
  });

  it("rejects login attempt when password is empty", async () => {
    const result = await authenticate("user@example.com", "");
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toBe("Email and password are required");
    expect(result.emptyFieldErrors).toContain("password");
  });

  it("rejects login attempt when both email and password are empty", async () => {
    const result = await authenticate("", "");
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toBe("Email and password are required");
    expect(result.emptyFieldErrors).toEqual(expect.arrayContaining(["email", "password"]));
  });
});
