import { desc, eq } from "drizzle-orm";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  History,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { AppHeader } from "@/components/shared/app-header";
import { SubscriptionPlanManager } from "@/components/subscription/subscription-plan-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { requireDashboardAccess } from "@/server/access/dashboard-access";
import { isMidtransConfigured } from "@/server/billing/midtrans";
import { normalizePlan, plans } from "@/shared/billing/plans";

const statusLabels = {
  trialing: "Masa trial",
  active: "Aktif",
  past_due: "Pembayaran tertunda",
  cancelled: "Dibatalkan",
} as const;

const paymentStatusLabels = {
  pending: "Menunggu",
  paid: "Berhasil",
  failed: "Gagal",
  expired: "Kedaluwarsa",
  refunded: "Dikembalikan",
} as const;

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string; expired?: string }>;
}) {
  const query = await searchParams;
  const access = await requireDashboardAccess({ rule: "ownerOnly", enforceSubscription: false });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;

  const payments = await db
    .select({
      id: subscriptionPayment.id,
      orderId: subscriptionPayment.providerOrderId,
      plan: subscriptionPayment.plan,
      amount: subscriptionPayment.amount,
      status: subscriptionPayment.status,
      createdAt: subscriptionPayment.createdAt,
    })
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.businessId, membership.businessId))
    .orderBy(desc(subscriptionPayment.createdAt))
    .limit(8);

  const selectedPlan = normalizePlan(currentSubscription?.plan);
  const trialIsActive = currentSubscription?.status === "trialing" && currentSubscription.trialEndsAt > new Date();
  const statusLabel = currentSubscription ? statusLabels[currentSubscription.status] : "Tidak tersedia";

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
      plan={normalizePlan(currentSubscription?.plan)}
    >
      <div className="mx-auto w-[min(1080px,calc(100%-32px))] py-8 sm:py-10 animate-page-enter">
        <Button asChild variant="ghost" size="sm" className="mb-5">
          <Link href="/dashboard">
            <ArrowLeft /> Kembali ke dashboard
          </Link>
        </Button>

        {/* Banner Peringatan jika Masa Trial Habis / Terkunci */}
        {(query.expired === "1" || subDetails.isExpired) && (
          <div className="mb-6 flex items-start gap-3 rounded-2xl border-2 border-dashed border-rose-400 bg-rose-50/90 p-5 text-rose-900 shadow-sm animate-in fade-in duration-300">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-600" />
            <div>
              <h2 className="font-extrabold text-sm text-rose-800">
                Masa Layanan Uji Coba (Trial) Telah Berakhir
              </h2>
              <p className="mt-1 text-xs text-rose-700 leading-relaxed">
                Operasional kasir, katalog produk, dan manajemen stok saat ini dinonaktifkan sementara.
                Silakan pilih paket langganan di bawah ini (Paket Tumbuh atau Paket Bisnis) dan selesaikan pembayaran via Midtrans untuk mengaktifkan kembali seluruh gerai Anda.
              </p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Badge variant="outline" className="mb-3">
              <CreditCard className="size-3.5" /> Subscription
            </Badge>
            <h1 className="mb-2 text-3xl font-extrabold tracking-[-1.2px] sm:text-4xl">
              Kelola paket wazePOS
            </h1>
            <p className="m-0 max-w-2xl text-sm leading-7 text-[#627069]">
              Bandingkan paket dan aktifkan langganan tahunan untuk operasional bisnis Anda.
            </p>
          </div>
          <Badge className="h-fit">Paket {plans[selectedPlan].name}</Badge>
        </div>

        <Card className="mt-7 bg-[linear-gradient(135deg,#0f6b4c,#198760)] text-white">
          <CardContent className="grid gap-5 p-6 sm:grid-cols-3">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-5 text-[#a7ebcb]" />
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">
                  Status
                </p>
                <strong>{statusLabel}</strong>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CalendarDays className="mt-0.5 size-5 text-[#a7ebcb]" />
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">
                  {currentSubscription?.status === "active" ? "Akhir Periode" : "Akhir Trial"}
                </p>
                <strong>
                  {currentSubscription?.status === "active"
                    ? currentSubscription.currentPeriodEnd?.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "-"
                    : currentSubscription?.trialEndsAt.toLocaleDateString("id-ID", { dateStyle: "medium" }) ?? "-"}
                </strong>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CreditCard className="mt-0.5 size-5 text-[#a7ebcb]" />
              <div>
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em] text-[#bce7d2]">
                  Penagihan
                </p>
                <strong>{currentSubscription?.status === "active" ? "Aktif Tahunan" : "Belum diaktifkan"}</strong>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="mt-7">
          {query.payment === "finish" && (
            <div
              role="status"
              className="mb-5 flex items-start gap-2.5 rounded-xl border border-[#cae8d9] bg-[#eaf7f0] px-4 py-3 text-sm font-semibold text-[#106348]"
            >
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              Pembayaran sedang diverifikasi. Status paket akan diperbarui otomatis setelah konfirmasi Midtrans diterima.
            </div>
          )}

          <SubscriptionPlanManager
            initialPlan={selectedPlan}
            canChangePlan={Boolean(trialIsActive)}
            subscriptionStatus={currentSubscription?.status ?? "missing"}
            paymentConfigured={isMidtransConfigured()}
          />

          {currentSubscription?.status === "active" && (
            <p className="mt-5 rounded-xl border border-[#ecd8bf] bg-[#fff8ef] px-4 py-3 text-sm text-[#8c5b24]">
              Paket aktif tidak dapat diganti langsung agar sisa masa berlangganan tetap aman. Kebijakan upgrade, prorata, dan perpanjangan akan ditambahkan secara terpisah.
            </p>
          )}
        </section>

        <Card className="mt-7">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-5">
              <span className="grid size-10 place-items-center rounded-xl bg-[#eaf7f0] text-[#198760]">
                <History className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-[#15211d]">Riwayat pembayaran</h2>
                <p className="m-0 text-xs text-[#627069]">Delapan checkout subscription terbaru.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Order ID</TableHead>
                    <TableHead className="font-bold">Paket</TableHead>
                    <TableHead className="font-bold">Tanggal</TableHead>
                    <TableHead className="text-right font-bold">Nominal</TableHead>
                    <TableHead className="text-right font-bold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-xs text-[#52645c]">{payment.orderId}</TableCell>
                      <TableCell className="font-semibold text-[#15211d]">{plans[payment.plan].name}</TableCell>
                      <TableCell className="text-[#627069]">
                        {payment.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium" })}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#15211d]">
                        Rp {payment.amount.toLocaleString("id-ID")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={
                            payment.status === "paid"
                              ? "default"
                              : payment.status === "pending"
                              ? "warning"
                              : "secondary"
                          }
                        >
                          {paymentStatusLabels[payment.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {payments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-[#627069]">
                        Belum ada pembayaran subscription.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppHeader>
  );
}
