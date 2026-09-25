import { redirect } from "next/navigation";
import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { getMembership, requireSession } from "@/lib/auth/auth-session";
import { normalizePlan, plans } from "@/lib/billing/plans";

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const session = await requireSession();
  if (await getMembership(session.user.id)) redirect("/dashboard");
  const selectedPlan = normalizePlan((await searchParams).plan);

  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(circle_at_8%_8%,rgba(116,219,168,.24),transparent_32%),linear-gradient(145deg,#eaf8f1,#f8fcfa)] px-4 py-10">
      <section className="w-full max-w-xl rounded-[28px] border border-[#dceae3] bg-white p-8 shadow-[0_26px_70px_rgba(10,67,48,.14)] sm:p-12">
        <span className="section-kicker">Langkah pertama</span>
        <h1 className="mt-4 mb-3 text-3xl leading-tight tracking-[-1.3px] text-[#15211d] sm:text-4xl">Siapkan profil usaha Anda</h1>
        <p className="m-0 text-sm leading-7 text-[#627069]">Informasi ini digunakan untuk membuat ruang kerja dan gerai pertama Anda dengan Paket {plans[selectedPlan].name}.</p>
        <OnboardingForm selectedPlan={selectedPlan} />
      </section>
    </main>
  );
}
