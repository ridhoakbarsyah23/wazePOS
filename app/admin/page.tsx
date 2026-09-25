import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  Repeat2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PlatformAdminInsights } from "@/components/admin/platform-admin-insights";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformAdminOverviewData } from "@/lib/admin/platform-admin-dashboard";

export const metadata: Metadata = {
  title: "Platform Admin | wazePOS",
  description: "Pemantauan internal pelanggan dan langganan wazePOS.",
  robots: { index: false, follow: false },
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PlatformAdminOverviewPage() {
  const data = await getPlatformAdminOverviewData();
  const metrics = [
    { label: "Total akun", value: data.overview.totalUsers, icon: Users, tone: "bg-sky-50 text-sky-700", href: "/admin/businesses" },
    { label: "Total usaha", value: data.overview.totalBusinesses, icon: Building2, tone: "bg-violet-50 text-violet-700", href: "/admin/businesses" },
    { label: "Trial aktif", value: data.overview.trialActive, icon: Clock3, tone: "bg-amber-50 text-amber-700", href: "/admin/subscriptions?state=trial_active" },
    { label: "Trial berakhir", value: data.overview.trialExpired, icon: AlertTriangle, tone: "bg-rose-50 text-rose-700", href: "/admin/subscriptions?state=trial_expired" },
    { label: "Langganan aktif", value: data.overview.activeSubscriptions, icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700", href: "/admin/subscriptions?state=active" },
    { label: "Pembayaran pending", value: data.payments.pendingPayments, icon: CreditCard, tone: "bg-orange-50 text-orange-700", href: "/admin/payments?status=pending" },
  ];

  return (
    <>
      <section className="mb-6 grid min-w-0 gap-4 sm:mb-7 sm:grid-cols-[minmax(0,1fr)_minmax(210px,250px)] sm:items-end lg:gap-6">
        <div className="min-w-0">
          <Badge variant="outline" className="mb-3"><ShieldCheck className="size-3.5" /> Akses internal</Badge>
          <h1 className="m-0 text-2xl font-black leading-tight tracking-[-0.7px] sm:text-3xl">
            Ringkasan pelanggan wazePOS
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#627069]">
            Pantau usaha, masa trial, langganan, dan pembayaran. Halaman ini hanya membaca data dan tidak mengubah akun pelanggan.
          </p>
        </div>
        <div className="w-full min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 sm:w-auto sm:min-w-[220px]">
          <span className="font-extrabold">Pendapatan terverifikasi</span>
          <span className="mt-0.5 block break-words text-lg font-black">{formatRupiah(data.payments.paidRevenue)}</span>
          <span className="block text-xs leading-5 text-emerald-700">{data.payments.paidPayments} pembayaran berstatus berhasil</span>
        </div>
      </section>

      <ul className="grid list-none grid-cols-1 gap-3 p-0 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Metrik platform">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <li key={metric.label} className="m-0 min-w-0 p-0">
              <Link href={metric.href} className="block min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20">
                <Card className="min-w-0 shadow-none transition hover:border-[#9ac3b0]">
                  <CardContent className="flex min-h-[86px] items-center gap-3 p-3.5 sm:p-4">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${metric.tone}`}><Icon className="size-4.5 sm:size-5" aria-hidden="true" /></span>
                    <div className="min-w-0">
                      <p className="m-0 text-xl font-black leading-none tabular-nums sm:text-2xl">{metric.value}</p>
                      <p className="mt-1 break-words text-[11px] font-semibold leading-4 text-[#627069] sm:text-xs">{metric.label}</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <PlatformAdminInsights analytics={data.analytics} />

      <section aria-label="Pintasan direktori" className="mt-6 grid gap-3 sm:mt-7 lg:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0">
              <h2 className="m-0 flex items-center gap-2 text-sm font-black">
                <Building2 className="size-4 text-[#198760]" aria-hidden="true" />
                Kelola direktori usaha
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#627069]">
                {data.overview.totalBusinesses} usaha terdaftar. Cari, filter, dan buka detail usaha di halaman khusus.
              </p>
            </div>
            <Link
              href="/admin/businesses"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#198760] px-4 text-xs font-extrabold text-white transition hover:bg-[#147554]"
            >
              Buka daftar usaha
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0">
              <h2 className="m-0 flex items-center gap-2 text-sm font-black">
                <Repeat2 className="size-4 text-[#198760]" aria-hidden="true" />
                Pantau langganan
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#627069]">
                {data.analytics.trialEndingSoon} trial berakhir dalam 7 hari. Filter status dan paket per usaha.
              </p>
            </div>
            <Link
              href="/admin/subscriptions"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[#198760] px-4 text-xs font-extrabold text-[#106348] transition hover:bg-[#eaf7f0]"
            >
              Buka langganan
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-[#dfe8e3] bg-white p-4 sm:p-5">
          <div className="flex min-w-0 flex-col gap-3">
            <div className="min-w-0">
              <h2 className="m-0 flex items-center gap-2 text-sm font-black">
                <CreditCard className="size-4 text-[#198760]" aria-hidden="true" />
                Rekonsiliasi pembayaran
              </h2>
              <p className="mt-1 text-xs leading-5 text-[#627069]">
                {data.payments.pendingPayments} pembayaran pending perlu perhatian. Lihat riwayat dan jejak audit.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row lg:flex-col xl:flex-row">
              <Link
                href="/admin/payments"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#198760] px-4 text-xs font-extrabold text-[#106348] transition hover:bg-[#eaf7f0]"
              >
                Buka pembayaran
              </Link>
              <Link
                href="/admin/audit"
                className="inline-flex h-10 flex-1 items-center justify-center rounded-xl border border-[#dfe8e3] px-4 text-xs font-extrabold text-[#527066] transition hover:border-[#9ac3b0] hover:text-[#106348]"
              >
                Buka audit
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
