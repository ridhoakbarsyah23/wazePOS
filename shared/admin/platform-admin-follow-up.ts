import { z } from "zod";

export const followUpStatusLabels = {
  open: "Belum ditangani",
  in_progress: "Sedang ditangani",
  completed: "Selesai",
} as const;

export const followUpInputSchema = z.object({
  note: z.string().trim().min(1, "Catatan wajib diisi.").max(2000, "Catatan maksimal 2.000 karakter."),
  status: z.enum(["open", "in_progress", "completed"]),
  followUpDate: z.iso.date().nullable(),
  expectedLatestId: z.string().uuid().nullable(),
}).strict().refine((value) => value.status !== "completed" || value.followUpDate === null, {
  message: "Penanganan selesai tidak memerlukan tanggal tindak lanjut.",
  path: ["followUpDate"],
});

export type FollowUpInput = z.infer<typeof followUpInputSchema>;
export type FollowUpEntry = {
  id: string;
  note: string;
  status: keyof typeof followUpStatusLabels;
  followUpDate: string | null;
  authorName: string;
  authorEmail: string;
  createdAt: string;
};
export type FollowUpData = {
  latest: FollowUpEntry | null;
  entries: FollowUpEntry[];
  pagination: { page: number; total: number; totalPages: number };
};
