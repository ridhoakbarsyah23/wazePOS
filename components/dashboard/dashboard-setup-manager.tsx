"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Edit2,
  Loader2,
  MapPin,
  Package,
  Plus,
  Settings2,
  Sparkles,
  Store,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryManager, type CategoryItem } from "@/components/catalog/category-manager";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/ui/rupiah-input";

type OutletItem = {
  id: string;
  name: string;
  address: string | null;
};

export function DashboardSetupManager({
  initialCategories,
  initialOutlets,
  showQuickProduct = true,
  showCategories = true,
}: {
  initialCategories: CategoryItem[];
  initialOutlets: OutletItem[];
  showQuickProduct?: boolean;
  showCategories?: boolean;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"category" | "outlet" | "product">(
    showCategories ? "category" : "outlet",
  );

  // State Categories
  const [categories, setCategories] = useState<CategoryItem[]>(initialCategories);

  // State Outlets
  const [outlets, setOutlets] = useState<OutletItem[]>(initialOutlets);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [editingOutletName, setEditingOutletName] = useState("");
  const [editingOutletAddress, setEditingOutletAddress] = useState("");

  // State Quick Product
  const [productForm, setProductForm] = useState({
    name: "",
    sku: "",
    categoryId: "",
    outletId: initialOutlets[0]?.id ?? "",
    sellingPrice: "",
    costPrice: "",
    initialStock: "10",
    lowStockThreshold: "5",
    trackStock: true,
  });

  // Feedback notifications
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  }

  // --- OUTLET ACTIONS ---
  async function handleAddOutlet(e: React.FormEvent) {
    e.preventDefault();
    if (!newOutletName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newOutletName.trim(),
          address: newOutletAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menambahkan gerai.");

      setOutlets((prev) => [...prev, data.outlet].sort((a, b) => a.name.localeCompare(b.name)));
      setNewOutletName("");
      setNewOutletAddress("");
      notify("success", data.message || "Gerai baru berhasil ditambahkan!");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveOutlet(id: string) {
    if (!editingOutletName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/outlets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingOutletName.trim(),
          address: editingOutletAddress.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui gerai.");

      setOutlets((prev) =>
        prev.map((o) =>
          o.id === id
            ? { ...o, name: editingOutletName.trim(), address: editingOutletAddress.trim() || null }
            : o
        )
      );
      setEditingOutletId(null);
      notify("success", "Data gerai berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteOutlet(item: OutletItem) {
    setLoading(true);
    try {
      const res = await fetch(`/api/outlets/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus gerai.");

      setOutlets((prev) => prev.filter((o) => o.id !== item.id));
      notify("success", data.message || "Gerai berhasil dihapus.");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  // --- QUICK PRODUCT CREATE ---
  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const sellingPrice = Number(productForm.sellingPrice);
    const costPrice = Number(productForm.costPrice || 0);

    if (costPrice > sellingPrice) {
      notify("error", "Harga modal tidak boleh melebihi harga jual.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: productForm.name.trim(),
          sku: productForm.sku.trim() || undefined,
          categoryId: productForm.categoryId || null,
          outletId: productForm.outletId || outlets[0]?.id,
          sellingPrice,
          costPrice,
          initialStock: Number(productForm.initialStock || 0),
          lowStockThreshold: Number(productForm.lowStockThreshold || 5),
          trackStock: productForm.trackStock,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menyimpan produk.");

      setProductForm({
        name: "",
        sku: "",
        categoryId: "",
        outletId: outlets[0]?.id ?? "",
        sellingPrice: "",
        costPrice: "",
        initialStock: "10",
        lowStockThreshold: "5",
        trackStock: true,
      });
      notify("success", "Produk baru berhasil ditambahkan ke katalog!");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  // Calculate margin preview
  const sellNum = Number(productForm.sellingPrice) || 0;
  const costNum = Number(productForm.costPrice) || 0;
  const profitNum = sellNum - costNum;
  const marginPct = sellNum > 0 ? Math.round((profitNum / sellNum) * 100) : 0;

  return (
    <section className="rounded-3xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)] transition-all">
      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-[#edf2ee]">
        <div className="flex items-center gap-3.5">
          <div className="grid size-11 place-items-center rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100/80 text-[#198760] shadow-xs border border-emerald-200/60">
            <Settings2 className="size-5.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black tracking-tight text-[#15211d]">
                {showCategories ? "Kelola Master Data Usaha" : "Kelola Gerai"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                <Sparkles className="size-3" /> Cepat &amp; Praktis
              </span>
            </div>
            <p className="mt-0.5 text-xs text-[#627069]">
              {showCategories
                ? showQuickProduct
                  ? "Tambah, perbarui, dan hapus kategori, gerai cabang, serta produk dari satu tempat."
                  : "Tambah, perbarui, dan hapus kategori serta gerai cabang dari satu tempat."
                : "Kelola data gerai cabang dari satu tempat."}
            </p>
          </div>
        </div>

        {/* Tab Pills */}
        <div className="flex w-full max-w-full overflow-x-auto rounded-2xl border border-[#dbe5df] bg-[#f7faf8] p-1 shadow-2xs lg:w-auto">
          {showCategories && (
            <button
              type="button"
              onClick={() => setActiveTab("category")}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                activeTab === "category"
                  ? "bg-white text-[#198760] shadow-sm border border-[#cce4d7]"
                  : "text-[#627069] hover:text-[#15211d]"
              }`}
            >
              <Tag className="size-3.5" />
              <span>Kategori ({categories.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("outlet")}
            className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              activeTab === "outlet"
                ? "bg-white text-[#198760] shadow-sm border border-[#cce4d7]"
                : "text-[#627069] hover:text-[#15211d]"
            }`}
          >
            <Store className="size-3.5" />
            <span>Gerai ({outlets.length})</span>
          </button>

          {showQuickProduct && (
            <button
              type="button"
              onClick={() => setActiveTab("product")}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-black transition-all ${
                activeTab === "product"
                  ? "bg-white text-[#198760] shadow-sm border border-[#cce4d7]"
                  : "text-[#627069] hover:text-[#15211d]"
              }`}
            >
              <Package className="size-3.5" />
              <span>Tambah Produk</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`mt-4 flex items-center justify-between rounded-xl px-4 py-3 text-xs font-bold transition-all animate-fade-in ${
            notification.type === "success"
              ? "bg-[#eaf7f0] text-[#198760] border border-[#cae8d9]"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[#627069] hover:text-[#15211d]"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* TAB CONTENT: KATEGORI */}
      {showCategories && activeTab === "category" && (
        <div className="mt-6">
          <CategoryManager
            compact
            initialCategories={categories}
            onChange={setCategories}
          />
        </div>
      )}

      {/* TAB CONTENT: GERAI */}
      {activeTab === "outlet" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Add Outlet Form */}
          <div className="rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="grid size-7 place-items-center rounded-lg bg-emerald-100/80 text-emerald-800">
                <Building2 className="size-4" />
              </span>
              <h3 className="text-sm font-extrabold text-[#15211d]">Daftarkan Gerai / Cabang</h3>
            </div>
            <form onSubmit={handleAddOutlet} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="outlet-name-input" className="text-xs font-bold text-[#627069]">
                  Nama Gerai / Cabang
                </Label>
                <Input
                  id="outlet-name-input"
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  placeholder="Contoh: Cabang Senopati, Kios 02..."
                  required
                  maxLength={100}
                  className="h-10 text-xs rounded-xl border-[#dbe5df] bg-white"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="outlet-addr-input" className="text-xs font-bold text-[#627069]">
                  Alamat Lengkap (Opsional)
                </Label>
                <Input
                  id="outlet-addr-input"
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  placeholder="Jl. Raya No. 123, Jakarta"
                  maxLength={200}
                  className="h-10 text-xs rounded-xl border-[#dbe5df] bg-white"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !newOutletName.trim()}
                className="w-full h-10 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                <span>Simpan Gerai</span>
              </Button>
            </form>
          </div>

          {/* Outlet List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#627069]">
                Daftar Gerai Usaha ({outlets.length})
              </h3>
              <span className="text-[11px] text-[#627069]">Minimal 1 gerai utama harus aktif</span>
            </div>

            <div className="grid gap-3">
              {outlets.map((item) => {
                const isEditing = editingOutletId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-[#e5ede8] bg-[#fbfdfc] p-4 transition hover:border-[#b8d6c7] hover:shadow-xs"
                  >
                    {isEditing ? (
                      <div className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input
                            value={editingOutletName}
                            onChange={(e) => setEditingOutletName(e.target.value)}
                            placeholder="Nama gerai"
                            className="h-9 text-xs rounded-lg"
                          />
                          <Input
                            value={editingOutletAddress}
                            onChange={(e) => setEditingOutletAddress(e.target.value)}
                            placeholder="Alamat gerai"
                            className="h-9 text-xs rounded-lg"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingOutletId(null)}
                            className="px-3 py-1.5 rounded-lg border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                          >
                            Batal
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveOutlet(item.id)}
                            disabled={loading}
                            className="px-4 py-1.5 rounded-lg bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
                          >
                            Simpan Perubahan
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#198760] shrink-0 border border-emerald-100 mt-0.5">
                            <Store className="size-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#15211d]">{item.name}</h4>
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                Aktif
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-[#627069] flex items-center gap-1">
                              <MapPin className="size-3 text-[#9cb0a5] shrink-0" />
                              <span>{item.address || "Belum ada alamat tertulis"}</span>
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOutletId(item.id);
                              setEditingOutletName(item.name);
                              setEditingOutletAddress(item.address || "");
                            }}
                            className="flex items-center gap-1 rounded-lg border border-[#dbe5df] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#627069] hover:text-[#198760] hover:border-[#198760] transition"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>
                          {outlets.length > 1 && (
                            <ConfirmationDialog
                              title={`Hapus gerai “${item.name}”?`}
                              description="Gerai hanya dapat dihapus jika belum memiliki transaksi. Stok dan riwayat pergerakan pada gerai ini juga akan dihapus."
                              confirmLabel="Hapus gerai"
                              disabled={loading}
                              onConfirm={() => void handleDeleteOutlet(item)}
                              trigger={
                                <button
                                  type="button"
                                  className="grid size-8 place-items-center rounded-lg border border-[#fed7d7] bg-white text-rose-600 hover:bg-rose-50 transition"
                                  title="Hapus gerai"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              }
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: TAMBAH PRODUK CEPAT */}
      {showQuickProduct && activeTab === "product" && (
        <form onSubmit={handleAddProduct} className="mt-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Nama Produk *</Label>
              <Input
                required
                value={productForm.name}
                onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                placeholder="Contoh: Kopi Susu Aren"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Barcode / SKU (Opsional)</Label>
              <Input
                value={productForm.sku}
                onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                placeholder="KSA-001 (untuk barcode scanner)"
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Kategori Menu</Label>
              <select
                value={productForm.categoryId}
                onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-medium text-[#15211d] focus:border-[#198760] focus:ring-1 focus:ring-[#198760]"
              >
                <option value="">Umum (Tanpa Kategori)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Gerai Alokasi Stok Awal</Label>
              <select
                value={productForm.outletId}
                onChange={(e) => setProductForm({ ...productForm, outletId: e.target.value })}
                className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-medium text-[#15211d] focus:border-[#198760] focus:ring-1 focus:ring-[#198760]"
              >
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Harga Jual *</Label>
              <RupiahInput
                required
                value={Number(productForm.sellingPrice) || 0}
                onChange={(value) => setProductForm({ ...productForm, sellingPrice: String(value) })}
                placeholder="20000"
                className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs font-bold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Harga Modal / HPP</Label>
              <RupiahInput
                value={Number(productForm.costPrice) || 0}
                onChange={(value) => setProductForm({ ...productForm, costPrice: String(value) })}
                placeholder="12000"
                className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Jumlah Stok Awal</Label>
              <Input
                type="number"
                min="0"
                value={productForm.initialStock}
                onChange={(e) => setProductForm({ ...productForm, initialStock: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold text-[#15211d]">Batas Minimum Stok (Alert)</Label>
              <Input
                type="number"
                min="0"
                value={productForm.lowStockThreshold}
                onChange={(e) => setProductForm({ ...productForm, lowStockThreshold: e.target.value })}
                className="h-10 text-xs rounded-xl"
              />
            </div>

            {/* Live Margin Calculation Card */}
            <div className="flex flex-col justify-center rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 p-3.5">
              <span className="text-[11px] font-bold text-[#627069]">Estimasi Keuntungan:</span>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-sm font-black text-emerald-800">
                  {sellNum > 0 ? `Rp ${profitNum.toLocaleString("id-ID")}` : "Rp 0"}
                </span>
                <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white">
                  Margin {marginPct}%
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-[#edf2ee] pt-4">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={productForm.trackStock}
                onChange={(e) => setProductForm({ ...productForm, trackStock: e.target.checked })}
                className="size-4 rounded text-[#198760] focus:ring-[#198760]"
              />
              <span className="text-xs font-semibold text-[#15211d]">
                Lacak stok produk otomatis saat kasir bertransaksi
              </span>
            </label>

            <Button
              type="submit"
              disabled={loading || !productForm.name || !productForm.sellingPrice}
              className="h-11 px-6 rounded-xl bg-[#198760] text-xs font-bold text-white shadow-md hover:bg-[#14714f] transition"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              <span>Simpan ke Katalog Produk</span>
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
