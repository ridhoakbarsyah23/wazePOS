import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PlatformAdminNav } from "@/components/admin/platform-admin-nav";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: ReactNode }) => (
    <a href={typeof href === "string" ? href : "#"} {...rest}>
      {children}
    </a>
  ),
}));

const mocks = vi.hoisted(() => ({
  pathname: "/admin",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
}));

describe("PlatformAdminNav", () => {
  it("menandai ringkasan sebagai halaman aktif pada /admin", () => {
    mocks.pathname = "/admin";
    render(<PlatformAdminNav />);

    expect(screen.getByRole("link", { name: "Ringkasan" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Daftar usaha" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Langganan" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Pembayaran" }).getAttribute("aria-current")).toBeNull();
    expect(screen.getByRole("link", { name: "Audit" }).getAttribute("aria-current")).toBeNull();
  });

  it("menandai daftar usaha sebagai halaman aktif pada rute direktori", () => {
    mocks.pathname = "/admin/businesses";
    render(<PlatformAdminNav />);

    expect(screen.getByRole("link", { name: "Daftar usaha" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "Ringkasan" }).getAttribute("aria-current")).toBeNull();
  });

  it("menandai halaman langganan, pembayaran, dan audit sesuai rute aktif", () => {
    mocks.pathname = "/admin/subscriptions";
    const { unmount } = render(<PlatformAdminNav />);
    expect(screen.getByRole("link", { name: "Langganan" }).getAttribute("aria-current")).toBe("page");
    unmount();

    mocks.pathname = "/admin/payments";
    const payments = render(<PlatformAdminNav />);
    expect(screen.getByRole("link", { name: "Pembayaran" }).getAttribute("aria-current")).toBe("page");
    payments.unmount();

    mocks.pathname = "/admin/audit";
    render(<PlatformAdminNav />);
    expect(screen.getByRole("link", { name: "Audit" }).getAttribute("aria-current")).toBe("page");
  });
});
