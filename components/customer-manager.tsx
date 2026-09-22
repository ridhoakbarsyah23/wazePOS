"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Loader2,
  Mail,
  Phone,
  Plus,
  ReceiptText,
  Search,
  Trash2,
  UserRound,
  Users,
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

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatTanggal(value: string | null) {
  if (!value) return "Belum pernah";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function CustomerManager({
  initialCustomers,
  maxCustomers,
}: {
  initialCustomers: CustomerListItem[];
  maxCustomers: number;
}) {
  const [customers, setCustomers] = useState(initialCustomers);
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

      setCustomers((current) => [...current, data.customer]);
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
        current.map((item) => (item.id === id ? { ...item, ...data.customer } : item)),
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

  return (
    <div className="space-y-4">
      {feedback && (
        <div
          className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-semibold ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-700"
          }`}
        >
          <span>{feedback.message}</span>
          <button type="button" onClick={() => setFeedback(null)} className="opacity-60 hover:opacity-100">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#87928d]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama, telepon, atau email..."
            className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-[#627069]">
            {customers.length}
            {maxCustomers < 9999 ? ` / ${maxCustomers}` : ""} pelanggan
          </span>
          <Button
            type="button"
            onClick={() => setShowAddForm((current) => !current)}
            disabled={isQuotaReached}
            className="h-10 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
          >
            {showAddForm ? <X className="size-4" /> : <Plus className="size-4" />}
            <span>{showAddForm ? "Tutup formulir" : "Tambah Pelanggan"}</span>
          </Button>
        </div>
      </div>

      {isQuotaReached && (
        <p className="m-0 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
          Kapasitas pelanggan untuk paket Anda sudah penuh. Upgrade ke Paket Bisnis untuk daftar tanpa batas.
        </p>
      )}

      {showAddForm && (
        <form
          onSubmit={handleAddCustomer}
          className="grid gap-3 rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="space-y-1">
            <Label htmlFor="customer-name" className="text-xs font-bold text-[#627069]">
              Nama Pelanggan *
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
          <div className="space-y-1">
            <Label htmlFor="customer-phone" className="text-xs font-bold text-[#627069]">
              No. Telepon / WhatsApp
            </Label>
            <Input
              id="customer-phone"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              placeholder="081234567890"
              maxLength={20}
              className="h-10 rounded-xl border-[#dbe5df] bg-white text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="customer-email" className="text-xs font-bold text-[#627069]">
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
          <div className="space-y-1">
            <Label htmlFor="customer-note" className="text-xs font-bold text-[#627069]">
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
          <div className="sm:col-span-2 lg:col-span-4">
            <Button
              type="submit"
              disabled={pendingAction === "add" || !newName.trim()}
              className="h-10 w-full rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] sm:w-48"
            >
              {pendingAction === "add" ? <Loader2 className="size-4 animate-spin" /> : <UserRound className="size-4" />}
              <span>Simpan Pelanggan</span>
            </Button>
          </div>
        </form>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((item) => {
          const isEditing = editingId === item.id;
          const isPending = pendingAction === `edit-${item.id}` || pendingAction === `delete-${item.id}`;

          if (isEditing) {
            return (
              <form
                key={item.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSaveEdit(item.id);
                }}
                className="space-y-2.5 rounded-2xl border border-[#b8d6c7] bg-[#f4faf7] p-4"
              >
                <Input
                  autoFocus
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  maxLength={100}
                  className="h-9 rounded-lg text-sm"
                  placeholder="Nama pelanggan"
                />
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  maxLength={20}
                  className="h-9 rounded-lg text-sm"
                  placeholder="Nomor telepon"
                />
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  maxLength={200}
                  className="h-9 rounded-lg text-sm"
                  placeholder="Email"
                />
                <Input
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  maxLength={500}
                  className="h-9 rounded-lg text-sm"
                  placeholder="Catatan"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="submit"
                    disabled={isPending || !editName.trim()}
                    className="h-9 flex-1 rounded-lg bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
                  >
                    {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>Simpan</span>
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                    className="h-9 flex-1 rounded-lg text-xs font-bold"
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
              className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-4 transition hover:border-[#b8d6c7] hover:shadow-xs"
            >
              <div className="min-w-0">
                <strong className="block truncate text-sm font-bold text-[#15211d]">{item.name}</strong>
                <div className="mt-1.5 space-y-1 text-xs text-[#627069]">
                  {item.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="size-3 text-[#198760]" /> {item.phone}
                    </span>
                  )}
                  {item.email && (
                    <span className="flex items-center gap-1.5 truncate">
                      <Mail className="size-3 text-[#198760]" /> {item.email}
                    </span>
                  )}
                  {item.note && <p className="m-0 line-clamp-2 text-[11px] italic text-[#78857f]">{item.note}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 border-t border-[#eef3f0] pt-2.5">
                <div className="min-w-0 text-[11px] text-[#78857f]">
                  <span className="flex items-center gap-1">
                    <ReceiptText className="size-3" />
                    {item.transactionCount}x · {formatRupiah(item.totalSpent)}
                  </span>
                  <span className="mt-0.5 flex items-center gap-1">
                    Kunjungan terakhir: {formatTanggal(item.lastVisitAt)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    className="rounded-lg border border-[#dbe5df] bg-white px-2 py-1 text-[10px] font-bold text-[#627069] transition hover:border-[#198760] hover:text-[#198760]"
                  >
                    Ubah
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
                      >
                        <Trash2 className="size-3" />
                      </button>
                    }
                  />
                </div>
              </div>
            </div>
          );
        })}

        {filteredCustomers.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-[#dfe8e3] p-10 text-center">
            <Users className="mx-auto size-6 text-[#9aa69f]" />
            <p className="mt-2 text-sm font-semibold text-[#44534c]">
              {query ? "Pelanggan tidak ditemukan" : "Belum ada pelanggan terdaftar"}
            </p>
            <p className="mt-1 text-xs text-[#78857f]">
              {query ? "Coba kata kunci lain." : "Tambahkan pelanggan pertama Anda lewat tombol Tambah Pelanggan."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
