import { redirect } from "next/navigation";
import { RegisterPageShell } from "@/components/auth/register-page-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentSession } from "@/server/auth/auth-session";
import { normalizePlan } from "@/shared/billing/plans";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  if (await getCurrentSession()) redirect("/dashboard");
  const selectedPlan = normalizePlan((await searchParams).plan);

  return (
    <RegisterPageShell>
      <RegisterForm
        selectedPlan={selectedPlan}
        googleSsoEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)}
      />
    </RegisterPageShell>
  );
}
