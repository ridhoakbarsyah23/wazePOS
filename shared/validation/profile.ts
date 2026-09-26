import { z } from "zod";

export const accountProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama lengkap minimal 2 karakter.")
    .max(80, "Nama lengkap maksimal 80 karakter."),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan kata sandi saat ini."),
    newPassword: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter.")
      .max(128, "Kata sandi baru maksimal 128 karakter."),
    confirmPassword: z.string().min(1, "Ulangi kata sandi baru."),
    revokeOtherSessions: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Konfirmasi kata sandi tidak sama.",
      });
    }
    if (value.currentPassword === value.newPassword) {
      context.addIssue({
        code: "custom",
        path: ["newPassword"],
        message: "Kata sandi baru harus berbeda dari kata sandi saat ini.",
      });
    }
  });

