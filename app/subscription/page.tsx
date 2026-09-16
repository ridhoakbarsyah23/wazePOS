import { desc, eq } from "drizzle-orm";
import { ArrowLeft, CalendarDays, CheckCircle2, CreditCard, History, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SubscriptionPlanManager } from "@/components/subscription-plan-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { getBusinessSubscription, getMembership, requireSession } from "@/lib/auth-session";
import { isMidtransConfigured } from "@/lib/midtrans";
import { normalizePlan, plans } from "@/lib/plans";

const statusLabels = {
  trialing: "Masa trial",
  active: "Aktif",
  past_due: "Pembayaran tertunda",
  cancelled: "Dibatalkan",
} as const;

const paymentStatusLabels = { pending: "Menunggu", paid: "Berhasil", failed: "Gagal", expired: "Kedaluwarsa", refunded: "Dikembalikan" } as const;

export default async function SubscriptionPage({ searchParams }: { searchParams: Promise<{ payment?: string }> }) {
  const query = await searchParams;
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (membership.role !== "owner") redirect("/dashboard");

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const payments = await db.select({ id: subscriptionPayment.id, orderId: subscriptionPayment.providerOrderId, plan: subscriptionPayment.plan, amount: subscriptionPayment.amount, status: subscriptionPayment.status, createdAt: subscriptionPayment.createdAt })
    .from(subscriptionPayment).where(eq(subscriptionPayment.businessId, membership.businessId)).orderBy(desc(subscriptionPayment.createdAt)).limit(8);
  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const trialIsActive = currentSubscription?.status === "trialing" && currentSubscription.trialEndsAt > new Date();
  const statusLabel = currentSubscription ? statusLabels[currentSubscription.status] : "Tidak tersedia";

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        role={membership.role}
      />

      <div className="mx-auto w-[min(1080px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <Button asChild variant="ghost" size="sm" className="mb-5"><Link href="/dashboard"><ArrowLeft /> Kembali ke dashboard</Link></Button>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div><Badge variant="outline" className="mb-3"><CreditCard className="size-3.5" /> Subscription</Badge><h1 className="mb-2 text-3xl font-extrabold tracking-[-1.2px] sm:text-4xl">Kelola paket wazePOS</h1><p className="m-0 max-w-2xl text-sm leading-7 text-[#627069]">Bandingkan paket dan sesuaikan pilihan selama masa uji coba.</p></div>
          <Badge className="h-fit">Paket {plans[selectedPlan].name}</Badge>
        </div>

        <Card className="mt-7 bg-[linear-gradient(135deg,#0f6b4c,#198760)] text-white">
          <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
            <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 text-[#a7ebcb]" /><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">Status</p><strong>{statusLabel}</strong></div></div>
            <div className="flex items-start gap-3"><CalendarDays className="mt-0.5 size-5 text-[#a7ebcb]" /><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">Akhir trial</p><strong>{currentSubscription?.trialEndsAt.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "-"}</strong></div></div>
            <div className="flex items-start gap-3"><CreditCard className="mt-0.5 size-5 text-[#a7ebcb]" /><div><p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">Penagihan</p><strong>Belum diaktifkan</strong></div></div>
          </CardContent>
        </Card>

        <section className="mt-7">
          {query.payment === "finish" && <div role="status" className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#cae8d9] bg-[#eaf7f0] px-4 py-3 text-sm font-semibold text-[#106348]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" />Pembayaran sedang diverifikasi. Status paket akan diperbarui otomatis setelah konfirmasi Midtrans diterima.</div>}
          <SubscriptionPlanManager initialPlan={selectedPlan} canChangePlan={Boolean(trialIsActive)} subscriptionStatus={currentSubscription?.status ?? "missing"} paymentConfigured={isMidtransConfigured()} />
          {!trialIsActive && <p className="mt-5 rounded-xl border border-[#ecd8bf] bg-[#fff8ef] px-4 py-3 text-sm text-[#8c5b24]">Paket aktif tidak dapat diganti langsung agar sisa masa berlangganan tetap aman. Kebijakan upgrade, prorata, dan perpanjangan akan ditambahkan secara terpisah.</p>}
        </section>

        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]"><History className="size-5" /></span><div><h2 className="mb-1 text-lg font-extrabold">Riwayat pembayaran</h2><p className="m-0 text-xs text-[#627069]">Delapan checkout subscription terbaru.</p></div></div>
          <div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[#e7efea] text-xs uppercase tracking-[0.06em] text-[#627069]"><th className="px-3 py-3">Order</th><th className="px-3 py-3">Paket</th><th className="px-3 py-3">Tanggal</th><th className="px-3 py-3 text-right">Nominal</th><th className="px-3 py-3 text-right">Status</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className="border-b border-[#f0f4f1]"><td className="px-3 py-3 font-mono text-xs">{payment.orderId}</td><td className="px-3 py-3 font-semibold">{plans[payment.plan].name}</td><td className="px-3 py-3 text-[#627069]">{payment.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}</td><td className="px-3 py-3 text-right font-bold">Rp {payment.amount.toLocaleString("id-ID")}</td><td className="px-3 py-3 text-right"><Badge variant={payment.status === "paid" ? "default" : payment.status === "pending" ? "warning" : "secondary"}>{paymentStatusLabels[payment.status]}</Badge></td></tr>)}{payments.length === 0 && <tr><td colSpan={5} className="px-3 py-8 text-center text-[#627069]">Belum ada pembayaran subscription.</td></tr>}</tbody></table></div>
        </section>
      </div>
    </main>
  );
}
