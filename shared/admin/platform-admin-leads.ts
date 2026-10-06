import { z } from "zod";

export const leadStatusLabels = {
  new: "Baru",
  contacted: "Dihubungi",
  interested: "Tertarik",
  not_qualified: "Tidak lanjut",
} as const;

export const leadStatuses = Object.keys(leadStatusLabels) as [keyof typeof leadStatusLabels, ...(keyof typeof leadStatusLabels)[]];

export const leadUpdateSchema = z.object({
  status: z.enum(leadStatuses),
  followUpNote: z.string().trim().max(2000, "Catatan maksimal 2.000 karakter.").nullable(),
  followUpDate: z.iso.date().nullable(),
}).strict();

export type LeadStatus = keyof typeof leadStatusLabels;
export type LeadUpdateInput = z.infer<typeof leadUpdateSchema>;
