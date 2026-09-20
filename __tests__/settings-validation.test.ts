import { describe, expect, it } from "vitest";
import { businessSettingsSchema } from "@/lib/validation/settings";

describe("business settings validation", () => {
  it("normalizes a valid business profile", () => {
    const result = businessSettingsSchema.parse({ name: "  Antigravity Coffee  ", type: "Kedai Kopi" });

    expect(result).toEqual({ name: "Antigravity Coffee", type: "Kedai Kopi" });
  });

  it("rejects unsupported business types", () => {
    const result = businessSettingsSchema.safeParse({ name: "Antigravity Coffee", type: "Teknologi" });

    expect(result.success).toBe(false);
  });
});
