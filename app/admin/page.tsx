import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Clock3,
  CreditCard,
  LayoutDashboard,
  ShieldCheck,
  Users,
} from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { PlatformAdminBusinessList } from "@/components/admin/platform-admin-business-list";
import { PlatformAdminInsights } from "@/components/admin/platform-admin-insights";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformAdminDashboardData } from "@/lib/platform-admin-dashboard";

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

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string | string[];
    status?: string | string[];
    businessType?: string | string[];
    plan?: string | string[];
    onboarding?: string | string[];
    registeredFrom?: string | string[];
    registeredTo?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const data = await getPlatformAdminDashboardData({
    query: params.q,
    status: params.status,
    businessType: params.businessType,
    plan: params.plan,
    onboarding: params.onboarding,
    registeredFrom: params.registeredFrom,
    registeredTo: params.registeredTo,
    sort: params.sort,
    page: params.page,
  });
  const metrics = [
    { label: "Total akun", value: data.overview.totalUsers, icon: Users, tone: "bg-sky-50 text-sky-700" },
    { label: "Total usaha", value: data.overview.totalBusinesses, icon: Building2, tone: "bg-violet-50 text-violet-700" },
    { label: "Trial aktif", value: data.overview.trialActive, icon: Clock3, tone: "bg-amber-50 text-amber-700" },
    { label: "Trial berakhir", value: data.overview.trialExpired, icon: AlertTriangle, tone: "bg-rose-50 text-rose-700" },
    { label: "Langganan aktif", value: data.overview.activeSubscriptions, icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Pembayaran pending", value: data.payments.pendingPayments, icon: CreditCard, tone: "bg-orange-50 text-orange-700" },
  ];

  return (
    <main id="admin-content" tabIndex={-1} className="min-h-dvh overflow-x-hidden bg-[#f3f7f5] text-[#15211d] focus:outline-none">
      <a href="#admin-content" className="skip-link">Lewati ke konten</a>
      <header className="sticky top-0 z-30 border-b border-[#dfe8e3] bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex min-h-16 w-[min(1440px,calc(100%-24px))] items-center justify-between gap-3 sm:w-[min(1440px,calc(100%-40px))] sm:gap-4">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link href="/admin" className="flex shrink-0 items-center" aria-label="Platform Admin wazePOS">
              <Image src="/logo.png" alt="wazePOS" width={108} height={32} className="h-6 w-auto sm:h-7" priority />
            </Link>
            <span className="hidden h-7 w-px bg-[#dfe8e3] sm:block" />
            <div className="hidden min-w-0 min-[360px]:block">
              <p className="m-0 text-xs font-extrabold text-[#106348]">Platform Admin</p>
              <p className="m-0 hidden max-w-48 truncate text-[11px] text-[#627069] min-[480px]:block">{data.admin.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="h-10 px-2 sm:h-9 sm:px-3" aria-label="Buka dashboard usaha">
              <Link href="/dashboard">
                <LayoutDashboard />
                <span className="hidden sm:inline">Dashboard usaha</span>
              </Link>
            </Button>
            <LogoutButton
              compact
              className="h-10 gap-2 rounded-xl px-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 sm:h-9 sm:px-3"
            />
          </div>
        </div>
      </header>

      <div className="mx-auto w-[min(1440px,calc(100%-24px))] pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[min(1440px,calc(100%-40px))] sm:pt-8 sm:pb-[calc(2rem+env(safe-area-inset-bottom))] lg:pt-10 lg:pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
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

        <dl className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-6" aria-label="Metrik platform">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="min-w-0 shadow-none">
                <CardContent className="flex min-h-[86px] items-center gap-3 p-3.5 sm:p-4">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${metric.tone}`}><Icon className="size-4.5 sm:size-5" /></span>
                  <div className="min-w-0">
                    <dd className="m-0 text-xl font-black leading-none tabular-nums sm:text-2xl">{metric.value}</dd>
                    <dt className="mt-1 break-words text-[11px] font-semibold leading-4 text-[#627069] sm:text-xs">{metric.label}</dt>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </dl>

        <PlatformAdminInsights analytics={data.analytics} />

        <PlatformAdminBusinessList
          businesses={data.businesses}
          filters={data.filters}
          overview={data.overview}
          directory={data.directory}
        />
      </div>
    </main>
  );
}
