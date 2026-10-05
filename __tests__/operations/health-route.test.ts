import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ execute: vi.fn() }));

vi.mock("@/db", () => ({
  db: { execute: mocks.execute },
}));

import { GET } from "@/app/api/health/route";

const readyDatabase = {
  userTable: "user",
  accountTable: "account",
  businessTable: "business",
  subscriptionTable: "subscription",
  subscriptionPaymentTable: "subscription_payment",
  leadTable: "lead",
  privacyAcceptedAt: true,
  trialReminderSentAt: true,
  disbursedAt: true,
};

describe("GET /api/health", () => {
  beforeEach(() => {
    mocks.execute.mockReset();
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/wazepos");
    vi.stubEnv("BETTER_AUTH_SECRET", "test-secret-with-at-least-32-characters");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns ready only when auth, business, and latest schema markers exist", async () => {
    mocks.execute.mockResolvedValue([readyDatabase]);

    const response = await GET();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      database: {
        connected: true,
        authTables: true,
        businessTables: true,
        latestSchema: true,
      },
    });
  });

  it("returns 503 when the latest migration markers are missing", async () => {
    mocks.execute.mockResolvedValue([{ ...readyDatabase, disbursedAt: false }]);

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      database: { connected: true, latestSchema: false },
    });
  });

  it("returns 503 when the database cannot be reached", async () => {
    mocks.execute.mockRejectedValue(Object.assign(new Error("connection failed"), { code: "ECONNREFUSED" }));

    const response = await GET();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      database: { connected: false, authTables: false },
    });
  });

  it("does not require production-only integrations outside production", async () => {
    mocks.execute.mockResolvedValue([readyDatabase]);
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("CRON_SECRET", "");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      environment: {
        siteUrl: "http://localhost:3000",
        productionReadiness: {
          siteUrlHttps: false,
          passwordResetEmail: false,
          trialReminderCron: false,
        },
      },
    });
  });

  it("blocks production readiness when operational integrations are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET();

    expect(response.status).toBe(503);
    expect(mocks.execute).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      ok: false,
      database: { connected: false },
    });
  });

  it("allows production readiness when required integrations and schema are ready", async () => {
    mocks.execute.mockResolvedValue([readyDatabase]);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://pos.example.com");
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("RESEND_FROM_EMAIL", "wazePOS <no-reply@example.com>");
    vi.stubEnv("CRON_SECRET", "cron-secret-with-at-least-32-characters");
    vi.stubEnv("BANK_TRANSFER_BANK", "Mandiri");
    vi.stubEnv("BANK_TRANSFER_ACCOUNT_NUMBER", "9876543210");
    vi.stubEnv("BANK_TRANSFER_ACCOUNT_NAME", "PT Contoh POS");
    vi.stubEnv("PLATFORM_ADMIN_EMAILS", "admin@example.com");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.execute).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      database: {
        connected: true,
        latestSchema: true,
      },
    });
  });
});
