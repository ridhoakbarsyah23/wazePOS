import { describe, expect, it } from "vitest";
import {
  getPlatformSubscriptionState,
  getPostLoginDestination,
  isPlatformAdminEmail,
  isPlatformAdminUser,
  parsePlatformAdminEmails,
} from "@/lib/platform-admin-access";

describe("akses Platform Admin", () => {
  it("menormalkan allowlist email tanpa menerima pencocokan parsial", () => {
    const emails = parsePlatformAdminEmails(" Owner@Example.com, ops@example.com ,, ");

    expect([...emails]).toEqual(["owner@example.com", "ops@example.com"]);
    expect(isPlatformAdminEmail("OWNER@example.com", "owner@example.com")).toBe(true);
    expect(isPlatformAdminEmail("not-owner@example.com", "owner@example.com")).toBe(false);
  });

  it("menolak semua akun ketika allowlist belum dikonfigurasi", () => {
    expect(isPlatformAdminEmail("owner@example.com", undefined)).toBe(false);
    expect(isPlatformAdminEmail("owner@example.com", "")).toBe(false);
  });

  it("mengarahkan Platform Admin terverifikasi ke admin dan akun biasa ke dashboard", () => {
    expect(
      getPostLoginDestination(
        { email: "owner@example.com", emailVerified: true },
        "owner@example.com",
      ),
    ).toBe("/admin");
    expect(
      getPostLoginDestination(
        { email: "cashier@example.com", emailVerified: true },
        "owner@example.com",
      ),
    ).toBe("/dashboard");
  });

  it("menolak akun allowlist yang belum terverifikasi", () => {
    expect(
      isPlatformAdminUser(
        { email: "owner@example.com" },
        "owner@example.com",
      ),
    ).toBe(false);
    expect(
      isPlatformAdminUser(
        { email: "owner@example.com", emailVerified: false },
        "owner@example.com",
      ),
    ).toBe(false);
    expect(
      getPostLoginDestination(
        { email: "owner@example.com", emailVerified: false },
        "owner@example.com",
      ),
    ).toBe("/dashboard");
  });
});

describe("status subscription Platform Admin", () => {
  const now = new Date("2026-09-24T00:00:00.000Z");

  it("membedakan trial aktif dan trial yang sudah berakhir berdasarkan tanggal", () => {
    expect(getPlatformSubscriptionState({ status: "trialing", trialEndsAt: "2026-09-25T00:00:00.000Z" }, now)).toBe("trial_active");
    expect(getPlatformSubscriptionState({ status: "trialing", trialEndsAt: "2026-09-23T00:00:00.000Z" }, now)).toBe("trial_expired");
  });

  it("membedakan langganan aktif dan berakhir berdasarkan periode", () => {
    expect(getPlatformSubscriptionState({ status: "active", trialEndsAt: now, currentPeriodEnd: "2027-09-24T00:00:00.000Z" }, now)).toBe("active");
    expect(getPlatformSubscriptionState({ status: "active", trialEndsAt: now, currentPeriodEnd: "2026-09-23T00:00:00.000Z" }, now)).toBe("subscription_expired");
  });

  it("mempertahankan status operasional dan menangani subscription yang hilang", () => {
    expect(getPlatformSubscriptionState({ status: "past_due", trialEndsAt: now }, now)).toBe("past_due");
    expect(getPlatformSubscriptionState({ status: "cancelled", trialEndsAt: now }, now)).toBe("cancelled");
    expect(getPlatformSubscriptionState(null, now)).toBe("missing");
  });
});
