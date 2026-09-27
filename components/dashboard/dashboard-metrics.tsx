"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Receipt,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

type CashflowSummaryEvent = {
  incomeTotal?: number;
  incomeCount?: number;
};

type DashboardMetricsProps = {
  currentSales: number;
  previousSales: number;
  currentTransactions: number;
  previousTransactions: number;
  currentAov: number;
  totalStockUnits: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockHref: string;
  showStock?: boolean;
};

export function DashboardMetrics({
  currentSales,
  previousSales,
  currentTransactions,
  previousTransactions,
  currentAov,
  totalStockUnits,
  lowStockCount,
  outOfStockCount,
  lowStockHref,
  showStock = true,
}: DashboardMetricsProps) {
  const money = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(val);

  // Angka omzet/transaksi mengikuti polling arus kas realtime agar
  // "Omzet masuk" selalu sama dengan "Uang masuk" setelah 15 detik.
  const [liveSales, setLiveSales] = useState<number | null>(null);
  const [liveTransactions, setLiveTransactions] = useState<number | null>(null);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CashflowSummaryEvent>).detail;
      if (typeof detail?.incomeTotal === "number") setLiveSales(detail.incomeTotal);
      if (typeof detail?.incomeCount === "number") setLiveTransactions(detail.incomeCount);
    };
    window.addEventListener("wazepos:cashflow-summary", handler);
    return () => window.removeEventListener("wazepos:cashflow-summary", handler);
  }, []);

  const displaySales = liveSales ?? currentSales;
  const displayTransactions = liveTransactions ?? currentTransactions;

  // Sales change calculation
  const hasComparableSales = previousSales > 0;
  const salesChange = hasComparableSales
    ? Math.round(((displaySales - previousSales) / previousSales) * 100)
    : 0;

  const isSalesUp = salesChange >= 0;

  // Transaction comparison text
  const txComparisonText =
    previousTransactions === 0
      ? displayTransactions > 0
        ? "Mulai tercatat periode ini"
        : "Belum ada transaksi"
      : `${displayTransactions - previousTransactions >= 0 ? "+" : ""}${
          displayTransactions - previousTransactions
        } struk dari periode lalu`;

  return (
    <div className={`dash-warung grid gap-3 sm:grid-cols-2 sm:gap-4 ${showStock ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
      {/* 1. OMZET MASUK */}
      <div className="dash-card rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#627069]">
              Omzet masuk
            </p>
            <p className="dash-money m-0 mt-1 truncate text-xl font-bold text-[#15211d] sm:text-2xl">
              {money(displaySales)}
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
            <Wallet className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-[#dfe8e3] pt-3">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${
              isSalesUp
                ? "border border-emerald-200/60 bg-emerald-50 text-emerald-800"
                : "border border-rose-200/60 bg-rose-50 text-rose-700"
            }`}
          >
            {isSalesUp ? <TrendingUp className="size-3" aria-hidden="true" /> : <TrendingDown className="size-3" aria-hidden="true" />}
            <span>
              {hasComparableSales
                ? isSalesUp
                  ? `+${salesChange}%`
                  : `${salesChange}%`
                : displaySales > 0
                  ? "Baru tercatat"
                  : "Belum ada omzet"}
            </span>
          </span>
          {hasComparableSales && (
            <span className="truncate text-[11px] text-[#627069]">vs periode lalu</span>
          )}
        </div>
      </div>

      {/* 2. STRUK KELUAR */}
      <div className="dash-card rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#627069]">
              Struk keluar
            </p>
            <p className="m-0 mt-1 flex items-baseline gap-1.5">
              <span className="dash-num text-2xl font-black tracking-tight text-[#15211d]">
                {displayTransactions}
              </span>
              <span className="text-xs font-bold text-[#627069]">struk</span>
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
            <Receipt className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-[#dfe8e3] pt-3">
          <span className="truncate text-[11px] font-semibold text-[#627069]">
            {txComparisonText}
          </span>
        </div>
      </div>

      {/* 3. BELANJA PER STRUK */}
      <div className="dash-card rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#627069]">
              Belanja per struk
            </p>
            <p className="dash-money m-0 mt-1 truncate text-xl font-bold text-[#15211d] sm:text-2xl">
              {money(currentAov)}
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
            <ShoppingBag className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-[#dfe8e3] pt-3">
          <span className="truncate text-[11px] text-[#627069]">Rata-rata belanja tiap pembeli</span>
        </div>
      </div>

      {/* 4. KONDISI STOK */}
      {showStock && (
        <Link
          href={lowStockHref}
        aria-label={outOfStockCount > 0 ? `Lihat ${outOfStockCount} produk yang stoknya habis` : lowStockCount > 0 ? `Lihat ${lowStockCount} produk dengan stok menipis` : "Buka halaman inventori"}
        className="dash-card group relative cursor-pointer overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)] transition-colors duration-200 hover:border-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#627069]">
              Kondisi stok
            </p>
            <p className="m-0 mt-1 flex items-baseline gap-1.5">
              <span className="dash-num text-2xl font-black tracking-tight text-[#15211d]">
                {totalStockUnits}
              </span>
              <span className="text-xs font-bold text-[#627069]">unit</span>
            </p>
          </div>
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
            <Boxes className="size-5" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-dashed border-[#dfe8e3] pt-3">
          {outOfStockCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
              <AlertTriangle className="size-3" aria-hidden="true" />
              <span>{outOfStockCount} produk habis</span>
            </span>
          ) : lowStockCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
              <AlertTriangle className="size-3" aria-hidden="true" />
              <span>{lowStockCount} produk menipis</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="size-3" aria-hidden="true" />
              <span>Semua stok aman</span>
            </span>
          )}
          <ArrowRight className="ml-auto size-4 shrink-0 text-[#8a9b92] transition-colors duration-200 group-hover:text-[#198760]" aria-hidden="true" />
        </div>
        </Link>
      )}
    </div>
  );
}
