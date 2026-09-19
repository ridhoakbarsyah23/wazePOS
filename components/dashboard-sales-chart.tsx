"use client";

import { useState } from "react";

type SalesPoint = {
  key: string;
  label: string;
  revenue: number;
  transactions: number;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardSalesChart({ points }: { points: SalesPoint[] }) {
  const [activeIndex, setActiveIndex] = useState(Math.max(points.length - 1, 0));
  const activePoint = points[activeIndex] ?? points[0];
  const maximum = Math.max(...points.map((point) => point.revenue), 1);

  // Grafik padat (mis. 24 jam): tampilkan label tiap beberapa batang agar tidak bertumpuk.
  const labelStep = points.length > 12 ? 3 : 1;

  return (
    <div className="min-w-0">
      {/* Ringkasan angka aktif */}
      <div
        className="mb-4 flex items-end justify-between gap-3 rounded-xl bg-[#f5faf7] px-3 py-2.5 sm:px-4 sm:py-3"
        aria-live="polite"
      >
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-[#718078]">
            {activePoint?.label ?? "Belum ada data"}
          </p>
          <p className="mt-1 truncate text-lg font-extrabold tracking-[-0.5px] sm:text-xl">
            {formatCurrency(activePoint?.revenue ?? 0)}
          </p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-[#53635b] sm:text-sm">
          {activePoint?.transactions ?? 0} transaksi
        </p>
      </div>

      {/* Grafik batang: melebar mengikuti kartu; scroll internal hanya bila benar-benar padat */}
      <div className="min-w-0 overflow-x-auto pb-1 [scrollbar-width:thin]">
        <div
          className="flex h-44 min-w-full items-end gap-1 sm:h-56 sm:gap-1.5"
          role="list"
          aria-label="Grafik omzet"
        >
          {points.map((point, index) => {
            const height = point.revenue > 0 ? Math.max((point.revenue / maximum) * 100, 7) : 2;
            const active = index === activeIndex;
            const showLabel = index % labelStep === 0 || index === points.length - 1;

            return (
              <button
                key={point.key}
                type="button"
                role="listitem"
                aria-label={`${point.label}: ${formatCurrency(point.revenue)}, ${point.transactions} transaksi`}
                className="group flex h-full min-w-[14px] flex-1 flex-col items-center justify-end gap-1.5 rounded-md outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 sm:min-w-[22px]"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                {/* Area batang: flex-1 mengisi ruang di atas label, tinggi selalu sejajar antar kolom */}
                <span className="flex w-full flex-1 items-end rounded-md bg-[#f0f6f3] p-[3px] sm:p-1">
                  <span
                    className={`block w-full rounded-[4px] transition-all duration-200 ${
                      active
                        ? "bg-[#198760] shadow-[0_7px_14px_rgba(25,135,96,.25)]"
                        : "bg-[#9fd6bd] group-hover:bg-[#55b88f]"
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </span>
                {/* Label: transparan saat disembunyikan agar tinggi baris antar kolom tetap sama */}
                <span
                  className={`w-max text-center text-[9px] font-bold leading-none sm:text-[10px] ${
                    active
                      ? "text-[#198760]"
                      : showLabel
                        ? "text-[#7a8881]"
                        : "text-transparent"
                  }`}
                >
                  {point.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
