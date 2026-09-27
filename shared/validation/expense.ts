import { z } from "zod";

export const expenseCategories = ["belanja", "gaji", "sewa", "operasional", "lainnya"] as const;

export type ExpenseCategory = (typeof expenseCategories)[number];

export const expenseCategoryLabels: Record<ExpenseCategory, string> = {
  belanja: "Belanja kulakan",
  gaji: "Gaji karyawan",
  sewa: "Sewa & kontrak",
  operasional: "Operasional",
  lainnya: "Lainnya",
};

export const expenseSchema = z.object({
  outletId: z.string().uuid("Gerai tidak valid."),
  category: z.enum(expenseCategories, "Kategori pengeluaran tidak valid."),
  amount: z.coerce
    .number({ error: "Nominal harus berupa angka." })
    .int("Nominal harus berupa bilangan bulat.")
    .min(1, "Nominal minimal Rp1.")
    .max(2_000_000_000, "Nominal terlalu besar."),
  note: z
    .preprocess((value) => (value == null || value === "" ? null : value), z.string().trim().max(200, "Catatan maksimal 200 karakter.").nullable())
    .optional(),
  spentAt: z
    .preprocess((value) => (value == null || value === "" ? null : value), z.coerce.date({ error: "Tanggal tidak valid." }).nullable())
    .optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
