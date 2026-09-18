"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Edit,
  Loader2,
  Package,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type DashboardProduct = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  costPrice?: number;
  isActive: boolean;
  categoryId?: string | null;
  categoryName: string | null;
  stockTotal: number;
  trackStock?: boolean;
};

export function DashboardProductTable({
  initialProducts,
  categories,
}: {
  initialProducts: DashboardProduct[];
  categories: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [products, setProducts] = useState<DashboardProduct[]>(initialProducts);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [editingProduct, setEditingProduct] = useState<DashboardProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  }

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      const matchCat =
        selectedCategory === "Semua" || (p.categoryName ?? "Umum") === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [products, search, selectedCategory]);

  const money = (val: number) => `Rp ${Number(val).toLocaleString("id-ID")}`;

  // Toggle active/inactive
  async function toggleStatus(product: DashboardProduct) {
    const nextStatus = !product.isActive;
    try {
      const res = await fetch(`/api/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          sku: product.sku || null,
          categoryId: product.categoryId || null,
          sellingPrice: Number(product.sellingPrice),
          costPrice: Number(product.costPrice || 0),
          trackStock: product.trackStock ?? true,
          isActive: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengubah status.");

      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, isActive: nextStatus } : p))
      );
      notify("success", `Produk "${product.name}" sekarang ${nextStatus ? "Aktif" : "Nonaktif"}.`);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  // Save quick edit modal
  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingProduct.name.trim(),
          sku: editingProduct.sku?.trim() || null,
          categoryId: editingProduct.categoryId || null,
          sellingPrice: Number(editingProduct.sellingPrice),
          costPrice: Number(editingProduct.costPrice || 0),
          trackStock: editingProduct.trackStock ?? true,
          isActive: editingProduct.isActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal memperbarui produk.");

      const updatedCategoryName =
        categories.find((c) => c.id === editingProduct.categoryId)?.name ?? "Umum";

      setProducts((prev) =>
        prev.map((p) =>
          p.id === editingProduct.id
            ? { ...editingProduct, categoryName: updatedCategoryName }
            : p
        )
      );
      setEditingProduct(null);
      notify("success", "Produk berhasil diperbarui!");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Gagal memperbarui produk.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8b9991]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama produk / SKU..."
            className="h-10 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] pl-9 pr-3 text-xs focus:border-[#198760] focus:ring-1 focus:ring-[#198760]"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#627069] hidden sm:inline">Kategori:</span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-10 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-xs font-semibold text-[#15211d] focus:border-[#198760]"
          >
            <option value="Semua">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-bold animate-fade-in ${
            notification.type === "success"
              ? "bg-[#eaf7f0] text-[#198760] border border-[#cae8d9]"
              : "bg-rose-50 text-rose-700 border border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
            <span>{notification.message}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="text-[#627069] hover:text-[#15211d]">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Product Table */}
      <div className="rounded-2xl border border-[#dfe8e3] overflow-hidden">
        <Table>
          <TableHeader className="bg-[#f8faf9]">
            <TableRow className="border-b border-[#edf2ee]">
              <TableHead className="text-xs font-bold text-[#627069]">Produk</TableHead>
              <TableHead className="text-xs font-bold text-[#627069]">Kategori</TableHead>
              <TableHead className="text-xs font-bold text-[#627069]">SKU</TableHead>
              <TableHead className="text-xs font-bold text-[#627069]">Harga Jual</TableHead>
              <TableHead className="text-xs font-bold text-[#627069]">Stok Total</TableHead>
              <TableHead className="text-xs font-bold text-[#627069]">Status</TableHead>
              <TableHead className="text-xs font-bold text-[#627069] text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.slice(0, 8).map((item) => (
                <TableRow key={item.id} className="hover:bg-[#fbfdfc] transition">
                  <TableCell className="font-bold text-xs text-[#15211d]">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-xs text-[#627069]">
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800 border border-emerald-100">
                      {item.categoryName ?? "Umum"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-[#75857e]">
                    {item.sku || "-"}
                  </TableCell>
                  <TableCell className="text-xs font-extrabold text-[#198760]">
                    {money(Number(item.sellingPrice))}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                        Number(item.stockTotal) <= 0
                          ? "bg-rose-100 text-rose-800"
                          : Number(item.stockTotal) <= 5
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-50 text-emerald-800"
                      }`}
                    >
                      {Number(item.stockTotal)} unit
                    </span>
                  </TableCell>
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleStatus(item)}
                      className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-extrabold transition ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                      title="Klik untuk ubah status"
                    >
                      {item.isActive ? "Aktif" : "Nonaktif"}
                    </button>
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(item)}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#dbe5df] bg-white px-2.5 py-1 text-xs font-bold text-[#198760] hover:bg-[#eaf7f0] hover:border-[#198760] transition"
                      title="Edit produk"
                    >
                      <Edit className="size-3" />
                      <span>Edit</span>
                    </button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-xs text-[#627069]">
                  <Package className="mx-auto size-8 text-[#a9bcaf] mb-1" />
                  Tidak ada produk yang sesuai kriteria pencarian.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-[#627069] pt-1">
        <span>Menampilkan {Math.min(filtered.length, 8)} dari {products.length} total produk</span>
        <Button asChild variant="ghost" size="sm" className="text-xs font-bold text-[#198760] hover:bg-[#eaf7f0]">
          <Link href="/products" className="flex items-center gap-1">
            Kelola Lengkap di Halaman Produk <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>

      {/* QUICK EDIT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="absolute right-4 top-4 grid size-7 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] hover:bg-[#dfe8e3]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
                <Edit className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-[#15211d]">Edit Produk</h3>
                <p className="text-xs text-[#627069]">Perbarui detail produk dengan cepat</p>
              </div>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#15211d]">Nama Produk *</Label>
                <Input
                  required
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Kategori</Label>
                  <select
                    value={editingProduct.categoryId ?? ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoryId: e.target.value || null })}
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-medium focus:border-[#198760]"
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
                  <Label className="text-xs font-bold text-[#15211d]">SKU / Barcode</Label>
                  <Input
                    value={editingProduct.sku ?? ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    placeholder="Opsional"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Jual (Rp) *</Label>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="100"
                    value={editingProduct.sellingPrice}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sellingPrice: Number(e.target.value) })}
                    className="h-10 text-xs rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Modal (Rp)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="100"
                    value={editingProduct.costPrice ?? 0}
                    onChange={(e) => setEditingProduct({ ...editingProduct, costPrice: Number(e.target.value) })}
                    className="h-10 text-xs rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#edf2ee] pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="size-4 rounded text-[#198760]"
                  />
                  <span>Status Aktif di Kasir</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-3 py-2 rounded-xl border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] transition"
                  >
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
