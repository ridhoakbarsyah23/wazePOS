import { z } from "zod";
import { businessTypes } from "@/lib/validation/onboarding";

export const businessSettingsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama usaha minimal 2 karakter.")
    .max(100, "Nama usaha maksimal 100 karakter."),
  type: z.enum(businessTypes, { error: "Pilih jenis usaha." }),
});
