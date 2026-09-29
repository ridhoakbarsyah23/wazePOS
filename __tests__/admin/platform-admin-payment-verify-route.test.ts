import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  verifyPayment: vi.fn(),
}));

vi.mock("@/server/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/server/admin/platform-admin-payment-verification", () => ({
  verifyBankTransferPayment: mocks.verifyPayment,
}));

import { POST } from "@/app/api/admin/payments/verify/route";

const adminSession = {
  user: { id: "admin-1", name: "Platform Admin", email: "admin@wazepos.com" },
};

function postJson(payload: unknown) {
  return POST(
    new Request("http://localhost/api/admin/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

describe("POST /api/admin/payments/verify", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.verifyPayment.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: true });
  });

  it("menolak user yang bukan platform admin", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: adminSession, allowed: false });
    const response = await postJson({ paymentId: "pay-1", decision: "approve" });
    expect(response.status).toBe(403);
    expect(mocks.verifyPayment).not.toHaveBeenCalled();
  });

  it("menyampaikan status email saat verifikasi approve berhasil", async () => {
    mocks.verifyPayment.mockResolvedValue({ ok: true, status: "paid", emailSent: true });
    const response = await postJson({ paymentId: "pay-1", decision: "approve" });
    const payload = (await response.json()) as { message: string; emailSent: boolean };

    expect(response.status).toBe(200);
    expect(payload.emailSent).toBe(true);
    expect(payload.message).toContain("disetujui");
    expect(payload.message).toContain("Email pemberitahuan telah dikirim");
    expect(mocks.verifyPayment).toHaveBeenCalledWith(
      { paymentId: "pay-1", decision: "approve" },
      { id: "admin-1", email: "admin@wazepos.com", name: "Platform Admin" },
    );
  });

  it("menjelaskan saat email tidak terkirim karena konfigurasi belum tersedia", async () => {
    mocks.verifyPayment.mockResolvedValue({ ok: true, status: "failed", emailSent: false, emailSkipped: "no-config" });
    const response = await postJson({ paymentId: "pay-1", decision: "reject", note: "Bukti buram" });
    const payload = (await response.json()) as { message: string; emailSent: boolean };

    expect(response.status).toBe(200);
    expect(payload.emailSent).toBe(false);
    expect(payload.message).toContain("ditolak");
    expect(payload.message).toContain("konfigurasi Resend");
  });

  it("meneruskan kegagalan verifikasi tanpa mengubah pesan", async () => {
    mocks.verifyPayment.mockResolvedValue({ ok: false, status: 409, message: "Pembayaran sudah diverifikasi sebelumnya." });
    const response = await postJson({ paymentId: "pay-1", decision: "approve" });
    const payload = (await response.json()) as { message: string };

    expect(response.status).toBe(409);
    expect(payload.message).toBe("Pembayaran sudah diverifikasi sebelumnya.");
  });
});
