"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, ReceiptText, RotateCcw, Search, Trash2, X } from "lucide-react";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  expenseCategories,
  expenseCategoryLabels,
  type ExpenseCategory,
} from "@/shared/validation/expense";

export type CashflowRow = {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  spentAt: string;
  outletName: string;
  creatorName: string;
};

function formatMoney(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function categoryLabel(category: string) {
  return category in expenseCategoryLabels
    ? expenseCategoryLabels[category as keyof typeof expenseCategoryLabels]
    : category;
}

export function CashflowManager({
  outlets,
  activeOutletId,
  fromKey,
  toKey,
  categoryFilter,
  expenseUnavailable = false,
  rows,
  resultCount,
  page,
  totalPages,
  prevHref,
  nextHref,
}: {
  outlets: Array<{ id: string; name: string }>;
  activeOutletId: string;
  fromKey: string;
  toKey: string;
  categoryFilter: string | null;
  expenseUnavailable?: boolean;
  rows: CashflowRow[];
  resultCount: number;
  page: number;
  totalPages: number;
  prevHref: string | null;
  nextHref: string | null;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const defaultOutletId =
    activeOutletId !== "all" ? activeOutletId : (outlets[0]?.id ?? "all");
  const [formOutletId, setFormOutletId] = useState(defaultOutletId);
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("belanja");
  const [formAmount, setFormAmount] = useState(0);
  const [formNote, setFormNote] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [maxFormDate] = useState(() => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const hasOutlets = outlets.length > 0;
  const expenseWriteDisabled = expenseUnavailable || !hasOutlets;

  function handleOpenForm() {
    if (expenseUnavailable) {
      setFormError("Fitur uang keluar belum aktif di database. Jalankan migrasi terbaru dahulu.");
      setIsFormOpen(true);
      return;
    }
    setFormOutletId(defaultOutletId);
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormError(null);
    setIsFormOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    if (expenseUnavailable) {
      setFormError("Fitur uang keluar belum aktif di database. Jalankan migrasi terbaru dahulu.");
      return;
    }
    if (!hasOutlets || formOutletId === "all" || !outlets.some((item) => item.id === formOutletId)) {
      setFormError("Belum ada gerai untuk mencatat pengeluaran.");
      return;
    }
    if (formAmount < 1) {
      setFormError("Nominal minimal Rp1.");
      return;
    }
    if (!formDate) {
      setFormError("Tanggal pengeluaran wajib diisi.");
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
          spentAt: new Date(`${formDate}T12:00:00+07:00`).toISOString(),
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
      router.refresh();
    } catch {
      setFormError("Pengeluaran gagal disimpan. Silakan coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (expenseUnavailable) {
      setError("Fitur uang keluar belum aktif di database. Jalankan migrasi terbaru dahulu.");
      return;
    }
    if (!window.confirm("Hapus catatan pengeluaran ini? Angka arus kas akan ikut berubah.")) return;
    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (!response.ok) {
        setError(data?.message ?? "Gagal menghapus pengeluaran.");
        return;
      }
      router.refresh();
    } catch {
      setError("Gagal menghapus pengeluaran.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#d9e2dd] bg-white">
        <form action="/cashflow" method="get" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
            Dari
            <input type="date" name="from" defaultValue={fromKey} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#198760]" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
            Sampai
            <input type="date" name="to" defaultValue={toKey} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#198760]" />
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
            Gerai
            <select name="outlet" defaultValue={activeOutletId} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#198760]">
              <option value="all">Semua gerai</option>
              {outlets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
            Keperluan
            <select name="category" defaultValue={categoryFilter ?? "all"} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#198760]">
              <option value="all">Semua keperluan</option>
              {Object.entries(expenseCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              className="inline-flex h-10 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#198760] px-3 text-xs font-extrabold text-white hover:bg-[#147554]"
            >
              <Search className="size-3.5" aria-hidden="true" />
              Tampilkan
            </button>
            <a
              href="/cashflow"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-bold text-[#627069] hover:text-[#15211d]"
              aria-label="Reset filter"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
            </a>
          </div>
        </form>
      </div>

      {error && (
        <p className="m-0 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#d9e2dd] bg-white">
        <div className="flex flex-col gap-2 border-b border-[#e5ebe8] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ReceiptText className="size-4 text-[#198760]" aria-hidden="true" />
            <h2 className="m-0 text-sm font-bold text-[#17211d]">Catatan pengeluaran</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#78857f]">
              {resultCount > 0 ? `${resultCount} catatan · halaman ${page}/${totalPages}` : "Belum ada catatan"}
            </span>
            <button
              type="button"
              onClick={handleOpenForm}
              disabled={expenseWriteDisabled}
              title={expenseUnavailable ? "Butuh migrasi database terbaru" : hasOutlets ? "Catat belanja atau biaya warung" : "Belum ada gerai"}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-xl bg-[#198760] px-3 text-xs font-extrabold text-white hover:bg-[#147554] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Catat keluar
            </button>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#fafbfa] text-xs font-semibold text-[#68766f]">
              <tr>
                <th className="px-4 py-3">Waktu</th>
                <th className="px-4 py-3">Keperluan</th>
                <th className="px-4 py-3">Gerai & pencatat</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#edf1ef] hover:bg-[#f8fbf9]">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-[#68766f]">{formatDateTime(row.spentAt)}</td>
                  <td className="px-4 py-3">
                    <p className="m-0 text-xs font-bold text-[#17211d]">{categoryLabel(row.category)}</p>
                    {row.note && <p className="m-0 mt-0.5 text-[11px] text-[#78857f]">{row.note}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#68766f]">
                    {row.outletName} · {row.creatorName}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rose-700">{formatMoney(row.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Trash2 className="size-3" aria-hidden="true" />
                      {deletingId === row.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-[#edf1ef] md:hidden">
          {rows.map((row) => (
            <div key={row.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="m-0 text-xs font-bold text-[#17211d]">{categoryLabel(row.category)}</p>
                  <p className="m-0 mt-0.5 text-[11px] text-[#78857f]">{formatDateTime(row.spentAt)}</p>
                </div>
                <p className="m-0 shrink-0 text-sm font-bold text-rose-700">{formatMoney(row.amount)}</p>
              </div>
              {row.note && <p className="m-0 mt-1 text-[11px] text-[#68766f]">{row.note}</p>}
              <div className="mt-2 flex items-center justify-between gap-3">
                <p className="m-0 truncate text-[11px] text-[#78857f]">
                  {row.outletName} · {row.creatorName}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  disabled={deletingId === row.id}
                  className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-wait disabled:opacity-60"
                >
                  <Trash2 className="size-3" aria-hidden="true" />
                  {deletingId === row.id ? "Menghapus..." : "Hapus"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <ReceiptText className="mx-auto size-6 text-[#9aa69f]" aria-hidden="true" />
            <p className="mt-2 text-sm font-semibold text-[#44534c]">Belum ada pengeluaran</p>
            <p className="mt-1 text-xs text-[#78857f]">Ubah periode atau catat pengeluaran pertama dari halaman ini.</p>
          </div>
        )}

        {rows.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#e5ebe8] px-4 py-3">
            <p className="m-0 text-xs text-[#78857f]">
              Halaman {page} dari {totalPages}
            </p>
            <nav className="flex items-center gap-1" aria-label="Navigasi halaman">
              {prevHref ? (
                <a href={prevHref} className="inline-flex h-9 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] hover:border-[#198760] hover:text-[#198760]">
                  Sebelumnya
                </a>
              ) : (
                <span className="inline-flex h-9 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] opacity-40">
                  Sebelumnya
                </span>
              )}
              {nextHref ? (
                <a href={nextHref} className="inline-flex h-9 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] hover:border-[#198760] hover:text-[#198760]">
                  Berikutnya
                </a>
              ) : (
                <span className="inline-flex h-9 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] opacity-40">
                  Berikutnya
                </span>
              )}
            </nav>
          </div>
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
                <label htmlFor="cashflow-page-amount">Nominal keluar</label>
                <RupiahInput id="cashflow-page-amount" value={formAmount} onChange={setFormAmount} required />
              </div>

              <label className="grid gap-1.5 text-xs font-bold text-[#53635b]">
                Tanggal keluar
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  max={maxFormDate}
                  className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#15211d] outline-none focus:border-[#198760]"
                />
              </label>

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
    </div>
  );
}
