import { z } from "zod";
import { planIds } from "@/shared/billing/plans";

export const changeTrialPlanSchema = z.object({
  plan: z.enum(planIds, { error: "Pilih paket wazePOS yang tersedia." }),
});

export const createBankTransferOrderSchema = z.object({
  plan: z.enum(planIds, { error: "Pilih paket wazePOS yang tersedia." }),
});

export const uploadTransferProofSchema = z.object({
  paymentId: z.string().min(1, { error: "ID pembayaran tidak valid." }).max(120),
  senderBank: z
    .string({ error: "Nama bank pengirim wajib diisi." })
    .trim()
    .min(2, { error: "Nama bank pengirim minimal 2 karakter." })
    .max(60, { error: "Nama bank pengirim maksimal 60 karakter." }),
  senderAccountName: z
    .string({ error: "Nama pemilik rekening wajib diisi." })
    .trim()
    .min(2, { error: "Nama pemilik rekening minimal 2 karakter." })
    .max(120, { error: "Nama pemilik rekening maksimal 120 karakter." }),
  proofDataUrl: z
    .string({ error: "Bukti transfer wajib diunggah." })
    .trim()
    .min(1, { error: "Bukti transfer wajib diunggah." })
    .max(6_000_000, { error: "Ukuran bukti transfer terlalu besar." }),
});

export type UploadTransferProofInput = z.infer<typeof uploadTransferProofSchema>;

export const verifyBankTransferSchema = z.object({
  paymentId: z.string().min(1, { error: "ID pembayaran tidak valid." }).max(120),
  decision: z.enum(["approve", "reject"], { error: "Keputusan verifikasi tidak valid." }),
  note: z
    .string()
    .trim()
    .max(500, { error: "Catatan verifikasi maksimal 500 karakter." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type VerifyBankTransferInput = z.infer<typeof verifyBankTransferSchema>;

export const markPaymentDisbursedSchema = z.object({
  paymentId: z.string().min(1, { error: "ID pembayaran tidak valid." }).max(120),
  reference: z
    .string()
    .trim()
    .max(120, { error: "Referensi pencairan maksimal 120 karakter." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  note: z
    .string()
    .trim()
    .max(500, { error: "Catatan pencairan maksimal 500 karakter." })
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
});

export type MarkPaymentDisbursedInput = z.infer<typeof markPaymentDisbursedSchema>;

export const TRANSFER_PROOF_MIME_ALLOWLIST = ["image/jpeg", "image/png", "image/webp"] as const;

export type TransferProofMime = (typeof TRANSFER_PROOF_MIME_ALLOWLIST)[number];

const DATA_URL_PATTERN = /^data:(image\/jpeg|image\/png|image\/webp);base64,([A-Za-z0-9+/=]+)$/;

export function parseTransferProofDataUrl(value: string): { mime: TransferProofMime; base64: string } | null {
  const match = DATA_URL_PATTERN.exec(value.trim());
  if (!match) return null;
  const mime = match[1] as TransferProofMime;
  if (!TRANSFER_PROOF_MIME_ALLOWLIST.includes(mime)) return null;
  return { mime, base64: match[2] };
}
