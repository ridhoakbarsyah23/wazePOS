import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { getCurrentSession } from "@/lib/auth/auth-session";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  if (await getCurrentSession()) redirect("/dashboard");
  const { token } = await searchParams;

  return (
    <AuthPageShell
      eyebrow="Keamanan Akun"
      title="Atur Kata Sandi Baru"
      description="Buat kata sandi baru minimal 8 karakter untuk melindungi akun dan bisnis Anda."
      footerText="Sudah selesai?"
      footerLinkLabel="Masuk ke akun"
      footerHref="/login"
    >
      <ResetPasswordForm token={token ?? ""} />
    </AuthPageShell>
  );
}
