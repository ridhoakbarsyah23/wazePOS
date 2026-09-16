import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentSession } from "@/lib/auth-session";

export default async function LoginPage() {
  if (await getCurrentSession()) redirect("/dashboard");

  return (
    <AuthPageShell
      eyebrow="Selamat datang kembali"
      title="Masuk ke wazePOS"
      description="Gunakan email dan kata sandi akun Anda."
      footerText="Belum punya akun?"
      footerLinkLabel="Daftar sekarang"
      footerHref="/register"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
