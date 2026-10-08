import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/shared/app-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pos",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AppHeader role navigation", () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.dashboardTheme;
  });

  it("tidak membuat link kasir ke /pos/all saat filter semua gerai aktif", () => {
    render(
      <AppHeader
        businessName="Toko Uji"
        role="owner"
        outlets={[
          { id: "outlet-1", name: "Gerai Utama", slug: "gerai-utama" },
          { id: "outlet-2", name: "Gerai Dua", slug: "gerai-dua" },
        ]}
        activeOutletId="all"
      >
        <main>Konten</main>
      </AppHeader>,
    );

    const cashierLinks = screen.getAllByRole("link", { name: /kasir/i });

    expect(cashierLinks.some((link) => link.getAttribute("href") === "/pos/all")).toBe(false);
    expect(cashierLinks.some((link) => link.getAttribute("href") === "/pos")).toBe(true);
  });

  it("menampilkan Dashboard untuk pemilik dan admin usaha", () => {
    const { rerender } = render(
      <AppHeader businessName="Toko Uji" role="cashier">
        <main>Konten</main>
      </AppHeader>,
    );

    expect(screen.queryByText("Dashboard")).toBeNull();

    rerender(
      <AppHeader businessName="Toko Uji" role="admin">
        <main>Konten</main>
      </AppHeader>,
    );

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);

    rerender(
      <AppHeader businessName="Toko Uji" role="owner">
        <main>Konten</main>
      </AppHeader>,
    );

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });

  it("menyediakan shell dan menu akun yang siap dark mode", async () => {
    const { container } = render(
      <AppHeader businessName="Toko Uji" role="owner" allowDarkMode userName="Ridho">
        <main>Konten</main>
      </AppHeader>,
    );

    const shell = container.querySelector("[data-dashboard-shell]");
    expect(shell?.className).toContain("dark:bg-[#050505]");

    fireEvent.click(screen.getAllByRole("button", { name: "Buka menu akun" })[0]);
    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Gunakan mode gelap" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.dashboardTheme).toBe("dark");
    });
  });
});
