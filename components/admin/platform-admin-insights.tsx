import {
  CalendarClock,
  CircleDollarSign,
  Gauge,
  Percent,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { PlatformAdminAnalytics } from "@/lib/admin/platform-admin-types";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getPercentage(value: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function SummaryBar({ label, value, total, tone }: { label: string; value: number; total: number; tone: string }) {
  const percentage = getPercentage(value, total);
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-[#627069]">{label}</span>
        <span className="font-extrabold tabular-nums text-[#15211d]">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#edf3ef]">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export function PlatformAdminInsights({ analytics }: { analytics: PlatformAdminAnalytics }) {
  const totalSubscriptions = Math.max(
    analytics.totalSubscriptions,
    analytics.activeSubscriptions + analytics.trialActive + analytics.trialExpired + analytics.pastDue + analytics.cancelled,
  );

  return (
    <section aria-labelledby="subscription-insights-title" className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <Card className="min-w-0 shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[#198760]">
                <TrendingUp className="size-4" aria-hidden="true" />
                <h2 id="subscription-insights-title" className="m-0 text-sm font-black">
                  Kesehatan subscription
                </h2>
              </div>
              <p className="mt-1 text-xs leading-5 text-[#627069]">
                Ringkasan kesehatan langganan dan MRR aktif.
              </p>
            </div>
            <span className="hidden rounded-full bg-[#eaf7f0] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.08em] text-[#106348] sm:inline-flex">
              Live database
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(170px,0.8fr)] sm:items-center">
            <div className="rounded-2xl bg-[#f7faf8] p-4">
              <div className="flex items-center gap-2 text-[#627069]">
                <CircleDollarSign className="size-4" aria-hidden="true" />
                <span className="text-xs font-bold">MRR aktif estimasi</span>
              </div>
              <p className="mt-2 text-2xl font-black tracking-tight text-[#15211d]">{formatRupiah(analytics.activeMrr)}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#82928a]">Berdasarkan harga tahunan paket aktif.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-1">
              <div className="rounded-2xl border border-[#e5eee9] p-3">
                <div className="flex items-center gap-1.5 text-[#627069]">
                  <Gauge className="size-3.5" aria-hidden="true" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]">Total subscription</span>
                </div>
                <p className="mt-1 text-lg font-black tabular-nums text-[#15211d]">{analytics.totalSubscriptions}</p>
              </div>
              <div className="rounded-2xl border border-[#e5eee9] p-3">
                <div className="flex items-center gap-1.5 text-[#627069]">
                  <Percent className="size-3.5" aria-hidden="true" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.08em]">Trial ending</span>
                </div>
                <p className="mt-1 text-lg font-black tabular-nums text-[#15211d]">{analytics.trialEndingSoon}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <SummaryBar label="Aktif" value={analytics.activeSubscriptions} total={totalSubscriptions} tone="bg-emerald-500" />
            <SummaryBar label="Trial" value={analytics.trialActive + analytics.trialExpired} total={totalSubscriptions} tone="bg-amber-400" />
            <SummaryBar label="Past due" value={analytics.pastDue} total={totalSubscriptions} tone="bg-rose-400" />
            <SummaryBar label="Dibatalkan" value={analytics.cancelled} total={totalSubscriptions} tone="bg-slate-400" />
          </div>
        </CardContent>
      </Card>

      <Card className="min-w-0 shadow-none">
        <CardContent className="flex h-full flex-col p-4 sm:p-5">
          <div className="flex items-center gap-2 text-[#198760]">
            <CalendarClock className="size-4" aria-hidden="true" />
            <h2 className="m-0 text-sm font-black">Konversi trial</h2>
          </div>
          <div className="mt-5 flex items-end gap-3">
            <p className="m-0 text-4xl font-black tracking-tight text-[#15211d]">{analytics.trialConversionRate}%</p>
            <p className="m-0 pb-1 text-xs leading-5 text-[#627069]">
              subscription pernah<br className="hidden sm:block" /> melewati status trial
            </p>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#edf3ef]" aria-label={`Konversi trial ${analytics.trialConversionRate}%`} role="img">
            <div className="h-full rounded-full bg-gradient-to-r from-[#198760] to-[#52c997]" style={{ width: `${Math.min(100, analytics.trialConversionRate)}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-[#627069]">
            {analytics.convertedSubscriptions} dari {analytics.totalSubscriptions} subscription berstatus non-trial.
          </p>
          <div className="mt-auto rounded-2xl border border-amber-200 bg-amber-50 p-3.5">
            <p className="m-0 text-xs font-extrabold text-amber-900">Perhatian trial</p>
            <p className="mt-1 text-xs leading-5 text-amber-800">
              {analytics.trialEndingSoon > 0
                ? `${analytics.trialEndingSoon} usaha akan melewati batas trial dalam 7 hari.`
                : "Tidak ada usaha yang akan melewati batas trial dalam 7 hari."}
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
