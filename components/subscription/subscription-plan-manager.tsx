"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, CreditCard, Crown, LoaderCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { planIds, plans, type PlanId } from "@/lib/billing/plans";

const includedFeatures: Record<PlanId, string[]> = {
  tumbuh: [
    "Maksimal 1 Gerai Toko",
    "Maksimal 2 Akun Staf (Owner + Kasir)",
    "Hingga 100 Produk Aktif",
    "Pembayaran Kasir Tunai",
    "Stok otomatis & peringatan stok",
    "Laporan omzet penjualan di layar",
  ],
  bisnis: [
    "Pembayaran Tunai, Kartu Debit & Kredit EDC",
    "Hingga 5 Gerai / Multi-Cabang",
    "Akun Staf Kasir & Admin Tanpa Batas",
    "Katalog Produk Tanpa Batas",
    "Ekspor Laporan Penjualan (Excel / CSV)",
    "Mode Gelap Dashboard",
    "Prioritas Dukungan Teknis",
  ],
};

export function SubscriptionPlanManager({
  initialPlan,
  canChangePlan,
  subscriptionStatus,
  paymentConfigured,
}: {
  initialPlan: PlanId;
  canChangePlan: boolean;
  subscriptionStatus: "trialing" | "active" | "past_due" | "cancelled" | "missing";
  paymentConfigured: boolean;
}) {
  const router = useRouter();
  const [activePlan, setActivePlan] = useState(initialPlan);
  const [pendingPlan, setPendingPlan] = useState<PlanId | null>(null);
  const [checkoutPending, setCheckoutPending] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function changePlan(plan: PlanId) {
    if (subscriptionStatus === "active" || plan === activePlan) return;
    setActivePlan(plan);

    if (canChangePlan) {
      setPendingPlan(plan);
      setMessage(null);

      try {
        const response = await fetch("/api/subscription", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan }),
        });
        const payload = (await response.json()) as { message?: string; plan?: PlanId };
        if (!response.ok) {
          setMessage({ type: "error", text: payload.message ?? "Paket belum berhasil diperbarui." });
          return;
        }

        setMessage({ type: "success", text: payload.message ?? "Paket berhasil diperbarui." });
        router.refresh();
      } catch {
        setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
      } finally {
        setPendingPlan(null);
      }
    }
  }

  async function startCheckout() {
    if (!paymentConfigured || subscriptionStatus === "active") return;
    setCheckoutPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/subscription/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: activePlan }),
      });
      const payload = (await response.json()) as { message?: string; redirectUrl?: string };
      if (!response.ok || !payload.redirectUrl) {
        setMessage({ type: "error", text: payload.message ?? "Checkout belum berhasil dibuat." });
        return;
      }
      window.location.assign(payload.redirectUrl);
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke layanan pembayaran." });
    } finally {
      setCheckoutPending(false);
    }
  }

  const isPaidActive = subscriptionStatus === "active";

  return (
    <div>
      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={`mb-5 flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-semibold ${
            message.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
              : "border-[#f3c8c4] bg-[#fff2f1] text-[#a4382f]"
          }`}
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          {message.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        {planIds.map((planId) => {
          const plan = plans[planId];
          const active = activePlan === planId;
          const pending = pendingPlan === planId;
          return (
            <Card key={planId} className={active ? "border-[#63b792] ring-4 ring-[#198760]/8" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`grid size-11 place-items-center rounded-xl ${
                      active ? "bg-[#198760] text-white" : "bg-[#eaf7f0] text-[#198760]"
                    }`}
                  >
                    <Crown className="size-5" />
                  </span>
                  {active && (
                    <Badge>
                      <Check className="size-3.5" />
                      {isPaidActive ? "Paket Aktif" : "Paket Dipilih"}
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3">Paket {plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="mb-5">
                  <strong className="text-2xl tracking-[-0.8px]">
                    Rp {plan.annualPrice.toLocaleString("id-ID")}
                  </strong>
                  <span className="text-xs text-[#627069]"> / tahun</span>
                </p>
                <ul className="mb-6 space-y-3">
                  {includedFeatures[planId].map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-[#42534c]">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-[#eaf7f0] text-[#198760]">
                        <Check className="size-3" />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={active ? "secondary" : "default"}
                  disabled={active || isPaidActive || Boolean(pendingPlan)}
                  onClick={() => void changePlan(planId)}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : active ? (
                    <Check />
                  ) : (
                    <Crown />
                  )}
                  {pending
                    ? "Mengganti paket..."
                    : active
                    ? "Paket ini dipilih"
                    : isPaidActive
                    ? "Paket aktif tidak dapat diubah"
                    : `Pilih Paket ${plan.name}`}
                </Button>
                {active && !isPaidActive && (
                  <Button
                    className="mt-2 w-full"
                    disabled={!paymentConfigured || checkoutPending || Boolean(pendingPlan)}
                    onClick={() => void startCheckout()}
                  >
                    {checkoutPending ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <CreditCard />
                    )}
                    {checkoutPending
                      ? "Menyiapkan checkout..."
                      : paymentConfigured
                      ? `Aktifkan & Bayar Paket ${plan.name}`
                      : "Midtrans belum dikonfigurasi"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
