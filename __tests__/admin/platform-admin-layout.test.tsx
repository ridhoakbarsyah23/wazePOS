import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  getCookie: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: mocks.getCookie })),
}));

vi.mock("@/lib/admin/platform-admin", () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
}));

import PlatformAdminLayout from "@/app/admin/layout";

beforeEach(() => {
  mocks.requirePlatformAdmin.mockReset();
  mocks.requirePlatformAdmin.mockResolvedValue(undefined);
  mocks.getCookie.mockReset();
  mocks.getCookie.mockReturnValue(undefined);
});

describe("PlatformAdminLayout", () => {
  it("memvalidasi akses sebelum mengembalikan children", async () => {
    const children = createElement("main", null, "admin");

    const result = await PlatformAdminLayout({ children });

    expect(result.props.initialTheme).toBe("light");
    expect(result.props.children).toBe(children);
    expect(mocks.requirePlatformAdmin).toHaveBeenCalledTimes(1);
  });

  it("menerapkan preferensi tema gelap dari cookie admin", async () => {
    mocks.getCookie.mockReturnValue({ value: "dark" });

    const result = await PlatformAdminLayout({ children: createElement("main") });

    expect(result.props.initialTheme).toBe("dark");
  });

  it("tidak mengembalikan children ketika guard menolak akses", async () => {
    mocks.requirePlatformAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      PlatformAdminLayout({ children: createElement("main", null, "admin") }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});
