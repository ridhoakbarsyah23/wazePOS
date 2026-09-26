import { describe, expect, it } from "vitest";
import { isUniqueConstraintViolation } from "@/shared/product-errors";
import { productSchema, productUpdateSchema } from "@/shared/validation/catalog";

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

  it("menerima edit produk dengan SKU dan kategori kosong", () => {
    const parsed = productUpdateSchema.parse({
      name: "Teh Manis",
      sku: null,
      categoryId: null,
      sellingPrice: 5_000,
      costPrice: 3_000,
      trackStock: true,
      isActive: true,
    });

    expect(parsed.sku).toBe("");
    expect(parsed.categoryId).toBeNull();
  });

  it("menerima edit data lama tanpa properti opsional", () => {
    const parsed = productUpdateSchema.parse({
      name: "Teh Manis",
      sellingPrice: 5_000,
      costPrice: 3_000,
      trackStock: true,
      isActive: true,
    });

    expect(parsed.sku).toBe("");
    expect(parsed.categoryId).toBeNull();
  });

  it("mengenali konflik unique PostgreSQL untuk respons SKU duplikat", () => {
    expect(isUniqueConstraintViolation({ code: "23505" })).toBe(true);
    expect(isUniqueConstraintViolation({ code: "23503" })).toBe(false);
    expect(isUniqueConstraintViolation(new Error("database gagal"))).toBe(false);
  });
});
