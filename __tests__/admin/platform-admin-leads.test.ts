import { describe, expect, it } from "vitest";
import { normalizePlatformAdminLeadFilters } from "@/server/admin/platform-admin-leads";

describe("normalizePlatformAdminLeadFilters", () => {
  it("keeps safe lead filters from search params", () => {
    expect(
      normalizePlatformAdminLeadFilters({
        q: " Kedai ",
        source: " marketing_form ",
        createdFrom: "2026-10-01",
        createdTo: "2026-10-05",
        sort: "name_asc",
      }),
    ).toEqual({
      query: "Kedai",
      source: "marketing_form",
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
        sort: "popular",
      }),
    ).toMatchObject({
      query: "A".repeat(100),
      createdFrom: "",
      createdTo: "",
      sort: "newest",
    });
  });
});
