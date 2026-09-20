import { describe, expect, it } from "vitest";
import { isUniqueConstraintViolation } from "@/lib/product-errors";
import { productSchema } from "@/lib/validation/catalog";

const validProduct = {
  name: "Kopi Susu",
  sku: " kopi-001 ",
  categoryId: null,
  outletId: "11111111-1111-4111-8111-111111111111",
  sellingPrice: 20_000,
  costPrice: 10_000,
  initialStock: 10,
  lowStockThreshold: 3,
  trackStock: true,
};

describe("validasi produk", () => {
  it("merapikan dan mengubah SKU menjadi huruf kapital", () => {
    const parsed = productSchema.parse(validProduct);

    expect(parsed.sku).toBe("KOPI-001");
  });

  it("menolak harga modal yang lebih tinggi dari harga jual", () => {
    const parsed = productSchema.safeParse({ ...validProduct, costPrice: 25_000 });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0]?.message).toBe("Harga modal tidak boleh lebih besar dari harga jual.");
    }
  });

  it("mengenali konflik unique PostgreSQL untuk respons SKU duplikat", () => {
    expect(isUniqueConstraintViolation({ code: "23505" })).toBe(true);
    expect(isUniqueConstraintViolation({ code: "23503" })).toBe(false);
    expect(isUniqueConstraintViolation(new Error("database gagal"))).toBe(false);
  });
});
