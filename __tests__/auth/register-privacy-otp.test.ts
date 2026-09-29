import { describe, expect, it, vi } from "vitest";
import {
  getOtpEmailConfig,
  sendVerificationOtpEmail,
} from "@/server/email/otp-email";
import { TRIAL_DURATION_DAYS } from "@/shared/billing/plans";
import { onboardingSchema } from "@/shared/validation/onboarding";
import { registerSchema, verifyOtpSchema } from "@/shared/validation/auth";

const baseRegister = {
  name: "Owner Toko",
  email: "owner@example.com",
  password: "password123",
  confirmPassword: "password123",
};

const baseOnboarding = {
  businessName: "Toko Makmur",
  businessType: "Toko",
  outletName: "Gerai Utama",
  plan: "tumbuh",
} as const;

describe("persetujuan Kebijakan Privasi wajib", () => {
  it("menolak register manual tanpa centang privasi", () => {
    const result = registerSchema.safeParse({ ...baseRegister, privacyAccepted: false });
    expect(result.success).toBe(false);
  });

  it("menerima register manual dengan centang privasi", () => {
    const result = registerSchema.safeParse({ ...baseRegister, privacyAccepted: true });
    expect(result.success).toBe(true);
  });

  it("menolak onboarding tanpa centang privasi", () => {
    const result = onboardingSchema.safeParse({ ...baseOnboarding, privacyAccepted: false });
    expect(result.success).toBe(false);
  });

  it("menerima onboarding dengan centang privasi", () => {
    const result = onboardingSchema.safeParse({ ...baseOnboarding, privacyAccepted: true });
    expect(result.success).toBe(true);
  });
});

describe("skema OTP verifikasi email", () => {
  it("menerima kode 6 digit angka", () => {
    expect(verifyOtpSchema.safeParse({ email: "owner@example.com", otp: "123456" }).success).toBe(true);
  });

  it("menolak kode non-6-digit", () => {
    expect(verifyOtpSchema.safeParse({ email: "owner@example.com", otp: "12345" }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ email: "owner@example.com", otp: "abcdef" }).success).toBe(false);
  });
});

describe("durasi trial", () => {
  it("trial bisnis baru adalah 7 hari", () => {
    expect(TRIAL_DURATION_DAYS).toBe(7);
  });
});

describe("email OTP verifikasi", () => {
  it("menganggap konfigurasi belum siap bila env kosong", () => {
    expect(getOtpEmailConfig({})).toBeNull();
  });

  it("mengirim kode OTP via Resend dengan subjek yang benar", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    await sendVerificationOtpEmail(
      { recipient: "owner@example.com", recipientName: "Owner", otp: "123456", expiresInMinutes: 10 },
      { config: { apiKey: "re_test", from: "wazePOS <no-reply@example.com>" }, fetcher },
    );
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(String(request?.body)).toContain("Kode verifikasi akun wazePOS");
    expect(String(request?.body)).toContain("123456");
  });
});
