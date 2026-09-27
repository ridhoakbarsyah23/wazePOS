"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  History,
  PiggyBank,
  Plus,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { expenseCategories, expenseCategoryLabels, type ExpenseCategory } from "@/shared/validation/expense";

type CashflowRecent = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spentAt: string;
  outletId: string;
};

type CashflowSummary = {
  period: string;
  outletId: string;
  incomeTotal: number;
  incomeCount: number;
  expenseTotal: number;
  expenseCount: number;
  netTotal: number;
  recent: CashflowRecent[];
  updatedAt: string;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function DashboardCashflow({
  selectedPeriod,
  selectedOutletId,
  outlets,
  defaultOutletId,
  initialIncomeTotal,
  initialIncomeCount,
  initialExpenseTotal,
  initialExpenseCount,
  initialRecent,
}: {
  selectedPeriod: string;
  selectedOutletId: string;
  outlets: Array<{ id: string; name: string }>;
  defaultOutletId: string;
  initialIncomeTotal: number;
  initialIncomeCount: number;
  initialExpenseTotal: number;
  initialExpenseCount: number;
  initialRecent: CashflowRecent[];
}) {
  const router = useRouter();
  const [summary, setSummary] = useState<CashflowSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formOutletId, setFormOutletId] = useState(defaultOutletId);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("belanja");
  const [formAmount, setFormAmount] = useState(0);
  const [formNote, setFormNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const hasOutlets = outlets.length > 0;

  const fetchSummary = useCallback(
    async (mode: "auto" | "manual" = "auto") => {
      // Mode auto (polling 15 detik) dibuat senyap agar angka tidak berkedip;
      // hanya refresh manual yang menampilkan spinner.
      if (mode === "manual") {
        setRefreshing(true);
        setError(null);
      }
      try {
        const params = new URLSearchParams({ period: selectedPeriod });
        if (selectedOutletId !== "all") params.set("outlet", selectedOutletId);
        const response = await fetch(`/api/cashflow/summary?${params.toString()}`, {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("fetch-failed");
        const data = (await response.json()) as CashflowSummary;
        setSummary(data);
      } catch {
        setError("Gagal memuat arus kas terbaru.");
      } finally {
        if (mode === "manual") setRefreshing(false);
        else setLoading(false);
      }
    },
    [selectedPeriod, selectedOutletId],
  );

  function handleOpenForm() {
    setFormOutletId(defaultOutletId);
    setFormError(null);
    setIsFormOpen(true);
  }

  useEffect(() => {
    // Tunda fetch awal ke callback timer agar tidak dianggap setState
    // sinkron di badan effect (react-hooks/set-state-in-effect).
    const timeout = window.setTimeout(() => {
      void fetchSummary("auto");
    }, 0);
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      void fetchSummary("auto");
    }, 15000);
    return () => {
      window.clearTimeout(timeout);
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [fetchSummary]);

  const incomeTotal = summary?.incomeTotal ?? initialIncomeTotal;
  const incomeCount = summary?.incomeCount ?? initialIncomeCount;
  const expenseTotal = summary?.expenseTotal ?? initialExpenseTotal;
  const expenseCount = summary?.expenseCount ?? initialExpenseCount;
  const netTotal = summary ? summary.netTotal : incomeTotal - expenseTotal;
  const recent = summary?.recent ?? initialRecent;
  const updatedLabel = summary ? formatTime(summary.updatedAt) : null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (!hasOutlets || formOutletId === "all" || !outlets.some((item) => item.id === formOutletId)) {
      setFormError("Belum ada gerai untuk mencatat pengeluaran.");
      return;
    }
    if (formAmount < 1) {
      setFormError("Nominal minimal Rp1.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId: formOutletId,
          category: formCategory,
          amount: formAmount,
          note: formNote.trim() ? formNote.trim() : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setFormError(data?.message ?? "Pengeluaran gagal disimpan.");
        return;
      }
      setIsFormOpen(false);
      setFormAmount(0);
      setFormNote("");
      await fetchSummary("manual");
      router.refresh();
    } catch {
      setFormError("Pengeluaran gagal disimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="dash-warung dash-card rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-[0_4px_20px_rgba(16,65,48,.04)] sm:p-6">
      <div className="flex flex-col gap-3 border-b border-dashed border-[#dfe8e3] pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="dash-kicker m-0">
            <span className="dash-live-dot" aria-hidden="true" />
            Arus kas realtime
          </p>
          <h2 className="m-0 mt-1 flex items-center gap-2 text-base font-black text-[#15211d]">
            <Wallet className="size-4 shrink-0 text-[#198760]" aria-hidden="true" />
            Uang masuk & keluar
          </h2>
          <p className="m-0 mt-1 text-xs leading-5 text-[#627069]">
            {loading ? "Memuat angka terbaru..." : updatedLabel ? `Diperbarui ${updatedLabel} WIB · tiap 15 detik` : "Diperbarui tiap 15 detik"}
            {error ? ` · ${error}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSummary("manual")}
            disabled={refreshing || loading}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#627069] transition-colors duration-200 hover:border-[#b8d6c7] hover:text-[#15211d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/30 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-[#198760]" : ""}`} aria-hidden="true" />
            <span>{refreshing ? "Memuat..." : "Perbarui"}</span>
          </button>
          <button
            type="button"
            onClick={handleOpenForm}
            disabled={!hasOutlets}
            title={hasOutlets ? "Catat belanja atau biaya warung" : "Belum ada gerai"}
            className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl bg-[#198760] px-3 text-xs font-extrabold text-white transition-colors duration-200 hover:bg-[#147554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="size-4" aria-hidden="true" />
            <span>Catat keluar</span>
          </button>
        </div>
      </div>

      <div className="grid gap-3 pt-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-emerald-100 bg-[#f2faf6] p-4">
          <p className="m-0 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#147554]">
            <ArrowUpCircle className="size-3.5" aria-hidden="true" />
            Uang masuk
          </p>
          <p className="dash-money m-0 mt-1 truncate text-lg font-bold text-[#15211d] sm:text-xl">
            {formatMoney(incomeTotal)}
          </p>
          <p className="m-0 mt-1 text-[11px] font-semibold text-[#627069]">
            {incomeCount} struk lunas periode ini
          </p>
        </div>
        <div className="rounded-2xl border border-rose-100 bg-[#fef6f6] p-4">
          <p className="m-0 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-rose-700">
            <ArrowDownCircle className="size-3.5" aria-hidden="true" />
            Uang keluar
          </p>
          <p className="dash-money m-0 mt-1 truncate text-lg font-bold text-[#15211d] sm:text-xl">
            {formatMoney(expenseTotal)}
          </p>
          <p className="m-0 mt-1 text-[11px] font-semibold text-[#627069]">
            {expenseCount} catatan belanja & biaya
          </p>
        </div>
        <div className={`rounded-2xl border p-4 ${netTotal >= 0 ? "border-emerald-100 bg-[#eaf7f0]" : "border-rose-100 bg-rose-50"}`}>
          <p className="m-0 flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#15211d]">
            <PiggyBank className="size-3.5 text-[#198760]" aria-hidden="true" />
            Kas bersih
          </p>
          <p className={`dash-money m-0 mt-1 truncate text-lg font-bold sm:text-xl ${netTotal >= 0 ? "text-[#14532d]" : "text-rose-700"}`}>
            {formatMoney(netTotal)}
          </p>
          <p className="m-0 mt-1 text-[11px] font-semibold text-[#627069]">
            Masuk dikurangi keluar
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-[#dfe8e3]">
        <div className="flex items-center justify-between border-b border-dashed border-[#dfe8e3] px-4 py-3">
          <h3 className="m-0 flex items-center gap-1.5 text-xs font-extrabold text-[#15211d]">
            <History className="size-3.5 text-[#198760]" aria-hidden="true" />
            Pengeluaran terbaru
          </h3>
          <Link href="/cashflow" className="text-xs font-bold text-[#198760] hover:text-[#147554] hover:underline">
            Lihat semua
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="m-0 px-4 py-5 text-center text-xs text-[#627069]">
            Belum ada pengeluaran periode ini. Catat belanja kulakan atau biaya pertama.
          </p>
        ) : (
          <ul className="m-0 divide-y divide-[#edf1ef] p-0">
            {recent.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="m-0 truncate text-xs font-extrabold text-[#15211d]">
                    {expenseCategoryLabels[(item.category as ExpenseCategory) ?? "lainnya"] ?? item.category}
                  </p>
                  <p className="m-0 truncate text-[11px] text-[#627069]">
                    {item.note ? `${item.note} · ` : ""}{formatTime(item.spentAt)} WIB
                  </p>
                </div>
                <p className="dash-money m-0 shrink-0 text-xs font-bold text-rose-700">
                  -{formatMoney(item.amount)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/45 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Catat pengeluaran">
          <form onSubmit={handleSubmit} className="w-full max-w-md rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="m-0 text-base font-black text-[#15211d]">Catat uang keluar</h3>
                <p className="m-0 mt-0.5 text-xs text-[#627069]">Belanja, gaji, sewa, dan biaya warung.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="grid size-8 cursor-pointer place-items-center rounded-lg text-[#627069] hover:bg-[#f1f6f3] hover:text-[#15211d]"
                aria-label="Tutup form pengeluaran"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5 text-xs font-bold text-[#53635b]">
                Gerai
                <select
                  value={formOutletId}
                  onChange={(e) => setFormOutletId(e.target.value)}
                  className="h-10 cursor-pointer rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#15211d] focus:border-[#198760] focus:outline-none"
                >
                  {outlets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1.5 text-xs font-bold text-[#53635b]">
                Keperluan
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  className="h-10 cursor-pointer rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#15211d] focus:border-[#198760] focus:outline-none"
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {expenseCategoryLabels[category]}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-1.5 text-xs font-bold text-[#53635b]">
                <label htmlFor="cashflow-amount">Nominal keluar</label>
                <RupiahInput id="cashflow-amount" value={formAmount} onChange={setFormAmount} required />
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-[#53635b]">
                Catatan (opsional)
                <input
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  maxLength={200}
                  placeholder="Contoh: kulakan beras 10 kg"
                  className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#15211d] outline-none placeholder:font-normal placeholder:text-[#9fb0a7] focus:border-[#198760]"
                />
              </label>

              {formError && (
                <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-2xl bg-[#198760] px-4 text-sm font-extrabold text-white transition-colors duration-200 hover:bg-[#147554] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#198760]/40 disabled:cursor-wait disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : "Simpan pengeluaran"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
