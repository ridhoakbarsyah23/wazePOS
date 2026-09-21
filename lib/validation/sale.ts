import { z } from "zod";

export const saleSchema = z.object({
  clientRequestId: z.string().uuid("Identitas transaksi tidak valid."),
  outletId: z.string().uuid("Gerai tidak valid."),
  paymentMethod: z.enum(["cash", "qris", "debit", "credit"]),
  paidAmount: z.coerce.number().int().min(0).max(2_000_000_000),
  items: z.array(
    z.object({
      productId: z.string().uuid("Produk tidak valid."),
      quantity: z.coerce.number().int().min(1).max(10_000),
    }),
  ).min(1, "Keranjang masih kosong."),
});
