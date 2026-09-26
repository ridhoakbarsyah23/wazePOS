import { z } from "zod";

const requiredText = (label: string, maximum: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi.`)
    .max(maximum, `${label} maksimal ${maximum} karakter.`);

// Normalisasi nomor telepon Indonesia: buang spasi/tanda baca lalu ubah awalan
// +62/62/0 menjadi format 62xxxxxxxxxx. Kosong dibiarkan kosong (opsional).
const optionalPhone = z.preprocess(
  (value) => (value == null || value === "" ? "" : value),
  z
    .string()
    .transform((value) => value.replace(/[\s\-().]/g, ""))
    .transform((value) => {
      if (!value) return "";
      if (value.startsWith("+62")) return `62${value.slice(3)}`;
      if (value.startsWith("62")) return value;
      if (value.startsWith("0")) return `62${value.slice(1)}`;
      return value;
    })
    .refine(
      (value) => value === "" || /^62\d{8,13}$/.test(value),
      "Nomor telepon harus nomor Indonesia yang valid, contoh: 081234567890.",
    ),
);

const optionalEmail = z.preprocess(
  (value) => (value == null || value === "" ? "" : value),
  z
    .string()
    .trim()
    .max(200, "Email maksimal 200 karakter.")
    .refine(
      (value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
      "Format email tidak valid.",
    ),
);

const optionalNote = z.preprocess(
  (value) => (value == null ? "" : value),
  z.string().trim().max(500, "Catatan maksimal 500 karakter."),
);

export const customerSchema = z.object({
  name: requiredText("Nama pelanggan", 100),
  phone: optionalPhone,
  email: optionalEmail,
  note: optionalNote,
});
