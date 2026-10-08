import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DashboardSetupManager } from "@/components/dashboard/dashboard-setup-manager";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const outlets = [{ id: "outlet-1", name: "Gerai Utama", address: null }];

describe("DashboardSetupManager", () => {
  it("meminta kategori sebelum produk cepat bisa disimpan", () => {
    render(<DashboardSetupManager initialCategories={[]} initialOutlets={outlets} />);

    fireEvent.click(screen.getByRole("button", { name: "Tambah Produk" }));

    expect(screen.getByText("Buat kategori sebelum produk")).toBeDefined();
    expect(screen.getByRole("button", { name: "Simpan ke Katalog Produk" })).toHaveProperty("disabled", true);
  });

  it("mewajibkan pilihan kategori pada form produk cepat", () => {
    render(
      <DashboardSetupManager
        initialCategories={[{ id: "category-1", name: "Minuman", productCount: 0 }]}
        initialOutlets={outlets}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tambah Produk" }));

    expect(screen.getByLabelText("Kategori Menu")).toHaveProperty("required", true);
    expect(screen.getByRole("option", { name: "Pilih kategori" })).toHaveProperty("disabled", true);
  });
});
