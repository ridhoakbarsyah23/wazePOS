import { describe, expect, it } from "vitest";
import { accountProfileSchema, changePasswordSchema } from "@/lib/validation/profile";

describe("profile validation", () => {
  it("trims and accepts a valid account name", () => {
    const result = accountProfileSchema.parse({ name: "  Rina Pratama  " });

    expect(result.name).toBe("Rina Pratama");
  });

  it("rejects account names outside the supported length", () => {
    expect(accountProfileSchema.safeParse({ name: "R" }).success).toBe(false);
    expect(accountProfileSchema.safeParse({ name: "R".repeat(81) }).success).toBe(false);
  });

  it("accepts a valid password change request", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "rahasia-lama",
      newPassword: "rahasia-baru",
      confirmPassword: "rahasia-baru",
      revokeOtherSessions: true,
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched and reused passwords", () => {
    const mismatch = changePasswordSchema.safeParse({
      currentPassword: "rahasia-lama",
      newPassword: "rahasia-baru",
      confirmPassword: "berbeda-sekali",
      revokeOtherSessions: true,
    });
    const reused = changePasswordSchema.safeParse({
      currentPassword: "rahasia-sama",
      newPassword: "rahasia-sama",
      confirmPassword: "rahasia-sama",
      revokeOtherSessions: false,
    });

    expect(mismatch.success).toBe(false);
    expect(reused.success).toBe(false);
  });
});
