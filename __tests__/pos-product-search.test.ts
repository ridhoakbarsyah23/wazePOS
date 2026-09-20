import { describe, expect, it } from "vitest";
import { filterPosProducts, getProductStockIssue, resolveProductEntry } from "@/lib/pos-product-search";

const products = [
  {
    id: "product-1",
    name: "Kopi Susu",
    sku: "KOPI-001",
    categoryName: "Minuman",
    stock: 2,
    trackStock: true,
  },
  {
    id: "product-2",
    name: "Kopi Hitam",
    sku: "KOPI-002",
    categoryName: "Minuman",
    stock: 0,
    trackStock: true,
  },
  {
    id: "product-3",
    name: "Roti Bakar",
    sku: null,
    categoryName: "Makanan",
    stock: 0,
    trackStock: false,
  },
];

describe("pencarian produk POS", () => {
  it("mencocokkan SKU secara persis tanpa membedakan kapital dan spasi", () => {
    const result = resolveProductEntry(products, "  kopi-001 ");

    expect(result).toEqual({ product: products[0], match: "code" });
  });

  it("memilih satu hasil pencarian nama saat Enter ditekan", () => {
    const result = resolveProductEntry(products, "roti");

    expect(result).toEqual({ product: products[2], match: "search" });
  });

  it("tidak memilih otomatis ketika hasil pencarian ambigu", () => {
    expect(resolveProductEntry(products, "kopi")).toBeNull();
  });

  it("memfilter nama, SKU, dan kategori", () => {
    expect(filterPosProducts(products, "002", "Semua")).toEqual([products[1]]);
    expect(filterPosProducts(products, "", "Makanan")).toEqual([products[2]]);
  });

  it("membedakan stok habis dan batas stok di keranjang", () => {
    expect(getProductStockIssue(products[1], 0)).toBe("out-of-stock");
    expect(getProductStockIssue(products[0], 2)).toBe("stock-limit");
    expect(getProductStockIssue(products[2], 20)).toBeNull();
  });
});
