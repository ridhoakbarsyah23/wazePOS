import { describe, expect, it, vi } from "vitest";
import {
  getTrialReminderEmailConfig,
  getTrialReminderSubject,
  getUpgradeUrl,
  sendTrialEndingEmail,
} from "@/server/email/trial-ending-email";

const NOW = new Date("2026-09-28T02:00:00.000Z");

describe("konfigurasi email pengingat trial", () => {
  it("menganggap konfigurasi belum siap jika salah satu variabel kosong", () => {
    expect(getTrialReminderEmailConfig({})).toBeNull();
    expect(getTrialReminderEmailConfig({ RESEND_API_KEY: "re_test" })).toBeNull();
    expect(getTrialReminderEmailConfig({ RESEND_FROM_EMAIL: "wazePOS <no-reply@example.com>" })).toBeNull();
  });

  it("menganggap konfigurasi siap jika kedua variabel terisi", () => {
    expect(
      getTrialReminderEmailConfig({
        RESEND_API_KEY: "re_test",
        RESEND_FROM_EMAIL: "wazePOS <no-reply@example.com>",
      }),
    ).toEqual({ apiKey: "re_test", from: "wazePOS <no-reply@example.com>" });
  });
});

describe("subjek dan tautan upgrade", () => {
  it("menyebut hari ini bila trial berakhir pada hari WIB yang sama", () => {
    expect(getTrialReminderSubject(new Date("2026-09-28T09:00:00.000Z"), NOW)).toContain("hari ini");
  });
  it("memakai subjek besok saat sisa waktu <= 24 jam", () => {
    const trialEndsAt = new Date(NOW.getTime() + 20 * 3_600_000);
    expect(getTrialReminderSubject(trialEndsAt, NOW)).toBe(
      "Trial wazePOS berakhir besok — aktifkan paketmu",
    );
  });

  it("memakai subjek jumlah hari saat sisa waktu > 24 jam", () => {
    const trialEndsAt = new Date(NOW.getTime() + 40 * 3_600_000);
    expect(getTrialReminderSubject(trialEndsAt, NOW)).toBe("Trial wazePOS berakhir dalam 2 hari");
  });

  it("menghasilkan tautan upgrade dari NEXT_PUBLIC_SITE_URL tanpa slash ganda", () => {
    expect(getUpgradeUrl({ NEXT_PUBLIC_SITE_URL: "https://pos.example.com/" })).toBe(
      "https://pos.example.com/subscription",
    );
    expect(getUpgradeUrl({})).toBeNull();
  });
});

describe("pengiriman email pengingat trial", () => {
  const config = {
    apiKey: "re_secret_test",
    from: "wazePOS <no-reply@example.com>",
  };

  it("mengirim kunci idempotensi dengan payload stabil saat retry melewati tengah malam", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    const input = {
      recipient: "owner@example.com",
      businessName: "Toko Makmur",
      trialEndsAt: new Date("2026-09-29T03:00:00.000Z"),
      upgradeUrl: "https://pos.example.com/subscription",
      idempotencyKey: "trial-ending/subscription-1/2026-09-29T03:00:00.000Z",
    };
    await sendTrialEndingEmail(input, { config, fetcher, now: NOW });
    await sendTrialEndingEmail(input, { config, fetcher, now: new Date("2026-09-29T02:00:00.000Z") });
    const first = fetcher.mock.calls[0][1];
    const retry = fetcher.mock.calls[1][1];
    expect(first?.headers).toMatchObject({ "Idempotency-Key": input.idempotencyKey });
    expect(first?.signal).toBeDefined();
    expect(first?.body).toBe(retry?.body);
  });

  it("mengirim email via Resend dengan penerima, subjek, dan CTA yang benar", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );
    const trialEndsAt = new Date("2026-09-29T03:30:00.000Z");

    await sendTrialEndingEmail(
      {
        recipient: "owner@example.com",
        recipientName: "Owner <Toko>",
        businessName: "Toko Makmur",
        trialEndsAt,
        upgradeUrl: "https://pos.example.com/subscription",
      },
      { config, fetcher, now: NOW },
    );

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, request] = fetcher.mock.calls[0];
    const body = String(request?.body);

    expect(url).toBe("https://api.resend.com/emails");
    expect(request?.headers).toEqual({
      Authorization: "Bearer re_secret_test",
      "Content-Type": "application/json",
    });
    expect(body).toContain("owner@example.com");
    expect(body).toContain("Trial wazePOS berakhir besok");
    expect(body).toContain("Toko Makmur");
    expect(body).toContain("https://pos.example.com/subscription");
    expect(body).not.toContain("re_secret_test");
    // Nama dengan karakter HTML harus di-escape.
    expect(body).toContain("Owner &lt;Toko&gt;");
  });

  it("tidak menyertakan CTA saat tautan upgrade tidak tersedia", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );

    await sendTrialEndingEmail(
      {
        recipient: "owner@example.com",
        businessName: "Toko Makmur",
        trialEndsAt: new Date("2026-09-29T03:30:00.000Z"),
        upgradeUrl: null,
      },
      { config, fetcher, now: NOW },
    );

    const body = String(fetcher.mock.calls[0]?.[1]?.body);
    expect(body).not.toContain("https://pos.example.com/subscription");
    expect(body).toContain("halaman Langganan");
  });

  it("melempar error aman saat Resend menolak pengiriman", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(
      sendTrialEndingEmail(
        {
          recipient: "owner@example.com",
          businessName: "Toko Makmur",
          trialEndsAt: new Date("2026-09-29T03:30:00.000Z"),
          upgradeUrl: null,
        },
        { config, fetcher, now: NOW },
      ),
    ).rejects.toThrow("status 401");
  });
});
