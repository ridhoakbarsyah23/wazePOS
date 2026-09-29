import { describe, expect, it, vi } from "vitest";
import {
  getPaymentVerificationEmailConfig,
  getPaymentVerificationSubject,
  getSubscriptionUrl,
  sendPaymentVerificationEmail,
} from "@/server/email/payment-verification-email";

const config = {
  apiKey: "re_secret_test",
  from: "wazePOS <no-reply@example.com>",
};

describe("konfigurasi email verifikasi pembayaran", () => {
  it("menganggap konfigurasi belum siap jika salah satu variabel kosong", () => {
    expect(getPaymentVerificationEmailConfig({})).toBeNull();
    expect(getPaymentVerificationEmailConfig({ RESEND_API_KEY: "re_test" })).toBeNull();
    expect(getPaymentVerificationEmailConfig({ RESEND_FROM_EMAIL: "wazePOS <no-reply@example.com>" })).toBeNull();
  });

  it("menganggap konfigurasi siap jika kedua variabel terisi", () => {
    expect(
      getPaymentVerificationEmailConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "wazePOS <no-reply@example.com>",
      }),
    ).toEqual({ apiKey: "re_test", from: "wazePOS <no-reply@example.com>" });
  });

  it("membedakan subjek approve dan reject", () => {
    expect(getPaymentVerificationSubject("approve")).toContain("disetujui");
    expect(getPaymentVerificationSubject("reject")).toContain("ditolak");
  });

  it("menghasilkan tautan langganan dari NEXT_PUBLIC_SITE_URL tanpa slash ganda", () => {
    expect(getSubscriptionUrl({ NEXT_PUBLIC_SITE_URL: "https://pos.example.com/" })).toBe(
      "https://pos.example.com/subscription",
    );
    expect(getSubscriptionUrl({})).toBeNull();
  });
});

describe("pengiriman email verifikasi pembayaran", () => {
  it("mengirim email approve dengan detail paket, nominal, dan CTA", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );

    await sendPaymentVerificationEmail(
      {
        recipient: "owner@example.com",
        recipientName: "Owner <Toko>",
        businessName: "Toko Makmur",
        plan: "tumbuh",
        amount: 450000,
        orderId: "WZP-1",
        decision: "approve",
        verificationNote: null,
        subscriptionUrl: "https://pos.example.com/subscription",
        idempotencyKey: "payment-verification/pay-1",
      },
      { config, fetcher },
    );

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    const body = String(request?.body);

    expect(url).toBe("https://api.resend.com/emails");
    expect(request?.headers).toMatchObject({ "Idempotency-Key": "payment-verification/pay-1" });
    expect(body).toContain("owner@example.com");
    expect(body).toContain("Pembayaran wazePOS disetujui");
    expect(body).toContain("Toko Makmur");
    expect(body).toContain("WZP-1");
    expect(body).toContain("https://pos.example.com/subscription");
    expect(body).not.toContain("re_secret_test");
    // Nama dengan karakter HTML harus di-escape.
    expect(body).toContain("Owner &lt;Toko&gt;");
  });

  it("mencantumkan alasan penolakan pada email reject", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );

    await sendPaymentVerificationEmail(
      {
        recipient: "owner@example.com",
        businessName: "Toko Makmur",
        plan: "bisnis",
        amount: 950000,
        orderId: "WZP-2",
        decision: "reject",
        verificationNote: "Bukti buram",
        subscriptionUrl: null,
      },
      { config, fetcher },
    );

    const body = String(fetcher.mock.calls[0]?.[1]?.body);
    expect(body).toContain("Pembayaran wazePOS ditolak");
    expect(body).toContain("Bukti buram");
    expect(body).toContain("halaman Langganan");
  });

  it("melempar error aman saat Resend menolak pengiriman", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(
      sendPaymentVerificationEmail(
        {
          recipient: "owner@example.com",
          businessName: "Toko Makmur",
          plan: "tumbuh",
          amount: 450000,
          orderId: "WZP-1",
          decision: "approve",
          subscriptionUrl: null,
        },
        { config, fetcher },
      ),
    ).rejects.toThrow("status 401");
  });

  it("melempar error aman saat konfigurasi belum lengkap", async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      sendPaymentVerificationEmail(
        {
          recipient: "owner@example.com",
          businessName: "Toko Makmur",
          plan: "tumbuh",
          amount: 450000,
          orderId: "WZP-1",
          decision: "approve",
          subscriptionUrl: null,
        },
        { config: undefined, fetcher },
      ),
    ).rejects.toThrow("belum lengkap");
  });
});
