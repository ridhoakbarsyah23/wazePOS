import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentSession } from "@/lib/auth-session";
import { normalizePlan, plans } from "@/lib/plans";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  if (await getCurrentSession()) redirect("/dashboard");
  const selectedPlan = normalizePlan((await searchParams).plan);

  return (
    <AuthPageShell
      eyebrow="Mulai uji coba gratis"
      title="Buat akun wazePOS"
      description={`Isi data akun untuk memulai uji coba Paket ${plans[selectedPlan].name}.`}
      footerText="Sudah punya akun?"
      footerLinkLabel="Masuk sekarang"
      footerHref="/login"
    >
      <RegisterForm selectedPlan={selectedPlan} />
    </AuthPageShell>
  );
}
