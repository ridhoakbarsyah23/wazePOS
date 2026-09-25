"use client";

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

  // Sales change calculation
  const hasComparableSales = previousSales > 0;
  const salesChange = hasComparableSales
    ? Math.round(((currentSales - previousSales) / previousSales) * 100)
    : 0;

  const isSalesUp = salesChange >= 0;

  // Transaction comparison text
  const txComparisonText =
    previousTransactions === 0
      ? currentTransactions > 0
        ? "Mulai tercatat periode ini"
        : "Belum ada transaksi"
      : `${currentTransactions - previousTransactions >= 0 ? "+" : ""}${
          currentTransactions - previousTransactions
        } struk dari periode lalu`;

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${showStock ? "xl:grid-cols-4" : "xl:grid-cols-3"} animate-page-enter`}>
      {/* 1. TOTAL OMZET */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(16,65,48,.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#627069]">
              Total Omzet
            </span>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-[#15211d]">
              {money(currentSales)}
            </h3>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-[#198760] border border-emerald-100/80 shrink-0">
            <Wallet className="size-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#f0f4f2]">
          <span
            className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-bold ${
              isSalesUp
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                : "bg-rose-50 text-rose-700 border border-rose-200/60"
            }`}
          >
            {isSalesUp ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            <span>
              {hasComparableSales
                ? isSalesUp
                  ? `+${salesChange}%`
                  : `${salesChange}%`
                : currentSales > 0
                  ? "Baru tercatat"
                  : "Belum ada omzet"}
            </span>
          </span>
          {hasComparableSales && (
            <span className="text-[11px] text-[#627069]">vs periode sebelumnya</span>
          )}
        </div>
      </div>

      {/* 2. TOTAL TRANSAKSI */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(16,65,48,.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#627069]">
              Total Transaksi
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black tracking-tight text-[#15211d]">
                {currentTransactions}
              </h3>
              <span className="text-xs font-bold text-[#627069]">struk</span>
            </div>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-700 border border-blue-100/80 shrink-0">
            <Receipt className="size-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#f0f4f2]">
          <span className="text-[11px] font-semibold text-[#627069] truncate">
            {txComparisonText}
          </span>
        </div>
      </div>

      {/* 3. RATA-RATA TRANSAKSI (AOV) */}
      <div className="relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_25px_rgba(16,65,48,.08)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#627069]">
              Rata-rata Keranjang
            </span>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-[#15211d]">
              {money(currentAov)}
            </h3>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-purple-50 text-purple-700 border border-purple-100/80 shrink-0">
            <ShoppingBag className="size-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#f0f4f2]">
          <span className="text-[11px] text-[#627069]">Nilai rata-rata belanja pelanggan</span>
        </div>
      </div>

      {/* 4. STATUS STOK INVENTARIS */}
      {showStock && (
        <Link
          href={lowStockHref}
        aria-label={outOfStockCount > 0 ? `Lihat ${outOfStockCount} produk yang stoknya habis` : lowStockCount > 0 ? `Lihat ${lowStockCount} produk dengan stok menipis` : "Buka halaman inventori"}
        className="group relative overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-[0_4px_20px_rgba(16,65,48,.04)] transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-[0_8px_25px_rgba(16,65,48,.08)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-300/40"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#627069]">
              Stok Produk
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <h3 className="text-2xl font-black tracking-tight text-[#15211d]">
                {totalStockUnits}
              </h3>
              <span className="text-xs font-bold text-[#627069]">unit total</span>
            </div>
          </div>
          <div className="grid size-11 place-items-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-100/80 shrink-0">
            <Boxes className="size-5" />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 pt-2 border-t border-[#f0f4f2]">
          {outOfStockCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700">
              <AlertTriangle className="size-3" />
              <span>{outOfStockCount} produk stok habis</span>
            </span>
          ) : lowStockCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800">
              <AlertTriangle className="size-3" />
              <span>{lowStockCount} produk stok menipis</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="size-3" />
              <span>Semua stok aman</span>
            </span>
          )}
          <ArrowRight className="ml-auto size-4 text-[#8a9b92] transition-transform group-hover:translate-x-0.5 group-hover:text-[#a35f12]" />
        </div>
        </Link>
      )}
    </div>
  );
}
