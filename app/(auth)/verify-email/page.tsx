import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { VerifyEmailForm } from "@/components/auth/verify-email-form";
import { getCurrentSession, getMembership } from "@/server/auth/auth-session";
import { normalizePlan } from "@/shared/billing/plans";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getCurrentSession();
  if (session?.user.emailVerified) {
    // Terverifikasi + sudah punya usaha → dashboard; terverifikasi tapi
    // belum onboarding (mis. buka ulang halaman) → onboarding dengan plan
    // yang dipertahankan bila ada.
    if (await getMembership(session.user.id)) redirect("/dashboard");
    redirect(`/onboarding?plan=${normalizePlan((await searchParams).plan)}`);
  }

  return (
    <AuthPageShell
      eyebrow="Verifikasi email"
      title="Masukkan kode verifikasi"
      description="Kami mengirim kode 6 digit ke email Anda. Verifikasi untuk mengaktifkan akun."
      footerText="Tidak menerima kode?"
      footerLinkLabel="Kembali ke pendaftaran"
      footerHref="/register"
    >
      <Suspense
        fallback={
          <div className="mt-6 h-64 animate-pulse rounded-2xl bg-[#eef4f1]" aria-hidden="true" />
        }
      >
        <VerifyEmailForm />
      </Suspense>
    </AuthPageShell>
  );
}
