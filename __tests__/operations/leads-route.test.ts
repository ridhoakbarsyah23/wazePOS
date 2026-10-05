import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(),
  values: vi.fn(),
  update: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: {
    insert: mocks.insert,
    update: mocks.update,
  },
}));

vi.mock("@/server/rate-limit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: () => "127.0.0.1",
  rateLimitResponse: () => Response.json({ message: "rate limited" }, { status: 429 }),
}));

import { POST } from "@/app/api/leads/route";

function leadRequest(overrides: Record<string, unknown> = {}) {
  return new Request("https://pos.example.com/api/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "Ridho",
      whatsapp: "081234567890",
      businessName: "Kedai Uji",
      businessType: "Cafe",
      outlets: "1",
      message: "Mau coba wazePOS",
      ...overrides,
    }),
  });
}

describe("POST /api/leads", () => {
  beforeEach(() => {
    mocks.insert.mockReset();
    mocks.values.mockReset();
    mocks.update.mockReset();
    mocks.set.mockReset();
    mocks.where.mockReset();
    mocks.checkRateLimit.mockReset();
    mocks.checkRateLimit.mockReturnValue({ ok: true, retryAfterSeconds: 0 });
    mocks.insert.mockReturnValue({ values: mocks.values });
    mocks.values.mockResolvedValue(undefined);
    mocks.update.mockReturnValue({ set: mocks.set });
    mocks.set.mockReturnValue({ where: mocks.where });
    mocks.where.mockResolvedValue(undefined);
    vi.stubEnv("NODE_ENV", "production");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("stores valid leads in the database without requiring a webhook", async () => {
    const response = await POST(leadRequest());

    expect(response.status).toBe(200);
    expect(mocks.insert).toHaveBeenCalledTimes(1);
    expect(mocks.values).toHaveBeenCalledWith(expect.objectContaining({
      name: "Ridho",
      whatsapp: "081234567890",
      businessName: "Kedai Uji",
      businessType: "Cafe",
      outlets: "1",
    }));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("treats webhook delivery as optional after database storage succeeds", async () => {
    vi.stubEnv("LEAD_WEBHOOK_URL", "https://crm.example.com/leads");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(leadRequest());

    expect(response.status).toBe(200);
    expect(fetch).toHaveBeenCalledWith("https://crm.example.com/leads", expect.objectContaining({ method: "POST" }));
    expect(errorSpy).toHaveBeenCalled();
  });

  it("returns 502 in production when database storage fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.values.mockRejectedValue(new Error("database down"));

    const response = await POST(leadRequest());

    expect(response.status).toBe(502);
    expect(errorSpy).toHaveBeenCalled();
  });
});
