import { z } from "zod";

/**
 * Pengaturan struk per bisnis. Disimpan sebagai JSON di business.receipt_settings;
 * null = belum pernah dikustom → pakai DEFAULT_RECEIPT_SETTINGS.
 */

export const receiptFooterMessages = ["thankYou", "none"] as const;

export const receiptSettingsSchema = z.object({
  /** Baris teks tambahan di kepala struk, mis. alamat atau slogan */
  headerNote: z
    .string()
    .trim()
    .max(120, "Catatan kepala struk maksimal 120 karakter.")
    .default(""),
  /** Baris teks pengganti/penambah pesan penutup */
  footerNote: z
    .string()
    .trim()
    .max(120, "Catatan penutup struk maksimal 120 karakter.")
    .default(""),
  /** Tampilkan logo wazePOS di kepala struk */
  showLogo: z.boolean().default(true),
  /** Tampilkan nama kasir di blok meta */
  showCashier: z.boolean().default(true),
  /** Tampilkan tanggal & jam transaksi */
  showDateTime: z.boolean().default(true),
  /** Tampilkan rincian harga satuan per item */
  showUnitPrice: z.boolean().default(true),
  /** Pesan penutup struk */
  footerMessage: z.enum(receiptFooterMessages).default("thankYou"),
});

export type ReceiptSettings = z.infer<typeof receiptSettingsSchema>;

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = receiptSettingsSchema.parse({});

/** Normalisasi nilai dari DB (bisa null / JSON lama) menjadi objek lengkap. */
export function normalizeReceiptSettings(value: unknown): ReceiptSettings {
  const parsed = receiptSettingsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : DEFAULT_RECEIPT_SETTINGS;
}
