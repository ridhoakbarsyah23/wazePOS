"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Filter,
  Package,
  Pencil,
  Plus,
  PowerOff,
  Search,
  Store,
  Tag,
  TrendingUp,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RupiahInput } from "@/components/ui/rupiah-input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PRODUCTS_PAGE_SIZE, getPageNumbers } from "@/lib/shared/pagination";

export type Product = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  sellingPrice: number;
  costPrice: number;
  trackStock: boolean;
  isActive: boolean;
};

export type Category = { id: string; name: string };
export type Outlet = { id: string; name: string };

const emptyProduct = {
  name: "",
  sku: "",
  categoryId: "",
  outletId: "",
  sellingPrice: 0,
  costPrice: 0,
  initialStock: 0,
  lowStockThreshold: 5,
  trackStock: true,
};

export function ProductManager({
  products,
  categories,
  outlets,
  allowInventory = true,
}: {
  products: Product[];
  categories: Category[];
  outlets: Outlet[];
  allowInventory?: boolean;
}) {
  const [items, setItems] = useState<Product[]>(products);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const [isCreating, setIsCreating] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);

  const [newProduct, setNewProduct] = useState({
    ...emptyProduct,
    outletId: outlets[0]?.id ?? "",
  });

  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [feedbackKey, setFeedbackKey] = useState(0);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FEEDBACK_DURATION_MS = 15_000;

  // Alert tampil 15 detik dengan animasi smooth, lalu menghilang otomatis.
  function showFeedback(type: "success" | "error", message: string) {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setFeedback({ type, message });
    setFeedbackKey((key) => key + 1);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, FEEDBACK_DURATION_MS);
  }

  function dismissFeedback() {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = null;
    setFeedback(null);
  }

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" ||
        (categoryFilter === "uncategorized" && !item.categoryId) ||
        item.categoryId === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && item.isActive) ||
        (statusFilter === "inactive" && !item.isActive);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  const totalPages = Math.max(Math.ceil(filteredItems.length / PRODUCTS_PAGE_SIZE), 1);
  const page = Math.min(currentPage, totalPages);
  const pageItems = filteredItems.slice(
    (page - 1) * PRODUCTS_PAGE_SIZE,
    page * PRODUCTS_PAGE_SIZE,
  );
  const pageNumbers = getPageNumbers(page, totalPages);
  const rangeStart = filteredItems.length === 0 ? 0 : (page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const rangeEnd = rangeStart + pageItems.length - 1;

  // Margin calculation for create form
  const newMargin = useMemo(() => {
    if (newProduct.sellingPrice <= 0) return 0;
    return Math.round(((newProduct.sellingPrice - newProduct.costPrice) / newProduct.sellingPrice) * 100);
  }, [newProduct.sellingPrice, newProduct.costPrice]);

  // Margin calculation for edit form
  const editMargin = useMemo(() => {
    if (!editingItem || editingItem.sellingPrice <= 0) return 0;
    return Math.round(((editingItem.sellingPrice - editingItem.costPrice) / editingItem.sellingPrice) * 100);
  }, [editingItem]);

  function updateNewProduct(patch: Partial<typeof emptyProduct>) {
    setNewProduct((prev) => ({ ...prev, ...patch }));
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setPending(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          categoryId: newProduct.categoryId || null,
          trackStock: allowInventory && newProduct.trackStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback("error", data.message ?? "Produk gagal ditambahkan.");
        return;
      }

      showFeedback("success", data.message ?? "Produk berhasil ditambahkan!");
      setIsCreating(false);
      setNewProduct({
        ...emptyProduct,
        outletId: outlets[0]?.id ?? "",
      });
      setCurrentPage(1);
      // Tambahkan ke list dari respons API agar alert tetap terlihat
      // (window.location.reload() akan menghapus feedback sebelum 15 detik).
      setItems((prev) => [
        {
          id: data.id,
          name: newProduct.name.trim(),
          sku: newProduct.sku.trim() || null,
          categoryId: newProduct.categoryId || null,
          sellingPrice: newProduct.sellingPrice,
          costPrice: newProduct.costPrice,
          trackStock: allowInventory && newProduct.trackStock,
          isActive: true,
        },
        ...prev,
      ]);
    } catch {
      showFeedback("error", "Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingItem) return;

    setFeedback(null);
    setPending(true);

    try {
      const res = await fetch(`/api/products/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editingItem,
          sku: editingItem.sku?.trim() ?? "",
          categoryId: editingItem.categoryId || null,
          trackStock: allowInventory && editingItem.trackStock,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback("error", data.message ?? "Produk gagal diperbarui.");
        return;
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? { ...editingItem, trackStock: allowInventory && editingItem.trackStock }
            : item,
        ),
      );
      setEditingItem(null);
      showFeedback("success", data.message ?? "Produk berhasil diperbarui!");
    } catch {
      showFeedback("error", "Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  async function handleToggleStatus(item: Product) {
    const nextState = !item.isActive;
    setFeedback(null);
    setPending(true);

    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: nextState ? "PATCH" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextState ? { isActive: true } : { confirm: true }),
      });

      const data = await res.json();
      if (!res.ok) {
        showFeedback("error", data.message ?? "Gagal mengubah status produk.");
        return;
      }

      setItems((prev) =>
        prev.map((entry) => (entry.id === item.id ? { ...entry, isActive: nextState } : entry))
      );
      showFeedback("success", data.message);
    } catch {
      showFeedback("error", "Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Alert Feedback */}
      {feedback && (
        <div
          key={feedbackKey}
          role="status"
          aria-live="polite"
          className={`relative flex items-start gap-3 overflow-hidden rounded-2xl border p-4 text-sm font-semibold shadow-sm animate-toast-in ${
            feedback.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
              : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-[#198760]" />
          ) : (
            <AlertTriangle className="size-5 shrink-0 text-[#a35f12]" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={dismissFeedback}
            aria-label="Tutup notifikasi"
            className="shrink-0 rounded-lg p-0.5 opacity-60 transition hover:opacity-100"
          >
            <X className="size-4" />
          </button>
          {/* Progress bar 15 detik */}
          <span
            className="absolute bottom-0 left-0 h-[3px] bg-current opacity-30 animate-progress-15"
            aria-hidden="true"
          />
        </div>
      )}

      {/* Action Header & Search Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold tracking-[-0.6px] text-[#15211d]">
              Katalog Produk ({items.length})
            </h2>
            <Badge variant="outline">
              {items.filter((i) => i.isActive).length} Aktif
            </Badge>
          </div>
          <p className="mt-1 text-xs text-[#627069]">
            Kelola menu, varian SKU, harga jual, dan margin keuntungan gerai Anda.
          </p>
        </div>

        {!allowInventory && (
          <div className="flex items-center gap-2 rounded-xl border border-[#f0dfae] bg-[#fffaf0] px-3 py-2 text-xs text-[#80652a]">
            <AlertTriangle className="size-4 shrink-0 text-[#9a6a12]" />
            Manajemen stok dan peringatan stok menipis tersedia pada Paket Bisnis.
          </div>
        )}

        <Button
          onClick={() => {
            setIsCreating(!isCreating);
            setEditingItem(null);
          }}
          variant={isCreating ? "outline" : "default"}
          size="sm"
        >
          {isCreating ? (
            <>
              <X className="size-4" /> Tutup Form
            </>
          ) : (
            <>
              <Plus className="size-4" /> Tambah Produk
            </>
          )}
        </Button>
      </div>

      {/* Form Tambah Produk Baru */}
      {isCreating && (
        <Card className="border-[#63b792]/40 bg-[#f9fcfa] shadow-sm animate-in fade-in duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="size-4 text-[#198760]" /> Tambah Produk Baru
            </CardTitle>
            <CardDescription className="text-xs">
              Lengkapi detail produk. Produk dapat langsung dijual di kasir setelah disimpan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProduct} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="create-name" className="text-xs font-bold flex items-center gap-1">
                  <Package className="size-3.5 text-[#198760]" /> Nama Produk *
                </Label>
                <Input
                  id="create-name"
                  placeholder="Contoh: Kopi Susu Aren"
                  value={newProduct.name}
                  onChange={(e) => updateNewProduct({ name: e.target.value })}
                  required
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-sku" className="text-xs font-bold flex items-center gap-1">
                  <Tag className="size-3.5 text-[#198760]" /> SKU / Barcode (Opsional)
                </Label>
                <Input
                  id="create-sku"
                  placeholder="Contoh: KSA-001"
                  value={newProduct.sku}
                  onChange={(e) => updateNewProduct({ sku: e.target.value })}
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-category" className="text-xs font-bold flex items-center gap-1">
                  <Tag className="size-3.5 text-[#198760]" /> Kategori
                </Label>
                <select
                  id="create-category"
                  value={newProduct.categoryId}
                  onChange={(e) => updateNewProduct({ categoryId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  disabled={pending}
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-outlet" className="text-xs font-bold flex items-center gap-1">
                  <Store className="size-3.5 text-[#198760]" /> Gerai Awal *
                </Label>
                <select
                  id="create-outlet"
                  value={newProduct.outletId}
                  onChange={(e) => updateNewProduct({ outletId: e.target.value })}
                  className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  disabled={pending}
                  required
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="create-price" className="text-xs font-bold">
                  Harga Jual *
                </Label>
                <RupiahInput
                  id="create-price"
                  value={newProduct.sellingPrice}
                  onChange={(value) => updateNewProduct({ sellingPrice: value })}
                  required
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="create-cost" className="text-xs font-bold">
                    Harga Modal (HPP)
                  </Label>
                  {newProduct.sellingPrice > 0 && (
                    <span className="text-[11px] font-bold text-[#198760] flex items-center gap-1">
                      <TrendingUp className="size-3" /> Margin: {newMargin}%
                    </span>
                  )}
                </div>
                <RupiahInput
                  id="create-cost"
                  value={newProduct.costPrice}
                  onChange={(value) => updateNewProduct({ costPrice: value })}
                  disabled={pending}
                />
              </div>

              {allowInventory && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-stock" className="text-xs font-bold">
                      Stok Awal
                    </Label>
                    <Input
                      id="create-stock"
                      type="number"
                      min="0"
                      placeholder="0"
                      value={newProduct.initialStock || ""}
                      onChange={(e) => updateNewProduct({ initialStock: Number(e.target.value) })}
                      disabled={pending}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="create-threshold" className="text-xs font-bold">
                      Batas Peringatan Stok Minimum
                    </Label>
                    <Input
                      id="create-threshold"
                      type="number"
                      min="0"
                      placeholder="5"
                      value={newProduct.lowStockThreshold || ""}
                      onChange={(e) => updateNewProduct({ lowStockThreshold: Number(e.target.value) })}
                      disabled={pending}
                    />
                  </div>

                  <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="create-track"
                      checked={newProduct.trackStock}
                      onChange={(e) => updateNewProduct({ trackStock: e.target.checked })}
                      className="size-4 rounded text-[#198760] focus:ring-[#198760]"
                      disabled={pending}
                    />
                    <Label htmlFor="create-track" className="text-xs font-bold cursor-pointer text-[#15211d]">
                      Pantau stok produk ini secara otomatis di kasir
                    </Label>
                  </div>
                </>
              )}

              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-[#e2ece6]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCreating(false)}
                  disabled={pending}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={pending || outlets.length === 0}>
                  {pending ? "Menyimpan..." : "Simpan Produk"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Form Edit Produk */}
      {editingItem && (
        <Card className="border-[#198760] bg-[#f7fbf9] shadow-md animate-in fade-in duration-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Pencil className="size-4 text-[#198760]" /> Edit Detail Produk
            </CardTitle>
            <CardDescription className="text-xs">
              Mengubah harga atau nama produk tidak akan merusak riwayat invoice yang sudah dicatat.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProduct} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Nama Produk *</Label>
                <Input
                  value={editingItem.name}
                  onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  required
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">SKU / Barcode</Label>
                <Input
                  value={editingItem.sku ?? ""}
                  onChange={(e) => setEditingItem({ ...editingItem, sku: e.target.value || null })}
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Kategori</Label>
                <select
                  value={editingItem.categoryId ?? ""}
                  onChange={(e) =>
                    setEditingItem({ ...editingItem, categoryId: e.target.value || null })
                  }
                  className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  disabled={pending}
                >
                  <option value="">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Harga Jual *</Label>
                  {editingItem.sellingPrice > 0 && (
                    <span className="text-[11px] font-bold text-[#198760] flex items-center gap-1">
                      <TrendingUp className="size-3" /> Margin: {editMargin}%
                    </span>
                  )}
                </div>
                <RupiahInput
                  value={editingItem.sellingPrice}
                  onChange={(value) =>
                    setEditingItem({ ...editingItem, sellingPrice: value })
                  }
                  required
                  disabled={pending}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Harga Modal (HPP)</Label>
                <RupiahInput
                  value={editingItem.costPrice}
                  onChange={(value) =>
                    setEditingItem({ ...editingItem, costPrice: value })
                  }
                  disabled={pending}
                />
              </div>

              <div className="space-y-3 pt-2">
                {allowInventory && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-track"
                      checked={editingItem.trackStock}
                      onChange={(e) => setEditingItem({ ...editingItem, trackStock: e.target.checked })}
                      className="size-4 rounded text-[#198760] focus:ring-[#198760]"
                      disabled={pending}
                    />
                    <Label htmlFor="edit-track" className="text-xs font-bold cursor-pointer">
                      Pantau stok produk ini
                    </Label>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-active"
                    checked={editingItem.isActive}
                    onChange={(e) => setEditingItem({ ...editingItem, isActive: e.target.checked })}
                    className="size-4 rounded text-[#198760] focus:ring-[#198760]"
                    disabled={pending}
                  />
                  <Label htmlFor="edit-active" className="text-xs font-bold cursor-pointer">
                    Produk aktif untuk dijual
                  </Label>
                </div>
              </div>

              <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t border-[#e2ece6]">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                  disabled={pending}
                >
                  Batal
                </Button>
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter & Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#71857c]" />
              <Input
                placeholder="Cari nama produk atau SKU..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <Tag className="size-3.5 text-[#627069]" />
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#15211d] outline-none"
                >
                  <option value="all">Semua Kategori</option>
                  <option value="uncategorized">Tanpa Kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <Filter className="size-3.5 text-[#627069]" />
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as "all" | "active" | "inactive");
                    setCurrentPage(1);
                  }}
                  className="h-10 rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#15211d] outline-none"
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif Saja</option>
                  <option value="inactive">Nonaktif Saja</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-bold">Produk</TableHead>
                <TableHead className="font-bold">Kategori</TableHead>
                <TableHead className="text-right font-bold">Harga Jual</TableHead>
                <TableHead className="text-right font-bold">Harga Modal</TableHead>
                {allowInventory && <TableHead className="text-center font-bold">Stok</TableHead>}
                <TableHead className="text-center font-bold">Status</TableHead>
                <TableHead className="text-right font-bold">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((item) => {
                const categoryName = item.categoryId ? categoryMap.get(item.categoryId) : null;
                const margin =
                  item.sellingPrice > 0
                    ? Math.round(((item.sellingPrice - item.costPrice) / item.sellingPrice) * 100)
                    : 0;

                return (
                  <TableRow key={item.id} className={!item.isActive ? "bg-slate-50/60 opacity-75" : ""}>
                    <TableCell>
                      <div>
                        <span className="font-bold text-[#15211d]">{item.name}</span>
                        {item.sku ? (
                          <div className="mt-0.5">
                            <span className="inline-block rounded bg-[#f0f4f1] px-1.5 py-0.5 font-mono text-[10px] text-[#52645c]">
                              {item.sku}
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell>
                      {categoryName ? (
                        <Badge variant="outline" className="font-normal text-xs">
                          {categoryName}
                        </Badge>
                      ) : (
                        <span className="text-xs text-[#95a59e]">-</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right font-bold text-[#15211d]">
                      Rp {Number(item.sellingPrice).toLocaleString("id-ID")}
                    </TableCell>

                    <TableCell className="text-right">
                      <span className="text-xs text-[#627069]">
                        Rp {Number(item.costPrice).toLocaleString("id-ID")}
                      </span>
                      {margin > 0 && (
                        <div className="mt-0.5">
                          <span className="text-[10px] font-bold text-[#198760]">
                            +{margin}%
                          </span>
                        </div>
                      )}
                    </TableCell>

                    {allowInventory && (
                      <TableCell className="text-center">
                        {item.trackStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7f0] px-2 py-0.5 text-[11px] font-bold text-[#198760]">
                            <Boxes className="size-3" /> Dipantau
                          </span>
                        ) : (
                          <span className="text-xs text-[#95a59e]">Manual</span>
                        )}
                      </TableCell>
                    )}

                    <TableCell className="text-center">
                      <Badge variant={item.isActive ? "default" : "secondary"}>
                        {item.isActive ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setIsCreating(false);
                          }}
                          className="h-8 px-2 text-xs text-[#198760] hover:bg-[#eaf7f0]"
                          title="Edit produk"
                        >
                          <Pencil className="size-3.5" />
                        </Button>

                        <ConfirmationDialog
                          title={`${item.isActive ? "Nonaktifkan" : "Aktifkan kembali"} produk “${item.name}”?`}
                          description={
                            item.isActive
                              ? "Produk tidak akan tampil di kasir, tetapi histori transaksi tetap aman."
                              : "Produk akan kembali tersedia di katalog dan dapat ditampilkan di kasir."
                          }
                          confirmLabel={item.isActive ? "Nonaktifkan produk" : "Aktifkan produk"}
                          destructive={item.isActive}
                          disabled={pending}
                          onConfirm={() => void handleToggleStatus(item)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={pending}
                              className={`h-8 px-2 text-xs ${
                                item.isActive
                                  ? "text-rose-600 hover:bg-rose-50"
                                  : "text-emerald-700 hover:bg-emerald-50"
                              }`}
                              title={item.isActive ? "Nonaktifkan produk" : "Aktifkan produk"}
                            >
                              <PowerOff className="size-3.5" />
                            </Button>
                          }
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={allowInventory ? 7 : 6} className="py-10 text-center text-[#627069]">
                    <Package className="mx-auto size-8 text-[#95a59e] mb-2" />
                    <p className="font-semibold text-sm">Tidak ada produk ditemukan.</p>
                    <p className="text-xs text-[#82928a] mt-1">
                      {searchQuery || categoryFilter !== "all" || statusFilter !== "all"
                        ? "Coba ubah kata kunci pencarian atau filter Anda."
                        : "Klik 'Tambah Produk' untuk mendaftarkan menu perdana gerai Anda."}
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {filteredItems.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-[#e2ece6] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="m-0 text-xs text-[#71857c]">
              Menampilkan <span className="font-semibold text-[#405148]">{rangeStart}&ndash;{rangeEnd}</span> dari{" "}
              <span className="font-semibold text-[#405148]">{filteredItems.length}</span> produk
            </p>
            <nav className="flex flex-wrap items-center gap-1" aria-label="Navigasi halaman produk">
              <button
                type="button"
                onClick={() => setCurrentPage(page - 1)}
                disabled={page === 1}
                className="inline-flex h-8 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] transition hover:border-[#198760] hover:text-[#198760] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sebelumnya
              </button>
              {pageNumbers.map((item, index) =>
                item === "ellipsis" ? (
                  <span key={`ellipsis-${index}`} className="px-1 text-xs text-[#95a59e]">
                    &hellip;
                  </span>
                ) : item === page ? (
                  <span
                    key={item}
                    aria-current="page"
                    className="grid size-8 place-items-center rounded-lg bg-[#eaf7f0] text-xs font-bold text-[#198760]"
                  >
                    {item}
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className="grid size-8 place-items-center rounded-lg text-xs font-semibold text-[#627069] transition hover:bg-[#f0f7f3] hover:text-[#198760]"
                    aria-label={`Buka halaman produk ${item}`}
                  >
                    {item}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setCurrentPage(page + 1)}
                disabled={page === totalPages}
                className="inline-flex h-8 items-center rounded-lg border border-[#dbe5df] bg-white px-3 text-xs font-semibold text-[#52645c] transition hover:border-[#198760] hover:text-[#198760] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Berikutnya
              </button>
            </nav>
          </div>
        )}
      </Card>
    </div>
  );
}
