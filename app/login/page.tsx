import { Suspense } from "react";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage() {
  // Selalu tampilkan form: user yang sudah login tetap bisa membuka /login
  // (mis. ingin ganti akun). Auto-redirect ke /dashboard di sini membuat
  // klik "Masuk" terasa melewati halaman login secara langsung.
  //
  // LoginForm membaca useSearchParams (parameter ?reset), sehingga wajib
  // dibungkus Suspense agar halaman tetap bisa di-prerender saat build.
  return (
    <AuthPageShell
      eyebrow="Selamat datang kembali"
      title="Masuk ke wazePOS"
      description="Gunakan Google atau email dan kata sandi akun Anda."
      footerText="Belum punya akun?"
      footerLinkLabel="Daftar sekarang"
      footerHref="/register"
    >
      <Suspense
        fallback={
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-[#eef4f1]" aria-hidden="true" />
        }
      >
        <LoginForm googleSsoEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />
      </Suspense>
    </AuthPageShell>
  );
}
