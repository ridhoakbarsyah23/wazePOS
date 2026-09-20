"use client";

import { Clock, Crown, Flame, Package, Store } from "lucide-react";

export type InsightTopProduct = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  estimatedProfit: number | null;
};

export type InsightHourPoint = {
  hour: number;
  label: string;
  revenue: number;
  transactions: number;
};

export type InsightOutletPerformance = {
  id: string;
  name: string;
  revenue: number;
  transactions: number;
};

const rankStyles = [
  "bg-amber-100 text-amber-800 border-amber-200",
  "bg-slate-100 text-slate-700 border-slate-200",
  "bg-orange-100 text-orange-800 border-orange-200",
];

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function InsightCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)]">
      <div className="flex items-center gap-2.5 border-b border-[#edf2ee] pb-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-emerald-50 text-[#198760]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-[#15211d]">{title}</h3>
          <p className="text-[11px] text-[#627069]">{subtitle}</p>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#dfe8e3] p-6 text-center text-xs text-[#627069]">
      {message}
    </div>
  );
}

export function DashboardInsights({
  periodLabel,
  topProducts,
  hourPoints,
  outletPerformance,
}: {
  periodLabel: string;
  topProducts: InsightTopProduct[];
  hourPoints: InsightHourPoint[];
  outletPerformance: InsightOutletPerformance[];
}) {
  const topQuantity = topProducts[0]?.quantitySold ?? 0;

  const peakHour = hourPoints.reduce<InsightHourPoint | null>(
    (best, point) => (point.transactions > (best?.transactions ?? -1) ? point : best),
    null
  );
  const maxHourTransactions = peakHour?.transactions ?? 0;

  const totalOutletRevenue = outletPerformance.reduce((sum, item) => sum + item.revenue, 0);
  const maxOutletRevenue = Math.max(...outletPerformance.map((item) => item.revenue), 0);

  return (
    <section className="space-y-4 animate-page-enter">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black tracking-tight text-[#15211d]">
          <Flame className="size-5 text-[#198760]" />
          Insight Penjualan
        </h2>
        <p className="text-xs text-[#627069]">
          Produk terlaris, jam tersibuk, dan performa gerai untuk periode {periodLabel.toLowerCase()}.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* 1. PRODUK TERLARIS */}
        <InsightCard
          icon={<Package className="size-4.5" />}
          title="Produk Terlaris"
          subtitle="5 produk paling laku & estimasi profit"
        >
          {topProducts.length === 0 || topQuantity === 0 ? (
            <EmptyState message={`Belum ada penjualan produk pada ${periodLabel.toLowerCase()}.`} />
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((product, index) => {
                const share = Math.round((product.quantitySold / topQuantity) * 100);
                const rankClass =
                  rankStyles[index] ?? "bg-emerald-50 text-emerald-800 border-emerald-100";
                return (
                  <div
                    key={product.productId}
                    className="rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`grid size-7 shrink-0 place-items-center rounded-lg border text-[11px] font-black ${rankClass}`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#15211d]">
                          {product.productName}
                        </p>
                        <p className="text-[10px] text-[#627069]">
                          {product.quantitySold} item terjual
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-[#198760]">
                          {formatMoney(product.revenue)}
                        </p>
                        <p className="text-[10px] font-semibold text-emerald-700/80">
                          {product.estimatedProfit === null
                            ? "Modal historis belum tersedia"
                            : `Profit ${formatMoney(product.estimatedProfit)}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef4f0]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#198760] to-[#55b88f]"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </InsightCard>

        {/* 2. JAM SIBUK */}
        <InsightCard
          icon={<Clock className="size-4.5" />}
          title="Jam Sibuk"
          subtitle="Distribusi transaksi per jam (WIB)"
        >
          {hourPoints.length === 0 || maxHourTransactions === 0 ? (
            <EmptyState message={`Belum ada transaksi pada ${periodLabel.toLowerCase()}.`} />
          ) : (
            <div>
              <div className="flex h-28 gap-[3px]">
                {hourPoints.map((point) => {
                  const height = Math.max(
                    (point.transactions / maxHourTransactions) * 100,
                    5
                  );
                  const isPeak = point.transactions === maxHourTransactions;
                  return (
                    <div
                      key={point.hour}
                      className="flex h-full min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <div className="flex w-full flex-1 items-end">
                        <div
                          title={`${point.label} · ${point.transactions} transaksi · ${formatMoney(point.revenue)}`}
                          className={`w-full rounded-t-[4px] transition-colors ${
                            isPeak
                              ? "bg-[#198760]"
                              : "bg-[#bfe3d1] hover:bg-[#55b88f]"
                          }`}
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-bold leading-none text-[#8b9991]">
                        {point.hour % 6 === 0
                          ? point.hour.toString().padStart(2, "0")
                          : "\u00A0"}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-[#f5faf7] px-3 py-2.5">
                <Flame className="mt-0.5 size-4 shrink-0 text-orange-500" />
                <p className="text-[11px] leading-relaxed text-[#53635b]">
                  Jam tersibuk{" "}
                  <strong className="text-[#15211d]">{peakHour?.label}</strong> dengan{" "}
                  <strong className="text-[#15211d]">
                    {peakHour?.transactions} transaksi
                  </strong>{" "}
                  ({formatMoney(peakHour?.revenue ?? 0)}). Siapkan stok &amp; shift ekstra
                  menjelang jam ini.
                </p>
              </div>
            </div>
          )}
        </InsightCard>

        {/* 3. PERBANDINGAN GERAI */}
        <InsightCard
          icon={<Store className="size-4.5" />}
          title="Performa Gerai"
          subtitle="Kontribusi omzet tiap lokasi"
        >
          {outletPerformance.length === 0 ? (
            <EmptyState message="Belum ada gerai terdaftar." />
          ) : (
            <div className="space-y-2.5">
              {outletPerformance.map((item) => {
                const share =
                  totalOutletRevenue > 0
                    ? Math.round((item.revenue / totalOutletRevenue) * 100)
                    : 0;
                const aov =
                  item.transactions > 0
                    ? Math.round(item.revenue / item.transactions)
                    : 0;
                const isLeader = item.revenue > 0 && item.revenue === maxOutletRevenue;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-800">
                          <Store className="size-3.5" />
                        </span>
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 truncate text-xs font-bold text-[#15211d]">
                            {item.name}
                            {isLeader && <Crown className="size-3.5 shrink-0 text-amber-500" />}
                          </p>
                          <p className="text-[10px] text-[#627069]">
                            {item.transactions} transaksi · Rata-rata {formatMoney(aov)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-black text-[#198760]">
                          {formatMoney(item.revenue)}
                        </p>
                        <p className="text-[10px] font-semibold text-[#627069]">
                          {share}% omzet
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef4f0]">
                      <div
                        className={`h-full rounded-full ${
                          isLeader
                            ? "bg-gradient-to-r from-[#198760] to-[#55b88f]"
                            : "bg-[#9fd6bd]"
                        }`}
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {outletPerformance.length <= 1 && (
                <p className="rounded-xl bg-[#f5faf7] px-3 py-2.5 text-[11px] text-[#53635b]">
                  Tambah gerai cabang untuk membandingkan performa antar lokasi.
                </p>
              )}
            </div>
          )}
        </InsightCard>
      </div>
    </section>
  );
}
