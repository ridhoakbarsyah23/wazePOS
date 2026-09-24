import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StockAdjustmentForm } from "@/components/stock-adjustment-form";

const outlets = [{ id: "outlet-1", name: "Gerai Utama" }];
const products = [
  { id: "product-1", name: "Kopi Hitam" },
  { id: "product-2", name: "Teh Manis" },
];
const stockSettings = [
  { outletId: "outlet-1", productId: "product-1", currentQuantity: 12, lowStockThreshold: 4 },
  { outletId: "outlet-1", productId: "product-2", currentQuantity: 7, lowStockThreshold: 9 },
];

describe("StockAdjustmentForm", () => {
  it("shows concise professional labels without an unsolicited quick-update notice", () => {
    render(
      <StockAdjustmentForm
        outlets={outlets}
        products={products}
        stockSettings={stockSettings}
        initialOutletId="outlet-1"
        initialProductId="product-1"
      />,
    );

    expect(screen.queryByText("Produk siap diperbarui")).toBeNull();
    expect(screen.getByLabelText("Gerai")).toBeDefined();
    expect(screen.getByLabelText("Produk")).toBeDefined();
    expect(screen.getByLabelText(/Stok aktual/)).toBeDefined();
    expect(screen.getByText("Stok sistem: 12 unit")).toBeDefined();
    expect(screen.getByRole("button", { name: "Simpan penyesuaian" }).hasAttribute("disabled")).toBe(true);
  });

  it("shows contextual guidance and follows the selected product threshold", () => {
    render(
      <StockAdjustmentForm
        outlets={outlets}
        products={products}
        stockSettings={stockSettings}
        initialOutletId="outlet-1"
        initialProductId="product-1"
        showSelectionHint
      />,
    );

    expect(screen.getByText("Produk siap diperbarui")).toBeDefined();
    fireEvent.change(screen.getByLabelText("Produk"), { target: { value: "product-2" } });
    expect(screen.getByText("Stok sistem: 7 unit")).toBeDefined();
    expect((screen.getByLabelText("Batas stok minimum") as HTMLInputElement).value).toBe("9");
  });
});
