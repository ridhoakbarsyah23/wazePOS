import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppHeader } from "@/components/shared/app-header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/pos",
  useRouter: () => ({ push: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

describe("AppHeader role navigation", () => {
  it("menampilkan Dashboard hanya untuk pemilik usaha", () => {
    const { rerender } = render(
      <AppHeader businessName="Toko Uji" role="admin">
        <main>Konten</main>
      </AppHeader>,
    );

    expect(screen.queryByText("Dashboard")).toBeNull();

    rerender(
      <AppHeader businessName="Toko Uji" role="owner">
        <main>Konten</main>
      </AppHeader>,
    );

    expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
  });
});
