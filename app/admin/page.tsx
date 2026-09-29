import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Repeat2,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PlatformAdminInsights } from "@/components/admin/platform-admin-insights";
import { PlatformAdminTodayFollowUps } from "@/components/admin/platform-admin-today-follow-ups";
import { PlatformAdminClock } from "@/components/admin/platform-admin-clock";
import { PlatformAdminGrowthChart } from "@/components/admin/platform-admin-growth-chart";
import { Card, CardContent } from "@/components/ui/card";
import { getPlatformAdminOverviewData } from "@/server/admin/platform-admin-dashboard";

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
  const pendingReady = (data.payments as { pendingReady?: number }).pendingReady ?? 0;
  const pendingPaymentsDetail =
    pendingReady > 0
      ? `${pendingReady} pembayaran sudah ada bukti dan siap diverifikasi.`
      : "Pembayaran masih berstatus menunggu konfirmasi.";
  const metrics = [
    { label: "Total akun", value: data.overview.totalUsers, icon: Users, tone: "bg-sky-50 text-sky-700", bar: "bg-sky-500", href: "/admin/users" },
    { label: "Total usaha", value: data.overview.totalBusinesses, icon: Building2, tone: "bg-violet-50 text-violet-700", bar: "bg-violet-500", href: "/admin/businesses" },
    { label: "Trial aktif", value: data.overview.trialActive, icon: Clock3, tone: "bg-amber-50 text-amber-700", bar: "bg-amber-400", href: "/admin/subscriptions?state=trial_active" },
    { label: "Langganan aktif", value: data.overview.activeSubscriptions, icon: ShieldCheck, tone: "bg-emerald-50 text-emerald-700", bar: "bg-emerald-500", href: "/admin/subscriptions?state=active" },
  ];

  return (
    <>
      <section className="admin-ops-hero mb-6 w-full min-w-0 max-w-full rounded-3xl p-5 sm:mb-7 sm:p-7">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="admin-ops-glass inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-white">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
            <span className="min-w-0 truncate">Akses internal · Hanya lihat</span>
          </span>
          <span className="admin-ops-glass inline-flex shrink-0 items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-bold text-emerald-100">
            <span className="admin-live-dot" aria-hidden="true" />
            Data saat halaman dimuat
          </span>
          <PlatformAdminClock />
        </div>

        <div className="mt-4 grid w-full min-w-0 gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:items-end">
          <div className="min-w-0 max-w-full">
            <h1 className="admin-display m-0 max-w-full break-words text-3xl leading-[1.05] text-white sm:text-4xl">
              Ringkasan pelanggan wazePOS
            </h1>
            <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-emerald-50/85">
              Pantau jumlah akun, usaha, masa trial, langganan, dan pembayaran. Halaman ini hanya membaca data dan tidak mengubah akun pelanggan.
            </p>
          </div>

          <div className="admin-ops-glass w-full min-w-0 max-w-full overflow-hidden rounded-2xl p-4 sm:p-5">
            <p className="m-0 flex min-w-0 items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-emerald-100/90">
              <CircleDollarSign className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 break-words">Pembayaran langganan diterima</span>
            </p>
            <p className="admin-mono m-0 mt-2 min-w-0 break-words text-2xl font-bold leading-none text-white sm:text-[28px]">{formatRupiah(data.payments.paidRevenue)}</p>
            <p className="m-0 mt-2 min-w-0 break-words text-xs leading-5 text-emerald-50/85">{data.payments.paidPayments} pembayaran berhasil, seluruh waktu</p>
          </div>
        </div>
      </section>

      <ul className="m-0 grid w-full min-w-0 max-w-full list-none grid-cols-2 gap-2 p-0 sm:gap-3 lg:grid-cols-4" aria-label="Metrik platform">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <li key={metric.label} className="m-0 min-w-0 max-w-full p-0">
              <div className="relative h-full">
                <Card className="admin-kpi relative min-w-0 max-w-full h-full overflow-hidden shadow-none">
                  <span className={`absolute inset-x-0 top-0 h-1 ${metric.bar}`} aria-hidden="true" />
                  <CardContent className="flex min-h-[86px] min-w-0 max-w-full items-center gap-2.5 p-3 pt-4 sm:gap-3 sm:p-4 sm:pt-5">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl sm:size-10 ${metric.tone}`}><Icon className="size-4 sm:size-5" aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="admin-mono m-0 min-w-0 break-words text-lg font-bold leading-none sm:text-2xl"><span className="sr-only">{`Metrik ${index + 1} dari ${metrics.length}: `}</span>{metric.value.toLocaleString("id-ID")}</p>
                      <p className="mt-1 min-w-0 break-words text-[11px] font-semibold leading-4 text-[#627069] sm:text-xs">{metric.label}</p>
                    </div>
                  </CardContent>
                </Card>
                {metric.href && <Link href={metric.href} aria-label={`Lihat ${metric.label.toLowerCase()}`} className="absolute inset-0 rounded-2xl hover:ring-1 hover:ring-[#9ac3b0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20" />}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-xs leading-5 text-[#627069]">
        Total akun mencakup seluruh pengguna terdaftar, termasuk akun admin, staf, serta akun yang belum memverifikasi email atau membuat usaha. Jumlah diperbarui saat halaman dimuat ulang.
      </p>

      <div className="mt-6 sm:mt-7">
        <PlatformAdminGrowthChart data={data.growthChart} />
      </div>

      <section aria-labelledby="attention-title" className="mt-6 rounded-2xl border border-[#dfe8e3] bg-white p-4 sm:mt-7 sm:p-5">
        <h2 id="attention-title" className="admin-display m-0 flex items-center gap-2 text-lg">
          <AlertTriangle className="size-5 shrink-0 text-amber-600" aria-hidden="true" />
          Perlu perhatian
        </h2>
        <p className="mt-1 text-xs leading-5 text-[#627069]">Pilih kategori untuk melihat daftar yang perlu ditinjau. Pembayaran menunggu belum tentu bermasalah.</p>
        <ul className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2">
          {[
            { label: "Trial segera berakhir", value: data.analytics.trialEndingSoon, detail: "Masa trial berakhir dalam 7 hari ke depan.", empty: "Tidak ada trial yang berakhir dalam 7 hari.", href: "/admin/subscriptions?state=trial_ending" },
            { label: "Trial sudah berakhir", value: data.overview.trialExpired, detail: "Masa trial sudah habis dan masih berstatus trial.", empty: "Tidak ada trial yang sudah berakhir.", href: "/admin/subscriptions?state=trial_expired" },
            { label: "Langganan kedaluwarsa", value: data.overview.expiredSubscriptions, detail: "Masa langganan berbayar telah berakhir.", empty: "Tidak ada langganan kedaluwarsa.", href: "/admin/subscriptions?state=subscription_expired" },
            { label: "Menunggu pembayaran", value: data.payments.pendingPayments, detail: pendingPaymentsDetail, empty: "Tidak ada pembayaran yang menunggu.", href: "/admin/payments?status=pending" },
          ].map((item) => (
            <li key={item.href} className="min-w-0">
              <Link href={item.href} className="flex h-full items-start gap-3 rounded-xl border border-[#e5eee9] p-4 transition hover:border-[#9ac3b0] hover:bg-[#f7faf8] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/20">
                <div className="min-w-0 flex-1">
                  <h3 className="m-0 text-sm font-bold">{item.label}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#627069]">{item.value > 0 ? item.detail : item.empty}</p>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#106348]">Lihat daftar <ArrowRight className="size-3.5" aria-hidden="true" /></span>
                </div>
                <span className={`admin-mono shrink-0 rounded-lg px-3 py-1 text-xl font-bold ${item.value > 0 ? "bg-amber-50 text-amber-900" : "bg-[#edf3ef] text-[#627069]"}`}>{item.value}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <PlatformAdminInsights analytics={data.analytics} />

      <PlatformAdminTodayFollowUps followUps={data.todayFollowUps} />

      <section aria-label="Pintasan direktori" className="mt-6 grid w-full min-w-0 max-w-full gap-3 overflow-hidden sm:mt-7 md:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 max-w-full cursor-pointer overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#9ac3b0] hover:shadow-[0_12px_28px_rgba(16,65,48,0.12)] sm:p-5 motion-reduce:transform-none">
          <div className="flex min-w-0 max-w-full flex-col gap-3">
            <div className="min-w-0 max-w-full">
              <h2 className="admin-display m-0 flex min-w-0 items-center gap-2 text-base font-normal">
                <Building2 className="size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                <span className="min-w-0 break-words">Kelola direktori usaha</span>
              </h2>
              <p className="mt-1 min-w-0 break-words text-xs leading-5 text-[#627069]">
                Cari usaha, lihat informasi pemilik, dan periksa perkembangan penggunaannya.
              </p>
            </div>
            <Link
              href="/admin/businesses"
              className="inline-flex h-10 w-full min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#198760] px-4 text-xs font-extrabold text-white transition duration-200 hover:bg-[#147554] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/30 [&_svg]:size-3.5"
            >
              <span className="min-w-0 truncate">Buka daftar usaha</span>
              <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="min-w-0 max-w-full cursor-pointer overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#9ac3b0] hover:shadow-[0_12px_28px_rgba(16,65,48,0.12)] sm:p-5 motion-reduce:transform-none">
          <div className="flex min-w-0 max-w-full flex-col gap-3">
            <div className="min-w-0 max-w-full">
              <h2 className="admin-display m-0 flex min-w-0 items-center gap-2 text-base font-normal">
                <Repeat2 className="size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                <span className="min-w-0 break-words">Pantau langganan</span>
              </h2>
              <p className="mt-1 min-w-0 break-words text-xs leading-5 text-[#627069]">
                Telusuri status, paket, dan masa berlaku langganan setiap usaha.
              </p>
            </div>
            <Link
              href="/admin/subscriptions"
              className="inline-flex h-10 w-full min-w-0 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#198760] px-4 text-xs font-extrabold text-[#106348] transition duration-200 hover:bg-[#eaf7f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/30 [&_svg]:size-3.5"
            >
              <span className="min-w-0 truncate">Buka langganan</span>
              <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <div className="min-w-0 max-w-full cursor-pointer overflow-hidden rounded-2xl border border-[#dfe8e3] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#9ac3b0] hover:shadow-[0_12px_28px_rgba(16,65,48,0.12)] sm:p-5 motion-reduce:transform-none md:col-span-2 lg:col-span-1">
          <div className="flex min-w-0 max-w-full flex-col gap-3">
            <div className="min-w-0 max-w-full">
              <h2 className="admin-display m-0 flex min-w-0 items-center gap-2 text-base font-normal">
                <CreditCard className="size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                <span className="min-w-0 break-words">Riwayat pembayaran</span>
              </h2>
              <p className="mt-1 min-w-0 break-words text-xs leading-5 text-[#627069]">
                Periksa riwayat pembayaran langganan dan jejak aktivitas admin.
              </p>
            </div>
            <div className="grid w-full min-w-0 grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Link
                href="/admin/payments"
                className="inline-flex h-10 w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#198760] px-3 text-xs font-extrabold text-[#106348] transition duration-200 hover:bg-[#eaf7f0] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/30 [&_svg]:size-3.5"
              >
                <span className="min-w-0 truncate">Buka pembayaran</span>
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
              </Link>
              <Link
                href="/admin/audit"
                className="inline-flex h-10 w-full min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#dfe8e3] px-3 text-xs font-extrabold text-[#527066] transition duration-200 hover:border-[#9ac3b0] hover:text-[#106348] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/30 [&_svg]:size-3.5"
              >
                <span className="min-w-0 truncate">Buka audit</span>
                <ArrowRight className="size-3.5 shrink-0" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
