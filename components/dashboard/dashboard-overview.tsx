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
    iconClass: "bg-blue-600",
    cardClass: "border-blue-200 bg-blue-50/60 hover:border-blue-300",
  },
  {
    href: "/inventory",
    label: "Inventori",
    description: "Pantau dan koreksi stok",
    icon: Warehouse,
    iconClass: "bg-amber-600",
    cardClass: "border-amber-200 bg-amber-50/60 hover:border-amber-300",
  },
  {
    href: "/reports",
    label: "Laporan",
    description: "Tinjau performa usaha",
    icon: BarChart3,
    iconClass: "bg-violet-600",
    cardClass: "border-violet-200 bg-violet-50/60 hover:border-violet-300",
  },
  {
    href: "/settings",
    label: "Pengaturan",
    description: "Kelola usaha, gerai, dan kategori",
    icon: Settings2,
    iconClass: "bg-slate-700",
    cardClass: "border-slate-200 bg-slate-50/70 hover:border-slate-300",
  },
] as const;

export function DashboardOverview({
  chartPoints,
  periodLabel,
  currentTransactions,
  selectedOutletId,
  selectedOutletSlug,
}: {
  chartPoints: SalesPoint[];
  periodLabel: string;
  currentTransactions: number;
  selectedOutletId: string;
  selectedOutletSlug?: string;
}) {
  const cashierHref =
    selectedOutletSlug
      ? `/pos/${encodeURIComponent(selectedOutletSlug)}`
      : selectedOutletId === "all"
        ? "/pos"
        : `/pos?outlet=${encodeURIComponent(selectedOutletId)}`;

  return (
    <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.75fr)]">
      <div className="min-w-0 rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_20px_rgba(16,65,48,.04)] sm:p-6">
        <div className="flex flex-col gap-3 border-b border-[#edf2ee] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-black text-[#15211d]">
              <TrendingUp className="size-4.5 text-[#198760]" />
              Tren omzet
            </h2>
            <p className="mt-1 text-xs leading-5 text-[#627069]">
              Periode {periodLabel.toLowerCase()}. Sentuh batang grafik untuk melihat rinciannya.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="size-3.5" />
            {currentTransactions} transaksi
          </span>
        </div>
        <div className="pt-4">
          <DashboardSalesChart points={chartPoints} />
        </div>
      </div>

      <aside className="rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_20px_rgba(16,65,48,.04)] sm:p-5">
        <div className="mb-4 flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-[#15211d]">Aksi cepat</h2>
            <p className="mt-0.5 text-xs leading-5 text-[#627069]">Lanjutkan pekerjaan tanpa mencari menu.</p>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          <Link
            href={cashierHref}
            className="group flex min-h-20 items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#198760] text-white">
              <ShoppingCart className="size-4.5" />
            </span>
            <span>
              <strong className="block text-sm text-[#15211d]">Buka Kasir POS</strong>
              <span className="text-xs text-[#627069]">Mulai transaksi penjualan</span>
            </span>
          </Link>

          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group flex min-h-18 items-center gap-3 rounded-2xl border p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#198760]/15 ${action.cardClass}`}
              >
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl text-white ${action.iconClass}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <strong className="block text-sm text-[#15211d]">{action.label}</strong>
                  <span className="block text-xs leading-5 text-[#627069]">{action.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </aside>
    </section>
  );
}
