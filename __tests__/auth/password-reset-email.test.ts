import { describe, expect, it, vi } from "vitest";
import {
  getPasswordResetEmailConfig,
  sendPasswordResetEmail,
} from "@/lib/email/password-reset-email";

describe("email reset kata sandi", () => {
  it("menganggap konfigurasi belum siap jika salah satu variabel kosong", () => {
    expect(getPasswordResetEmailConfig({})).toBeNull();
    expect(getPasswordResetEmailConfig({ RESEND_API_KEY: "re_test" })).toBeNull();
  });

  it("mengirim email melalui API Resend tanpa membocorkan API key di body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ id: "email-id" }), { status: 200 }),
    );

    await sendPasswordResetEmail(
      {
        recipient: "owner@example.com",
        recipientName: "Owner <Toko>",
        resetUrl: "https://pos.example.com/api/auth/reset-password/token?callbackURL=%2Freset-password",
      },
      {
        config: {
          apiKey: "re_secret_test",
          from: "wazePOS <no-reply@example.com>",
        },
        fetcher,
      },
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
    expect(body).toContain("Owner &lt;Toko&gt;");
    expect(body).not.toContain("re_secret_test");
  });

  it("menghasilkan error aman saat Resend menolak pengiriman", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("unauthorized", { status: 401 }),
    );

    await expect(
      sendPasswordResetEmail(
        {
          recipient: "owner@example.com",
          resetUrl: "https://pos.example.com/reset-password?token=test",
        },
        {
          config: {
            apiKey: "re_secret_test",
            from: "wazePOS <no-reply@example.com>",
          },
          fetcher,
        },
      ),
    ).rejects.toThrow("status 401");
  });
});
