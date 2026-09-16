import { z } from "zod";

const requiredText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(maximum, `${label} maksimal ${maximum} karakter.`);

const rupiahValue = (label: string) =>
  z.coerce
    .number({ error: `${label} harus berupa angka.` })
    .int(`${label} harus berupa bilangan bulat.`)
    .min(0, `${label} tidak boleh negatif.`)
    .max(2_000_000_000, `${label} terlalu besar.`);

export const categorySchema = z.object({
  name: requiredText("Nama kategori", 80),
});

export const outletSchema = z.object({
  name: requiredText("Nama gerai", 100),
  address: z.string().trim().max(300, "Alamat maksimal 300 karakter."),
});

export const productSchema = z
  .object({
    name: requiredText("Nama produk", 120),
    sku: z
      .string()
      .trim()
      .max(50, "SKU maksimal 50 karakter.")
      .transform((value) => value.toUpperCase()),
    categoryId: z.preprocess(
      (value) => (value === "" ? null : value),
      z.string().uuid("Kategori tidak valid.").nullable(),
    ),
    outletId: z.string().uuid("Gerai tidak valid."),
    sellingPrice: rupiahValue("Harga jual"),
    costPrice: rupiahValue("Harga modal"),
    initialStock: z.coerce
      .number({ error: "Stok awal harus berupa angka." })
      .int("Stok awal harus berupa bilangan bulat.")
      .min(0, "Stok awal tidak boleh negatif.")
      .max(10_000_000, "Stok awal terlalu besar."),
    lowStockThreshold: z.coerce
      .number({ error: "Batas stok minimum harus berupa angka." })
      .int("Batas stok minimum harus berupa bilangan bulat.")
      .min(0, "Batas stok minimum tidak boleh negatif.")
      .max(10_000_000, "Batas stok minimum terlalu besar."),
    trackStock: z.boolean(),
  })
  .refine((data) => data.costPrice <= data.sellingPrice, {
    message: "Harga modal tidak boleh lebih besar dari harga jual.",
    path: ["costPrice"],
  });

export const stockSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  outletId: z.string().uuid("Gerai tidak valid."),
  quantity: z.coerce
    .number({ error: "Jumlah stok harus berupa angka." })
    .int("Jumlah stok harus berupa bilangan bulat.")
    .min(0, "Jumlah stok tidak boleh negatif.")
    .max(10_000_000, "Jumlah stok terlalu besar."),
  lowStockThreshold: z.coerce
    .number({ error: "Batas stok minimum harus berupa angka." })
    .int("Batas stok minimum harus berupa bilangan bulat.")
    .min(0, "Batas stok minimum tidak boleh negatif.")
    .max(10_000_000, "Batas stok minimum terlalu besar."),
});

export const productStatusSchema = z.object({
  productId: z.string().uuid("Produk tidak valid."),
  isActive: z.boolean(),
});

export const productUpdateSchema = z
  .object({
    name: requiredText("Nama produk", 120),
    sku: z.string().trim().max(50, "SKU maksimal 50 karakter.").transform((value) => value.toUpperCase()),
    categoryId: z.string().uuid("Kategori tidak valid.").nullable(),
    sellingPrice: rupiahValue("Harga jual"),
    costPrice: rupiahValue("Harga modal"),
    trackStock: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((data) => data.costPrice <= data.sellingPrice, {
    message: "Harga modal tidak boleh lebih besar dari harga jual.",
    path: ["costPrice"],
  });
