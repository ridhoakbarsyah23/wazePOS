import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Package,
  Settings2,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Warehouse,
} from "lucide-react";
import { DashboardSalesChart } from "@/components/dashboard/dashboard-sales-chart";

type SalesPoint = {
  key: string;
  label: string;
  revenue: number;
  transactions: number;
};

const actions = [
  {
    href: "/products",
    label: "Produk",
    description: "Atur katalog dan harga",
    icon: Package,
  },
  {
    href: "/inventory",
    label: "Stok",
    description: "Pantau dan koreksi stok",
    icon: Warehouse,
  },
  {
    href: "/reports",
    label: "Laporan",
    description: "Tinjau performa usaha",
    icon: BarChart3,
  },
  {
    href: "/settings",
    label: "Pengaturan",
    description: "Kelola usaha, gerai, dan kategori",
    icon: Settings2,
  },
] as const;

export function DashboardOverview({
  chartPoints,
  periodLabel,
  currentTransactions,
  selectedOutletId,
  selectedOutletSlug,
  showSalesChart = true,
  showReportsAction = true,
  showInventoryAction = true,
}: {
  chartPoints: SalesPoint[];
  periodLabel: string;
  currentTransactions: number;
  selectedOutletId: string;
  selectedOutletSlug?: string;
  showSalesChart?: boolean;
  showReportsAction?: boolean;
  showInventoryAction?: boolean;
}) {
  const cashierHref =
    selectedOutletSlug
      ? `/pos/${encodeURIComponent(selectedOutletSlug)}`
      : selectedOutletId === "all"
        ? "/pos"
        : `/pos?outlet=${encodeURIComponent(selectedOutletId)}`;

  const visibleActions = actions.filter(
    (action) =>
      (showReportsAction || action.href !== "/reports") &&
      (showInventoryAction || action.href !== "/inventory"),
  );

  return (
    <section className={`dash-warung grid min-w-0 gap-3 sm:gap-4 ${showSalesChart ? "xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]" : "grid-cols-1"}`}>
      {showSalesChart && (
        <div className="dash-card min-w-0 rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_20px_rgba(16,65,48,.04)] sm:p-6">
          <div className="flex flex-col gap-3 border-b border-dashed border-[#dfe8e3] pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="dash-kicker m-0">Catatan omzet</p>
              <h2 className="m-0 mt-1 flex items-center gap-2 text-base font-black text-[#15211d]">
                <TrendingUp className="size-4 shrink-0 text-[#198760]" aria-hidden="true" />
                Tren {periodLabel.toLowerCase()}
              </h2>
              <p className="m-0 mt-1 text-xs leading-5 text-[#627069]">
                Pilih batang grafik untuk melihat rincian tiap struk.
              </p>
            </div>
            <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-[#dbe5df] bg-[#f8faf9] px-3 py-1.5 text-xs font-bold text-[#15211d]">
              <CheckCircle2 className="size-3.5 text-[#198760]" aria-hidden="true" />
              <span className="dash-num">{currentTransactions} struk</span>
            </span>
          </div>
          <div className="pt-4">
            <DashboardSalesChart points={chartPoints} />
          </div>
        </div>
      )}

      <aside className="dash-card rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_20px_rgba(16,65,48,.04)] sm:p-5">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
            <Sparkles className="size-4" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="m-0 text-sm font-extrabold text-[#15211d]">Langkah berikutnya</h2>
            <p className="m-0 mt-0.5 text-xs leading-5 text-[#627069]">Lanjut kerja tanpa cari menu.</p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          <Link
            href={cashierHref}
            className="group flex min-h-20 cursor-pointer items-center gap-3 rounded-2xl border border-[#198760] bg-[#198760] p-3.5 text-white transition-colors duration-200 hover:bg-[#147554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/40 focus-visible:ring-offset-2"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 text-white">
              <ShoppingCart className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <strong className="block text-sm">Buka kasir</strong>
              <span className="block text-xs text-white/80">Mulai transaksi baru</span>
            </span>
          </Link>

          {visibleActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex min-h-[4.5rem] cursor-pointer items-center gap-3 rounded-2xl border border-[#dbe5df] bg-white p-3.5 transition-colors duration-200 hover:border-[#b8dfcb] hover:bg-[#f8faf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-[#eaf7f0] text-[#198760]">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm text-[#15211d]">{action.label}</strong>
                  <span className="block truncate text-xs leading-5 text-[#627069]">{action.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
