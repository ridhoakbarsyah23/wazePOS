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

  return (
    <div>
      <div className="mb-6 flex min-h-14 flex-wrap items-end justify-between gap-3 rounded-xl bg-[#f5faf7] px-4 py-3" aria-live="polite">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#718078]">{activePoint?.label ?? "Belum ada data"}</p>
          <p className="mt-1 text-xl font-extrabold tracking-[-0.5px]">{formatCurrency(activePoint?.revenue ?? 0)}</p>
        </div>
        <p className="text-sm font-semibold text-[#53635b]">{activePoint?.transactions ?? 0} transaksi</p>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex h-56 min-w-[560px] items-end gap-2" role="list" aria-label="Grafik omzet">
          {points.map((point, index) => {
            const height = point.revenue > 0 ? Math.max((point.revenue / maximum) * 100, 7) : 2;
            const active = index === activeIndex;

            return (
              <button
                key={point.key}
                type="button"
                role="listitem"
                aria-label={`${point.label}: ${formatCurrency(point.revenue)}, ${point.transactions} transaksi`}
                className="group flex h-full min-w-8 flex-1 flex-col items-center justify-end gap-2 rounded-lg outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15"
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onClick={() => setActiveIndex(index)}
              >
                <span className="flex h-[184px] w-full items-end rounded-lg bg-[#f0f6f3] p-1">
                  <span
                    className={`block w-full rounded-md transition-all duration-200 ${active ? "bg-[#198760] shadow-[0_7px_14px_rgba(25,135,96,.25)]" : "bg-[#9fd6bd] group-hover:bg-[#55b88f]"}`}
                    style={{ height: `${height}%` }}
                  />
                </span>
                <span className={`text-[10px] font-bold ${active ? "text-[#198760]" : "text-[#7a8881]"}`}>{point.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
