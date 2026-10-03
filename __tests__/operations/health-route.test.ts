import { beforeEach, describe, expect, it, vi } from "vitest";

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
});
