import { z } from "zod";
import { planIds } from "@/lib/billing/plans";

export const changeTrialPlanSchema = z.object({
  plan: z.enum(planIds, { error: "Pilih paket wazePOS yang tersedia." }),
});
