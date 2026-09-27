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
  "border-[#198760] bg-[#198760] text-white",
  "border-[#dbe5df] bg-[#f8faf9] text-[#53635b]",
  "border-[#dbe5df] bg-[#f8faf9] text-[#53635b]",
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
    <div className="dash-warung dash-card rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)]">
      <div className="flex items-center gap-2.5 border-b border-dashed border-[#dfe8e3] pb-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="m-0 text-sm font-extrabold text-[#15211d]">{title}</h3>
          <p className="m-0 truncate text-[11px] text-[#627069]">{subtitle}</p>
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
    <section className="dash-warung space-y-4">
      <div>
        <p className="dash-kicker m-0">Catatan warung</p>
        <h2 className="m-0 mt-1 flex items-center gap-2 text-lg font-black tracking-tight text-[#15211d]">
          <Flame className="size-5 shrink-0 text-[#198760]" aria-hidden="true" />
          Yang laku {periodLabel.toLowerCase()}
        </h2>
        <p className="m-0 mt-1 text-xs text-[#627069]">
          Menu paling laris, jam paling ramai, dan gerai paling cuan.
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
        {/* 1. MENU PALING LARIS */}
        <InsightCard
          icon={<Package className="size-4" aria-hidden="true" />}
          title="Menu paling laris"
          subtitle="5 teratas + sisa cuan"
        >
          {topProducts.length === 0 || topQuantity === 0 ? (
            <EmptyState message={`Belum ada menu terjual pada ${periodLabel.toLowerCase()}.`} />
          ) : (
            <ol className="m-0 list-none space-y-2.5 p-0">
              {topProducts.map((product, index) => {
                const share = Math.round((product.quantitySold / topQuantity) * 100);
                const rankClass =
                  rankStyles[index] ?? "border-[#dbe5df] bg-[#f8faf9] text-[#53635b]";
                return (
                  <li
                    key={product.productId}
                    className="rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        aria-hidden="true"
                        className={`grid size-7 shrink-0 place-items-center rounded-lg border text-[11px] font-black ${rankClass}`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-xs font-bold text-[#15211d]">
                          {product.productName}
                        </p>
                        <p className="m-0 text-[10px] text-[#627069]">
                          <span className="dash-num">{product.quantitySold}</span> porsi terjual
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="dash-money m-0 text-xs font-bold text-[#198760]">
                          {formatMoney(product.revenue)}
                        </p>
                        <p className="m-0 text-[10px] font-semibold text-[#627069]">
                          {product.estimatedProfit === null
                            ? "Modal belum tercatat"
                            : `Sisa ${formatMoney(product.estimatedProfit)}`}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef4f0]">
                      <div
                        className="h-full rounded-full bg-[#198760]"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </InsightCard>

        {/* 2. JAM PALING RAMAI */}
        <InsightCard
          icon={<Clock className="size-4" aria-hidden="true" />}
          title="Jam paling ramai"
          subtitle="Struk per jam (WIB)"
        >
          {hourPoints.length === 0 || maxHourTransactions === 0 ? (
            <EmptyState message={`Belum ada struk pada ${periodLabel.toLowerCase()}.`} />
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
                          title={`${point.label} · ${point.transactions} struk · ${formatMoney(point.revenue)}`}
                          className={`w-full rounded-t-[4px] ${
                            isPeak
                              ? "bg-[#198760]"
                              : "bg-[#9fd6bd]"
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

              <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-[#dfe8e3] bg-[#f5faf7] px-3 py-2.5">
                <Flame className="mt-0.5 size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                <p className="m-0 text-[11px] leading-relaxed text-[#53635b]">
                  Paling ramai jam{" "}
                  <strong className="text-[#15211d]">{peakHour?.label}</strong> ·{" "}
                  <strong className="dash-num text-[#15211d]">
                    {peakHour?.transactions} struk
                  </strong>{" "}
                  ({formatMoney(peakHour?.revenue ?? 0)}). Siapkan bahan dan orang sebelum jam ini.
                </p>
              </div>
            </div>
          )}
        </InsightCard>

        {/* 3. GERAI PALING CUAN */}
        <InsightCard
          icon={<Store className="size-4" aria-hidden="true" />}
          title="Gerai paling cuan"
          subtitle="Omzet tiap lokasi"
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
                        <span className="grid size-7 shrink-0 place-items-center rounded-lg border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
                          <Store className="size-3.5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="m-0 flex items-center gap-1.5 truncate text-xs font-bold text-[#15211d]">
                            {item.name}
                            {isLeader && <Crown className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />}
                          </p>
                          <p className="m-0 text-[10px] text-[#627069]">
                            <span className="dash-num">{item.transactions}</span> struk · {formatMoney(aov)}/struk
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="dash-money m-0 text-xs font-bold text-[#198760]">
                          {formatMoney(item.revenue)}
                        </p>
                        <p className="m-0 text-[10px] font-semibold text-[#627069]">
                          <span className="dash-num">{share}%</span> omzet
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#eef4f0]">
                      <div
                        className="h-full rounded-full bg-[#198760]"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {outletPerformance.length <= 1 && (
                <p className="m-0 rounded-xl border border-dashed border-[#dfe8e3] bg-[#f5faf7] px-3 py-2.5 text-[11px] text-[#53635b]">
                  Baru satu gerai. Tambah cabang kalau sudah siap.
                </p>
              )}
            </div>
          )}
        </InsightCard>
      </div>
    </section>
  );
}
