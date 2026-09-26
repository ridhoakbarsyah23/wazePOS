import { z } from "zod";
import { planIds } from "@/shared/billing/plans";

export const businessTypes = ["Toko", "Warung", "Kedai Kopi", "Restoran", "Laundry", "Ritel", "Lainnya"] as const;

export const onboardingSchema = z.object({
  businessName: z.string().trim().min(2, "Nama usaha minimal 2 karakter.").max(100, "Nama usaha maksimal 100 karakter."),
  businessType: z.enum(businessTypes, { error: "Pilih jenis usaha." }),
  outletName: z.string().trim().min(2, "Nama gerai minimal 2 karakter.").max(100, "Nama gerai maksimal 100 karakter."),
  address: z.string().trim().max(300, "Alamat maksimal 300 karakter.").optional(),
  plan: z.enum(planIds, { error: "Pilih paket wazePOS yang tersedia." }),
});
