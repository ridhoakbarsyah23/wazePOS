import { createElement, type ReactNode } from "react";
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

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return { type: "img", props: { src, alt, ...rest } };
  },
}));

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => ({
    type: "a",
    props: { href, ...rest, children },
  }),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/components/auth/logout-button", () => ({
  LogoutButton: () => null,
}));

import PlatformAdminLayout from "@/app/admin/layout";

beforeEach(() => {
  mocks.requirePlatformAdmin.mockReset();
  mocks.requirePlatformAdmin.mockResolvedValue({ user: { email: "admin@wazepos.com" } });
  mocks.getCookie.mockReset();
  mocks.getCookie.mockReturnValue(undefined);
});

describe("PlatformAdminLayout", () => {
  it("memvalidasi akses sebelum mengembalikan shell admin", async () => {
    const children = createElement("main", null, "admin");

    const result = await PlatformAdminLayout({ children });

    expect(result.props.initialTheme).toBe("light");
    expect(result.props.children.props.adminEmail).toBe("admin@wazepos.com");
    expect(result.props.children.props.children).toBe(children);
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
