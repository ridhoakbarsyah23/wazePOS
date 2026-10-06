import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestSession: vi.fn(),
  updateLead: vi.fn(),
}));

vi.mock("@/server/admin/platform-admin-api", () => ({
  getPlatformAdminRequestSession: mocks.getRequestSession,
}));

vi.mock("@/server/admin/platform-admin-leads", () => ({
  updatePlatformAdminLead: mocks.updateLead,
}));

import { POST } from "@/app/api/admin/leads/[leadId]/route";

const session = {
  user: { id: "admin-1", name: "Dashboard Admin", email: "admin@wazepos.com" },
};

function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("https://pos.example.com/api/admin/leads/lead-1", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://pos.example.com",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

function params(leadId = "lead-1") {
  return { params: Promise.resolve({ leadId }) };
}

describe("POST /api/admin/leads/[leadId]", () => {
  beforeEach(() => {
    mocks.getRequestSession.mockReset();
    mocks.updateLead.mockReset();
    mocks.getRequestSession.mockResolvedValue({ session, allowed: true });
  });

  it("menolak request tanpa sesi", async () => {
    mocks.getRequestSession.mockResolvedValue({ session: null, allowed: false });

    const response = await POST(request({ status: "contacted", followUpNote: null, followUpDate: null }), params());

    expect(response.status).toBe(401);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("menolak user non-admin", async () => {
    mocks.getRequestSession.mockResolvedValue({ session, allowed: false });

    const response = await POST(request({ status: "contacted", followUpNote: null, followUpDate: null }), params());

    expect(response.status).toBe(403);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("menolak payload status lead yang tidak valid", async () => {
    const response = await POST(request({ status: "archived", followUpNote: null, followUpDate: null }), params());

    expect(response.status).toBe(422);
    expect(mocks.updateLead).not.toHaveBeenCalled();
  });

  it("mengembalikan 404 saat lead tidak ditemukan", async () => {
    mocks.updateLead.mockResolvedValue(null);

    const response = await POST(request({ status: "contacted", followUpNote: null, followUpDate: null }), params());

    expect(response.status).toBe(404);
  });

  it("menyimpan status dan jadwal follow-up lead", async () => {
    const updated = {
      id: "lead-1",
      status: "interested",
      followUpNote: "Minta demo Jumat.",
      followUpDate: "2026-10-09",
      statusUpdatedAt: "2026-10-06T02:00:00.000Z",
    };
    mocks.updateLead.mockResolvedValue(updated);

    const response = await POST(
      request({
        status: "interested",
        followUpNote: "Minta demo Jumat.",
        followUpDate: "2026-10-09",
      }),
      params(),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ lead: updated, message: "Status lead tersimpan." });
    expect(mocks.updateLead).toHaveBeenCalledWith("lead-1", {
      status: "interested",
      followUpNote: "Minta demo Jumat.",
      followUpDate: "2026-10-09",
    });
  });
});
