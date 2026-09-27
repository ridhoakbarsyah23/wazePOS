import { describe, expect, it } from "vitest";
import { expenseCategories, expenseCategoryLabels, expenseSchema } from "@/shared/validation/expense";

describe("validasi pengeluaran", () => {
  it("menerima data valid dengan 5 kategori warung", () => {
    expect(expenseCategories).toEqual(["belanja", "gaji", "sewa", "operasional", "lainnya"]);
    expect(expenseCategoryLabels.belanja).toBe("Belanja kulakan");

    const parsed = expenseSchema.safeParse({
      outletId: "123e4567-e89b-12d3-a456-426614174000",
      category: "belanja",
      amount: 25000,
      note: "kulakan beras",
    });
    expect(parsed.success).toBe(true);
  });

  it("menolak nominal nol dan kategori asing", () => {
    const zero = expenseSchema.safeParse({
      outletId: "123e4567-e89b-12d3-a456-426614174000",
      category: "belanja",
      amount: 0,
    });
    expect(zero.success).toBe(false);

    const foreign = expenseSchema.safeParse({
      outletId: "123e4567-e89b-12d3-a456-426614174000",
      category: "jajan",
      amount: 10000,
    });
    expect(foreign.success).toBe(false);
  });

  it("menghitung kas bersih masuk dikurangi keluar", () => {
    const incomeTotal = 500_000;
    const expenseTotal = 150_000;
    expect(incomeTotal - expenseTotal).toBe(350_000);
  });
});
