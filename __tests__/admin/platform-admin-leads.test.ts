import { describe, expect, it } from "vitest";
import { normalizePlatformAdminLeadFilters } from "@/server/admin/platform-admin-leads";
import { leadUpdateSchema } from "@/shared/admin/platform-admin-leads";

describe("normalizePlatformAdminLeadFilters", () => {
  it("keeps safe lead filters from search params", () => {
    expect(
      normalizePlatformAdminLeadFilters({
        q: " Kedai ",
        source: " marketing_form ",
        status: "interested",
        followUp: "due",
        createdFrom: "2026-10-01",
        createdTo: "2026-10-05",
        sort: "name_asc",
      }),
    ).toEqual({
      query: "Kedai",
      source: "marketing_form",
      status: "interested",
      followUp: "due",
      createdFrom: "2026-10-01",
      createdTo: "2026-10-05",
      sort: "name_asc",
    });
  });

  it("falls back from unsupported date and sort values", () => {
    expect(
      normalizePlatformAdminLeadFilters({
        q: ["A".repeat(120)],
        createdFrom: "05-10-2026",
        createdTo: "not-a-date",
        status: "archived",
        followUp: "later",
        sort: "popular",
      }),
    ).toMatchObject({
      query: "A".repeat(100),
      createdFrom: "",
      createdTo: "",
      status: "all",
      followUp: "all",
      sort: "newest",
    });
  });
});

describe("leadUpdateSchema", () => {
  it("accepts a valid lead status update payload", () => {
    const parsed = leadUpdateSchema.safeParse({
      status: "contacted",
      followUpNote: "Sudah dihubungi via WhatsApp.",
      followUpDate: "2026-10-06",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unsupported status and overlong notes", () => {
    expect(
      leadUpdateSchema.safeParse({
        status: "archived",
        followUpNote: "Catatan",
        followUpDate: null,
      }).success,
    ).toBe(false);
    expect(
      leadUpdateSchema.safeParse({
        status: "new",
        followUpNote: "x".repeat(2001),
        followUpDate: null,
      }).success,
    ).toBe(false);
  });
});
