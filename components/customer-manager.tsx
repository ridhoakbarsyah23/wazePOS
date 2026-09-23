"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Check,
  Loader2,
  Mail,
  Pencil,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CustomerListItem = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  note: string | null;
  createdAt: string;
  transactionCount: number;
  totalSpent: number;
  lastVisitAt: string | null;
};

type Feedback = { type: "success" | "error"; message: string } | null;

/** Format angka ke Rupiah dengan aman: value non-number tetap ter-render, tidak crash. */
function formatRupiah(value: number) {
  const safe = Number.isFinite(value) ? value : 0;
  return `Rp ${safe.toLocaleString("id-ID")}`;
}

function formatTanggal(value: string | null) {
  if (!value) return "Belum pernah";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function normalizeCustomer(raw: unknown): CustomerListItem {
  const base = (raw ?? {}) as Partial<CustomerListItem>;
  return {
    id: String(base.id ?? crypto.randomUUID()),
    name: String(base.name ?? "Tanpa nama"),
    phone: base.phone ?? null,
    email: base.email ?? null,
    note: base.note ?? null,
    createdAt: base.createdAt ? new Date(base.createdAt).toISOString() : new Date().toISOString(),
    transactionCount: Number(base.transactionCount ?? 0),
    totalSpent: Number(base.totalSpent ?? 0),
    lastVisitAt: base.lastVisitAt ? new Date(base.lastVisitAt).toISOString() : null,
  };
}

export function CustomerManager({
  initialCustomers,
  maxCustomers,
}: {
  initialCustomers: CustomerListItem[];
  maxCustomers: number;
}) {
  const [customers, setCustomers] = useState<CustomerListItem[]>(initialCustomers);
  const [query, setQuery] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  // Form tambah
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newNote, setNewNote] = useState("");

  // Form ubah
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editNote, setEditNote] = useState("");

  const isQuotaReached = maxCustomers < 9999 && customers.length >= maxCustomers;

  useEffect(() => {
    if (!feedback) return;
    const timeoutId = window.setTimeout(() => setFeedback(null), 8_000);
    return () => window.clearTimeout(timeoutId);
  }, [feedback]);

  const filteredCustomers = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return customers;
    return customers.filter(
      (item) =>
        item.name.toLowerCase().includes(keyword) ||
        (item.phone ?? "").toLowerCase().includes(keyword) ||
        (item.email ?? "").toLowerCase().includes(keyword),
    );
  }, [customers, query]);

  const totalTransactions = customers.reduce((sum, item) => sum + item.transactionCount, 0);
  const totalSpentAll = customers.reduce((sum, item) => sum + item.totalSpent, 0);
  const repeatCustomers = customers.filter((item) => item.transactionCount > 1).length;
  const newThisMonth = customers.filter((item) => {
    const created = new Date(item.createdAt);
    const now = new Date();
    return (
      created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
    );
  }).length;

  function resetAddForm() {
    setNewName("");
    setNewPhone("");
    setNewEmail("");
    setNewNote("");
  }

  async function handleAddCustomer(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPendingAction("add");

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phone: newPhone, email: newEmail, note: newNote }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFeedback({ type: "error", message: data?.message ?? "Pelanggan belum berhasil disimpan." });
        return;
      }

      // Normalisasi: jaminan bentuk CustomerListItem walau API tidak lengkap.
      const created = normalizeCustomer({ ...data.customer, transactionCount: 0, totalSpent: 0 });
      setCustomers((current) => [...current, created]);
      resetAddForm();
      setShowAddForm(false);
      setFeedback({ type: "success", message: data.message ?? "Pelanggan berhasil ditambahkan." });
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSaveEdit(id: string) {
    setFeedback(null);
    setPendingAction(`edit-${id}`);

    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, phone: editPhone, email: editEmail, note: editNote }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFeedback({ type: "error", message: data?.message ?? "Gagal memperbarui data pelanggan." });
        return;
      }

      setCustomers((current) =>
        current.map((item) => (item.id === id ? { ...item, ...normalizeCustomer({ ...item, ...data.customer }) } : item)),
      );
      setEditingId(null);
      setFeedback({ type: "success", message: "Pelanggan berhasil diperbarui." });
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDelete(item: CustomerListItem) {
    setFeedback(null);
    setPendingAction(`delete-${item.id}`);

    try {
      const res = await fetch(`/api/customers/${item.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setFeedback({ type: "error", message: data?.message ?? "Gagal menghapus pelanggan." });
        return;
      }

      setCustomers((current) => current.filter((entry) => entry.id !== item.id));
      setFeedback({ type: "success", message: `Pelanggan "${item.name}" berhasil dihapus.` });
    } catch {
      setFeedback({ type: "error", message: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setPendingAction(null);
    }
  }

  function startEdit(item: CustomerListItem) {
    setEditingId(item.id);
    setEditName(item.name);
    setEditPhone(item.phone ?? "");
    setEditEmail(item.email ?? "");
    setEditNote(item.note ?? "");
  }

  const stats = [
    {
      label: "Total Pelanggan",
      value: String(customers.length),
      hint: maxCustomers < 9999 ? `Kuota ${maxCustomers}` : "Tanpa batas",
      icon: Users,
      iconClass: "bg-emerald-50 text-[#198760] border-emerald-100",
    },
    {
      label: "Pelanggan Setia",
      value: String(repeatCustomers),
      hint: "Belanja >1 kali",
      icon: UserRound,
      iconClass: "bg-purple-50 text-purple-700 border-purple-100",
    },
    {
      label: "Total Belanja",
      value: formatRupiah(totalSpentAll),
      hint: `${totalTransactions} transaksi terkait`,
      icon: Wallet,
      iconClass: "bg-amber-50 text-amber-700 border-amber-100",
    },
    {
      label: "Baru Bulan Ini",
      value: String(newThisMonth),
      hint: "Pelanggan terdaftar",
      icon: CalendarClock,
      iconClass: "bg-blue-50 text-blue-700 border-blue-100",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Statistik ringkas */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="flex items-start justify-between gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-[0_2px_12px_rgba(16,65,48,.04)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(16,65,48,.08)]"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#627069]">{stat.label}</p>
                <p className="mt-1 truncate text-xl font-black tracking-tight text-[#15211d]">{stat.value}</p>
                <p className="mt-0.5 text-[10px] font-semibold text-[#8b9991]">{stat.hint}</p>
              </div>
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl border ${stat.iconClass}`}>
                <Icon className="size-4.5" />
              </span>
            </div>
          );
        })}
      </div>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} aria-label="Tutup notifikasi" className="opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Toolbar: cari + tambah */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#87928d]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, telepon, atau email..."
            className="h-10 w-full rounded-xl border border-[#dbe5df] bg-[#f8faf9] pl-9 pr-3 text-sm outline-none transition focus:border-[#198760] focus:bg-white focus:ring-2 focus:ring-[#198760]/10"
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-right">
            <p className="text-xs font-black text-[#15211d]">
              {customers.length}
              {maxCustomers < 9999 ? ` / ${maxCustomers}` : ""} pelanggan
            </p>
            <p className="text-[10px] font-semibold text-[#8b9991]">terdaftar aktif</p>
          </div>
          <Button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            disabled={isQuotaReached}
            className="h-10 rounded-xl bg-gradient-to-r from-[#198760] to-[#14714f] text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(25,135,96,.25)] transition hover:scale-[1.02] hover:bg-[#14714f] active:scale-95"
          >
            {showAddForm ? <X className="size-4" /> : <Plus className="size-4" />}
            <span>{showAddForm ? "Tutup Formulir" : "Tambah Pelanggan"}</span>
          </Button>
        </div>
      </div>

      {isQuotaReached && (
        <p className="m-0 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          <Users className="size-4 shrink-0" />
          Kapasitas pelanggan untuk paket Anda sudah penuh. Upgrade ke Paket Bisnis untuk daftar tanpa batas.
        </p>
      )}

      {/* Form tambah */}
      {showAddForm && (
        <form
          onSubmit={handleAddCustomer}
          className="grid gap-4 rounded-2xl border border-[#b8d6c7] bg-gradient-to-br from-[#f7fbf9] to-[#eef7f2] p-5 shadow-[0_4px_18px_rgba(16,65,48,.06)] sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="customer-name" className="text-xs font-bold text-[#34443d]">
              Nama Pelanggan <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="customer-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Bu Sari"
              required
              maxLength={100}
              className="h-10 rounded-xl border-[#dbe5df] bg-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone" className="text-xs font-bold text-[#34443d]">
              No. Telepon / WhatsApp
            </Label>
            <Input
              id="customer-phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="081234567890"
              maxLength={20}
              inputMode="tel"
              className="h-10 rounded-xl border-[#dbe5df] bg-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-email" className="text-xs font-bold text-[#34443d]">
              Email
            </Label>
            <Input
              id="customer-email"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="nama@email.com"
              maxLength={200}
              className="h-10 rounded-xl border-[#dbe5df] bg-white text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="customer-note" className="text-xs font-bold text-[#34443d]">
              Catatan
            </Label>
            <Input
              id="customer-note"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Preferensi pelanggan..."
              maxLength={500}
              className="h-10 rounded-xl border-[#dbe5df] bg-white text-sm"
            />
          </div>
          <div className="flex items-center justify-end gap-2 sm:col-span-2 lg:col-span-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetAddForm();
                setShowAddForm(false);
              }}
              className="h-10 rounded-xl border-[#dbe5df] text-xs font-bold text-[#627069] hover:bg-white"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={pendingAction === "add" || !newName.trim()}
              className="h-10 min-w-44 rounded-xl bg-[#198760] text-xs font-extrabold text-white shadow-[0_4px_14px_rgba(25,135,96,.25)] hover:bg-[#14714f]"
            >
              {pendingAction === "add" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <UserRound className="size-4" />
                  <span>Simpan Pelanggan</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* Daftar pelanggan */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((item) => {
          const isEditing = editingId === item.id;
          const isPending = pendingAction === `edit-${item.id}` || pendingAction === `delete-${item.id}`;
          const isRepeat = item.transactionCount > 1;

          if (isEditing) {
            return (
              <form
                key={item.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSaveEdit(item.id);
                }}
                className="space-y-2.5 rounded-2xl border-2 border-[#198760]/40 bg-[#f4faf7] p-4 shadow-[0_4px_18px_rgba(16,65,48,.08)]"
              >
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#198760]">Ubah Data Pelanggan</p>
                <div className="space-y-1">
                  <Label htmlFor={`edit-name-${item.id}`} className="text-[10px] font-bold text-[#627069]">
                    Nama
                  </Label>
                  <Input
                    id={`edit-name-${item.id}`}
                    autoFocus
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    maxLength={100}
                    className="h-9 rounded-lg text-sm"
                    placeholder="Nama pelanggan"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor={`edit-phone-${item.id}`} className="text-[10px] font-bold text-[#627069]">
                      Telepon
                    </Label>
                    <Input
                      id={`edit-phone-${item.id}`}
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      maxLength={20}
                      className="h-9 rounded-lg text-sm"
                      placeholder="0812..."
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`edit-email-${item.id}`} className="text-[10px] font-bold text-[#627069]">
                      Email
                    </Label>
                    <Input
                      id={`edit-email-${item.id}`}
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      maxLength={200}
                      className="h-9 rounded-lg text-sm"
                      placeholder="nama@email.com"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`edit-note-${item.id}`} className="text-[10px] font-bold text-[#627069]">
                    Catatan
                  </Label>
                  <Input
                    id={`edit-note-${item.id}`}
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    maxLength={500}
                    className="h-9 rounded-lg text-sm"
                    placeholder="Preferensi pelanggan..."
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    type="submit"
                    disabled={isPending || !editName.trim()}
                    className="h-9 flex-1 rounded-lg bg-[#198760] text-xs font-extrabold text-white hover:bg-[#14714f]"
                  >
                    {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>Simpan</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                    className="h-9 flex-1 rounded-lg border-[#dbe5df] text-xs font-bold text-[#627069]"
                  >
                    Batal
                  </Button>
                </div>
              </form>
            );
          }

          return (
            <div
              key={item.id}
              className="group flex flex-col justify-between gap-3 rounded-2xl border border-[#e5ede8] bg-white p-4 shadow-[0_2px_10px_rgba(16,65,48,.03)] transition hover:-translate-y-0.5 hover:border-[#b8d6c7] hover:shadow-[0_8px_24px_rgba(16,65,48,.08)]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-emerald-100 bg-gradient-to-br from-[#eaf7f0] to-[#dff2e8] text-sm font-black text-[#198760] shadow-xs">
                    {item.name.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <strong className="flex items-center gap-1.5 truncate text-sm font-bold text-[#15211d]">
                      <span className="truncate">{item.name}</span>
                      {isRepeat && (
                        <span className="shrink-0 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-amber-700">
                          Setia
                        </span>
                      )}
                    </strong>
                    <div className="mt-0.5 space-y-0.5 text-[11px] text-[#627069]">
                      {item.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="size-3 shrink-0 text-[#198760]" />
                          <span className="truncate">{item.phone}</span>
                        </span>
                      )}
                      {item.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="size-3 shrink-0 text-[#198760]" />
                          <span className="truncate">{item.email}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="grid size-7 place-items-center rounded-lg border border-[#dbe5df] bg-white text-[#627069] transition hover:border-[#198760] hover:text-[#198760]"
                    title="Ubah data pelanggan"
                    aria-label={`Ubah ${item.name}`}
                  >
                    <Pencil className="size-3" />
                  </button>
                  <ConfirmationDialog
                    title={`Hapus pelanggan "${item.name}"?`}
                    description="Riwayat transaksi pelanggan ini tetap tersimpan di laporan, hanya tautan datanya yang dilepas."
                    confirmLabel="Hapus pelanggan"
                    disabled={isPending}
                    onConfirm={() => void handleDelete(item)}
                    trigger={
                      <button
                        type="button"
                        className="grid size-7 place-items-center rounded-lg border border-[#fed7d7] bg-white text-rose-600 transition hover:bg-rose-50"
                        title="Hapus pelanggan"
                        aria-label={`Hapus ${item.name}`}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    }
                  />
                </div>
              </div>

              {item.note && (
                <p className="m-0 rounded-lg border border-[#eef3f0] bg-[#f8fbf9] px-2.5 py-1.5 text-[11px] italic leading-relaxed text-[#78857f]">
                  {item.note}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 rounded-xl border border-[#eef3f0] bg-[#fafcfa] p-2.5 text-center">
                <div>
                  <p className="text-sm font-black text-[#15211d]">{item.transactionCount}×</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8b9991]">Transaksi</p>
                </div>
                <div className="border-x border-[#eef3f0]">
                  <p className="truncate text-sm font-black text-[#198760]" title={formatRupiah(item.totalSpent)}>
                    {formatRupiah(item.totalSpent)}
                  </p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8b9991]">Total</p>
                </div>
                <div>
                  <p className="text-sm font-black text-[#15211d]">{formatTanggal(item.lastVisitAt).split(" ")[0]}</p>
                  <p className="text-[9px] font-bold uppercase tracking-wide text-[#8b9991]">Kunjungan</p>
                </div>
              </div>

              <p className="flex items-center gap-1 text-[10px] font-semibold text-[#9aa69f]">
                <ReceiptText className="size-3" />
                Kunjungan terakhir: {formatTanggal(item.lastVisitAt)}
              </p>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full rounded-2xl border-2 border-dashed border-[#dfe8e3] bg-[#fbfdfc] p-12 text-center">
            <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#198760]">
              <Users className="size-6" />
            </span>
            <p className="mt-3 text-sm font-bold text-[#44534c]">
              {query ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan terdaftar"}
            </p>
            <p className="mt-1 text-xs text-[#78857f]">
              {query
                ? "Coba kata kunci lain, atau bersihkan pencarian."
                : "Tambahkan pelanggan pertama Anda lewat tombol Tambah Pelanggan di atas."}
            </p>
            {!query && !isQuotaReached && (
              <Button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-4 h-10 rounded-xl bg-[#198760] text-xs font-extrabold text-white hover:bg-[#14714f]"
              >
                <Plus className="size-4" />
                <span>Tambah Pelanggan Pertama</span>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
