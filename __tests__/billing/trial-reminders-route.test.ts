import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  sendTrialReminders: vi.fn(),
  emailConfig: vi.fn(),
}));

vi.mock("@/server/billing/trial-reminders", () => ({
  sendTrialReminders: mocks.sendTrialReminders,
}));

vi.mock("@/server/email/trial-ending-email", () => ({
  getTrialReminderEmailConfig: mocks.emailConfig,
}));

import { GET } from "@/app/api/billing/trial-reminders/route";

const originalCronSecret = process.env.CRON_SECRET;

function restoreEnv() {
  if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalCronSecret;
}

function cronRequest(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return new Request("http://localhost/api/billing/trial-reminders", { headers });
}

describe("route cron pengingat trial", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.emailConfig.mockReturnValue({ apiKey: "test", from: "test@example.com" });
    restoreEnv();
  });

  afterEach(restoreEnv);

  it("menolak permintaan tanpa header Authorization", async () => {
    process.env.CRON_SECRET = "rahasia-cron";
    const response = await GET(cronRequest());

    expect(response.status).toBe(401);
    expect(mocks.sendTrialReminders).not.toHaveBeenCalled();
  });

  it("menolak bearer token yang salah", async () => {
    process.env.CRON_SECRET = "rahasia-cron";
    const response = await GET(cronRequest("Bearer token-salah"));

    expect(response.status).toBe(401);
    expect(mocks.sendTrialReminders).not.toHaveBeenCalled();
  });

  it("menandai layanan belum siap bila CRON_SECRET kosong", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(cronRequest("Bearer apa-pun"));

    expect(response.status).toBe(503);
    expect(mocks.sendTrialReminders).not.toHaveBeenCalled();
  });

  it("menjalankan pengingat dan mengembalikan ringkasan saat token cocok", async () => {
    process.env.CRON_SECRET = "rahasia-cron";
    mocks.sendTrialReminders.mockResolvedValue({ sent: 2, failed: 0, skipped: 1 });

    const response = await GET(cronRequest("Bearer rahasia-cron"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.sendTrialReminders).toHaveBeenCalledOnce();
    expect(body).toEqual({ ok: true, sent: 2, failed: 0, skipped: 1 });
  });
});

describe("kegagalan pemrosesan cron", () => {
  afterEach(restoreEnv);

  it("menolak konfigurasi email yang belum lengkap sebelum memproses", async () => {
    process.env.CRON_SECRET = "test";
    mocks.emailConfig.mockReturnValue(null);
    mocks.sendTrialReminders.mockClear();
    expect((await GET(cronRequest("Bearer test"))).status).toBe(503);
    expect(mocks.sendTrialReminders).not.toHaveBeenCalled();
  });

  it("mengembalikan 502 saat ada email yang gagal", async () => {
    process.env.CRON_SECRET = "test";
    mocks.emailConfig.mockReturnValue({ apiKey: "test", from: "test@example.com" });
    mocks.sendTrialReminders.mockResolvedValue({ sent: 1, failed: 1, skipped: 0 });
    const response = await GET(cronRequest("Bearer test"));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, sent: 1, failed: 1, skipped: 0 });
  });

  it("menyembunyikan detail error database", async () => {
    process.env.CRON_SECRET = "test";
    mocks.emailConfig.mockReturnValue({ apiKey: "test", from: "test@example.com" });
    mocks.sendTrialReminders.mockRejectedValue(new Error("sensitive-database-url"));
    const response = await GET(cronRequest("Bearer test"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("sensitive-database-url");
  });
});
