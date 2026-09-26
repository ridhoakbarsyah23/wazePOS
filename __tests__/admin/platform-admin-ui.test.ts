import { describe, expect, it } from "vitest";
import { formatBusinessReference } from "@/shared/admin/platform-admin-ui";

describe("formatBusinessReference", () => {
  it("membentuk kode usaha yang stabil, terbaca, dan dapat diurutkan", () => {
    expect(
      formatBusinessReference(
        "b9458848-23e9-4edd-86c2-07f10ad4170e",
        "2026-09-24T14:30:00.000Z",
      ),
    ).toBe("BIZ-20260924-B9458848");
  });
});
