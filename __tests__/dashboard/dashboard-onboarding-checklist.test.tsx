import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardOnboardingChecklist } from "@/components/dashboard/dashboard-onboarding-checklist";

describe("DashboardOnboardingChecklist", () => {
  it("meminta kategori dibuat sebelum produk", () => {
    render(
      <DashboardOnboardingChecklist
        hasCategories={false}
        hasProducts={false}
        hasSales={false}
        outletSlug="gerai-utama"
      />,
    );

    expect(screen.getByText("2. Tambah Kategori")).toBeDefined();
    expect(screen.getByText("3. Tambah Produk")).toBeDefined();
    expect(screen.getByText("(Tambah kategori dulu)")).toBeDefined();
    expect(screen.getByRole("link", { name: /Tambah/i }).getAttribute("href")).toBe("/categories");
    expect(screen.queryByRole("link", { name: /Buka Kasir/i })).toBeNull();
  });

  it("membuka langkah produk setelah kategori tersedia", () => {
    render(
      <DashboardOnboardingChecklist
        hasCategories
        hasProducts={false}
        hasSales={false}
        outletSlug="gerai-utama"
      />,
    );

    const addLinks = screen.getAllByRole("link", { name: /Tambah/i });
    expect(addLinks).toHaveLength(1);
    expect(addLinks[0]?.getAttribute("href")).toBe("/products?add=1");
    expect(screen.queryByText("(Tambah kategori dulu)")).toBeNull();
  });
});
