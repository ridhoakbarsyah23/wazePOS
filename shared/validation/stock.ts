import { z } from "zod";

export const stockAdjustmentSchema = z.object({
  outletId: z.string().uuid("Gerai tidak valid."),
  productId: z.string().uuid("Produk tidak valid."),
  quantity: z.coerce.number().int("Jumlah harus bilangan bulat.").min(0).max(10_000_000),
  lowStockThreshold: z.coerce.number().int("Batas minimum harus bilangan bulat.").min(0).max(10_000_000),
  note: z.string().trim().max(200).optional(),
});
