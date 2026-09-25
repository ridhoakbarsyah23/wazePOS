import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/admin/platform-admin", () => ({
  requirePlatformAdmin: mocks.requirePlatformAdmin,
}));

import PlatformAdminLayout from "@/app/admin/layout";

beforeEach(() => {
  mocks.requirePlatformAdmin.mockReset();
  mocks.requirePlatformAdmin.mockResolvedValue(undefined);
});

describe("PlatformAdminLayout", () => {
  it("memvalidasi akses sebelum mengembalikan children", async () => {
    const children = createElement("main", null, "admin");

    await expect(PlatformAdminLayout({ children })).resolves.toBe(children);
    expect(mocks.requirePlatformAdmin).toHaveBeenCalledTimes(1);
  });

  it("tidak mengembalikan children ketika guard menolak akses", async () => {
    mocks.requirePlatformAdmin.mockRejectedValue(new Error("NEXT_REDIRECT"));

    await expect(
      PlatformAdminLayout({ children: createElement("main", null, "admin") }),
    ).rejects.toThrow("NEXT_REDIRECT");
  });
});
