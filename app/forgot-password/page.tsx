import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { getCurrentSession } from "@/lib/auth-session";

export default async function ForgotPasswordPage() {
  if (await getCurrentSession()) redirect("/dashboard");

  return (
    <AuthPageShell
      eyebrow="Bantuan Akses Akun"
      title="Lupa Kata Sandi?"
      description="Masukkan email terdaftar untuk mengatur ulang kata sandi akun wazePOS Anda."
      footerText="Sudah ingat kata sandi Anda?"
      footerLinkLabel="Masuk sekarang"
      footerHref="/login"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
