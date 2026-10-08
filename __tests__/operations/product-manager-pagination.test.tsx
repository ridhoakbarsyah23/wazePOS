import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ProductManager, type Product } from "@/components/catalog/product-manager";

vi.mock("@/components/ui/confirmation-dialog", () => ({
  ConfirmationDialog: ({ trigger }: { trigger: React.ReactNode }) => trigger,
}));

const products: Product[] = Array.from({ length: 12 }, (_, index) => ({
  id: `product-${index + 1}`,
  name: `Produk ${index + 1}`,
  sku: `SKU-${index + 1}`,
  categoryId: null,
  sellingPrice: 10_000 + index,
  costPrice: 5_000,
  trackStock: true,
  isActive: true,
}));

describe("ProductManager pagination", () => {
  it("mengarahkan pengguna menambah kategori sebelum membuat produk", () => {
    render(<ProductManager products={[]} categories={[]} outlets={[]} initialCreateOpen />);

    expect(screen.getByText("Tambahkan kategori dulu")).toBeDefined();
    expect(screen.getByRole("link", { name: /Tambah Kategori/i }).getAttribute("href")).toBe("/categories");
    expect(screen.queryByRole("heading", { name: "Tambah Produk Baru" })).toBeNull();
  });

  it("membuka form tambah produk dari query tambah saat kategori tersedia", () => {
    render(
      <ProductManager
        products={[]}
        categories={[{ id: "category-1", name: "Minuman" }]}
        outlets={[{ id: "outlet-1", name: "Gerai Utama" }]}
        initialCreateOpen
      />,
    );

    expect(screen.getByRole("heading", { name: "Tambah Produk Baru" })).toBeDefined();
    expect(screen.getByLabelText(/Kategori/i)).toHaveProperty("required", true);
    expect(screen.getByRole("button", { name: "Simpan Produk" })).toHaveProperty("disabled", true);
  });

  it("menampilkan 10 produk per halaman dan mereset halaman saat pencarian berubah", () => {
    render(<ProductManager products={products} categories={[]} outlets={[]} />);

    expect(screen.getByText("Produk 1")).toBeDefined();
    expect(screen.getByText("Produk 10")).toBeDefined();
    expect(screen.queryByText("Produk 11")).toBeNull();
    expect(screen.getByText(/Menampilkan/).textContent).toContain("1–10 dari 12 produk");

    fireEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    expect(screen.queryByText("Produk 1")).toBeNull();
    expect(screen.getByText("Produk 11")).toBeDefined();
    expect(screen.getByText("Produk 12")).toBeDefined();
    expect(screen.getByText(/Menampilkan/).textContent).toContain("11–12 dari 12 produk");

    fireEvent.change(screen.getByPlaceholderText("Cari nama produk atau SKU..."), {
      target: { value: "Produk 1" },
    });

    expect(screen.getByText("Produk 1")).toBeDefined();
    expect(screen.getByText(/Menampilkan/).textContent).toContain("1–4 dari 4 produk");
  });
});
