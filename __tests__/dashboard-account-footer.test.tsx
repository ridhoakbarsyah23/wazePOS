import { fireEvent, render, screen } from "@testing-library/react";
import { Shield } from "lucide-react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardAccountFooter } from "@/components/dashboard-account-footer";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

describe("DashboardAccountFooter", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.dashboardTheme;
  });

  it("keeps account details readable and moves secondary actions into a menu", () => {
    render(
      <DashboardAccountFooter
        userName="Rina Pratama"
        roleLabel="Admin Gerai"
        outletName="Antigravity Coffee"
        roleIcon={Shield}
        allowDarkMode
        showSettings
      />,
    );

    expect(screen.getByText("Rina Pratama")).toBeDefined();
    expect(screen.getByText("Admin Gerai - Antigravity Coffee")).toBeDefined();
    expect(screen.getByRole("button", { name: "Keluar" })).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: "Buka menu akun" }));

    const menu = screen.getByRole("menu", { name: "Menu akun" });
    expect(menu).toBeDefined();
    expect(menu.className).toContain("inset-x-3.5");
    expect(screen.getByRole("menuitem", { name: "Profil akun" })).toBeDefined();
    expect(screen.getByRole("menuitem", { name: "Pengaturan" })).toBeDefined();
    expect(screen.getByRole("menuitemcheckbox", { name: "Gunakan mode gelap" })).toBeDefined();
    expect(screen.queryByRole("menuitem", { name: "Keluar" })).toBeNull();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu", { name: "Menu akun" })).toBeNull();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Buka menu akun" }));
  });

  it("keeps profile access and logout available for cashier", () => {
    render(
      <DashboardAccountFooter
        roleLabel="Kasir"
        outletName="Gerai Utama"
        roleIcon={Shield}
        allowDarkMode={false}
        showSettings={false}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Buka menu akun" }));
    expect(screen.getByRole("menuitem", { name: "Profil akun" })).toBeDefined();
    expect(screen.queryByRole("menuitem", { name: "Pengaturan" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Keluar" }));
    expect(screen.getByRole("dialog")).toBeDefined();
    expect(screen.getByText("Keluar dari wazePOS?")).toBeDefined();
  });
});
