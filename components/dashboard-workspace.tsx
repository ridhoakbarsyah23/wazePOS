"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  Edit2,
  FolderPlus,
  Loader2,
  LockKeyhole,
  MapPin,
  Package,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Tags,
  Trash2,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import { DashboardSalesChart } from "@/components/dashboard-sales-chart";
import { ShiftPanel } from "@/components/shift-panel";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RupiahInput } from "@/components/ui/rupiah-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type WorkspaceProduct = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  costPrice?: number;
  categoryId?: string | null;
  categoryName: string | null;
  stockTotal: number;
  trackStock?: boolean;
  isActive: boolean;
};

export type WorkspaceCategory = {
  id: string;
  name: string;
  productCount?: number;
};

export type WorkspaceOutlet = {
  id: string;
  name: string;
  address: string | null;
};

export type WorkspaceShift = {
  id: string;
  outletId: string;
  openingCash: number | string;
  openedAt: Date | string;
} | null;

export function DashboardWorkspace({
  chartPoints,
  periodLabel,
  currentTransactions,
  currentShift,
  shiftManagementEnabled,
  initialProducts,
  initialCategories,
  initialOutlets,
  selectedOutletId,
}: {
  chartPoints: Array<{ key: string; label: string; revenue: number; transactions: number }>;
  periodLabel: string;
  currentTransactions: number;
  currentShift: WorkspaceShift | WorkspaceShift[];
  shiftManagementEnabled: boolean;
  initialProducts: WorkspaceProduct[];
  initialCategories: WorkspaceCategory[];
  initialOutlets: WorkspaceOutlet[];
  selectedOutletId: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "products" | "categories" | "outlets">("overview");

  // Master Data States
  const [products, setProducts] = useState<WorkspaceProduct[]>(initialProducts);
  const [categories, setCategories] = useState<WorkspaceCategory[]>(initialCategories);
  const [outlets, setOutlets] = useState<WorkspaceOutlet[]>(initialOutlets);

  // Filter States for Products
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");

  // Modals & Forms
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<WorkspaceProduct | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  const [isAddOutletOpen, setIsAddOutletOpen] = useState(false);
  const [newOutletName, setNewOutletName] = useState("");
  const [newOutletAddress, setNewOutletAddress] = useState("");
  const [editingOutletId, setEditingOutletId] = useState<string | null>(null);
  const [editingOutletName, setEditingOutletName] = useState("");
  const [editingOutletAddress, setEditingOutletAddress] = useState("");

  // Product Add Form State
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

  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function notify(type: "success" | "error", message: string) {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  }

  const money = (val: number) => `Rp ${Number(val).toLocaleString("id-ID")}`;

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = productSearch.trim().toLowerCase();
      const matchSearch =
        !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      const matchCat =
        categoryFilter === "Semua" || (p.categoryName ?? "Umum") === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, productSearch, categoryFilter]);

  // Margin Calculation for Add Product Form
  const sellNum = Number(productForm.sellingPrice) || 0;
  const costNum = Number(productForm.costPrice) || 0;
  const profitNum = sellNum - costNum;
  const marginPct = sellNum > 0 ? Math.round((profitNum / sellNum) * 100) : 0;

  // --- CRUD: PRODUCT ---
  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (costNum > sellNum) {
      notify("error", "Harga modal tidak boleh lebih besar dari harga jual.");
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
          sellingPrice: sellNum,
          costPrice: costNum,
          initialStock: Number(productForm.initialStock || 0),
          lowStockThreshold: Number(productForm.lowStockThreshold || 5),
          trackStock: productForm.trackStock,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat produk.");

      const catName = categories.find((c) => c.id === productForm.categoryId)?.name ?? "Umum";
      const newProd: WorkspaceProduct = {
        id: data.productId || String(Date.now()),
        name: productForm.name.trim(),
        sku: productForm.sku.trim() || null,
        sellingPrice: sellNum,
        costPrice: costNum,
        categoryId: productForm.categoryId || null,
        categoryName: catName,
        stockTotal: Number(productForm.initialStock || 0),
        trackStock: productForm.trackStock,
        isActive: true,
      };

      setProducts((prev) => [newProd, ...prev]);
      setIsAddProductOpen(false);
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
      notify("success", `Produk "${newProd.name}" berhasil ditambahkan ke katalog!`);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleProductStatus(p: WorkspaceProduct) {
    const nextStatus = !p.isActive;
    try {
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: p.name,
          sku: p.sku || null,
          categoryId: p.categoryId || null,
          sellingPrice: Number(p.sellingPrice),
          costPrice: Number(p.costPrice || 0),
          trackStock: p.trackStock ?? true,
          isActive: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengubah status.");

      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, isActive: nextStatus } : item))
      );
      notify("success", `Produk "${p.name}" sekarang ${nextStatus ? "Aktif" : "Nonaktif"}.`);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Gagal mengubah status.");
    }
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProduct) return;

    setLoading(true);
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
        prev.map((item) =>
          item.id === editingProduct.id
            ? { ...editingProduct, categoryName: updatedCategoryName }
            : item
        )
      );
      setEditingProduct(null);
      notify("success", "Detail produk berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Gagal memperbarui produk.");
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD: CATEGORY ---
  async function handleCreateCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal membuat kategori.");

      setCategories((prev) => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCategoryName("");
      notify("success", `Kategori "${data.category.name}" berhasil dibuat!`);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateCategory(id: string) {
    if (!editingCategoryName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCategoryName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal mengubah kategori.");

      setCategories((prev) =>
        prev.map((c) => (c.id === id ? { ...c, name: editingCategoryName.trim() } : c))
      );
      setEditingCategoryId(null);
      notify("success", "Kategori berhasil diperbarui.");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteCategory(item: WorkspaceCategory) {
    setLoading(true);
    try {
      const res = await fetch(`/api/categories/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Gagal menghapus kategori.");

      setCategories((prev) => prev.filter((c) => c.id !== item.id));
      notify("success", data.message || "Kategori berhasil dihapus.");
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  // --- CRUD: OUTLET ---
  async function handleCreateOutlet(e: React.FormEvent) {
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
      if (!res.ok) throw new Error(data.message || "Gagal membuat gerai.");

      setOutlets((prev) => [...prev, data.outlet].sort((a, b) => a.name.localeCompare(b.name)));
      setNewOutletName("");
      setNewOutletAddress("");
      setIsAddOutletOpen(false);
      notify("success", `Gerai "${data.outlet.name}" berhasil didaftarkan!`);
      router.refresh();
    } catch (err) {
      notify("error", err instanceof Error ? err.message : "Terjadi kesalahan.");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateOutlet(id: string) {
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

  async function handleDeleteOutlet(item: WorkspaceOutlet) {
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

  return (
    <div className="space-y-6">
      {/* Navigation Workspace Tabs */}
      <div className="flex flex-col gap-3 border-b border-[#dfe8e3] pb-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:gap-2 lg:flex-wrap" role="tablist" aria-label="Tab workspace dashboard">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-black transition-all sm:px-4 sm:py-2.5 ${
              activeTab === "overview"
                ? "bg-[#198760] text-white shadow-md shadow-emerald-700/20 scale-[1.02]"
                : "bg-white text-[#627069] hover:text-[#15211d] hover:bg-[#f7faf8] border border-transparent"
            }`}
          >
            <TrendingUp className="size-4" />
            <span>Ringkasan &amp; Tren</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-black transition-all sm:px-4 sm:py-2.5 ${
              activeTab === "products"
                ? "bg-[#198760] text-white shadow-md shadow-emerald-700/20 scale-[1.02]"
                : "bg-white text-[#627069] hover:text-[#15211d] hover:bg-[#f7faf8] border border-transparent"
            }`}
          >
            <Package className="size-4" />
            <span>Kelola Produk</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "products" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-black transition-all sm:px-4 sm:py-2.5 ${
              activeTab === "categories"
                ? "bg-[#198760] text-white shadow-md shadow-emerald-700/20 scale-[1.02]"
                : "bg-white text-[#627069] hover:text-[#15211d] hover:bg-[#f7faf8] border border-transparent"
            }`}
          >
            <Tags className="size-4" />
            <span>Kategori Menu</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "categories" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {categories.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outlets")}
            className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-2xl px-3 py-2 text-xs font-black transition-all sm:px-4 sm:py-2.5 ${
              activeTab === "outlets"
                ? "bg-[#198760] text-white shadow-md shadow-emerald-700/20 scale-[1.02]"
                : "bg-white text-[#627069] hover:text-[#15211d] hover:bg-[#f7faf8] border border-transparent"
            }`}
          >
            <Store className="size-4" />
            <span>Gerai Cabang</span>
            <span
              className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeTab === "outlets" ? "bg-white/20 text-white" : "bg-emerald-50 text-emerald-800"
              }`}
            >
              {outlets.length}
            </span>
          </button>
        </div>

        {/* Global Quick Action Trigger */}
        {activeTab === "products" && (
          <Button
            type="button"
            onClick={() => setIsAddProductOpen(true)}
            size="sm"
            className="rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Tambah Produk Baru</span>
          </Button>
        )}

        {activeTab === "outlets" && (
          <Button
            type="button"
            onClick={() => setIsAddOutletOpen(true)}
            size="sm"
            className="rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] shadow-sm"
          >
            <Plus className="size-3.5" />
            <span>Tambah Gerai Baru</span>
          </Button>
        )}
      </div>

      {/* Floating Notification */}
      {notification && (
        <div
          className={`flex items-center justify-between rounded-2xl px-4 py-3 text-xs font-bold shadow-xs animate-fade-in ${
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
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: RINGKASAN & TREN                                      */}
      {/* ============================================================ */}
      {activeTab === "overview" && (
        <div className="grid min-w-0 gap-4 sm:gap-6 xl:grid-cols-[1.6fr_0.9fr]">
          {/* Left: Interactive Sales Chart */}
          <div className="min-w-0 space-y-4 sm:space-y-6">
            <div className="rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#edf2ee]">
                <div>
                  <h3 className="text-sm sm:text-base font-black flex items-center gap-2 text-[#15211d]">
                    <TrendingUp className="size-4 text-[#198760]" />
                    Tren Omzet Penjualan
                  </h3>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-[#627069]">
                    Periode {periodLabel}. Sentuh atau arahkan kursor ke batang grafik untuk melihat rincian omzet.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                  <Check className="size-3 text-emerald-600" />
                  {currentTransactions} transaksi tercatat
                </span>
              </div>
              <div className="pt-4">
                <DashboardSalesChart points={chartPoints} />
              </div>
            </div>

            {/* Top 5 Products Quick Snapshot */}
            <div className="rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center justify-between pb-3 border-b border-[#edf2ee]">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
                    <Package className="size-4" />
                  </div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-[#15211d]">
                    Katalog Produk Teratas ({products.length} item)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[#198760] hover:underline"
                >
                  <span>Buka Kelola Produk</span>
                  <ArrowRight className="size-3" />
                </button>
              </div>

              <div className="mt-3 divide-y divide-[#f0f4f2]">
                {products.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="m-0 text-xs font-bold text-[#15211d]">{p.name}</p>
                      <p className="m-0 text-[11px] text-[#627069]">
                        {p.categoryName ?? "Umum"} · SKU: {p.sku || "-"}
                      </p>
                    </div>
                    <div className="text-right">
                      <strong className="block text-xs font-black text-[#198760]">
                        {money(p.sellingPrice)}
                      </strong>
                      <span className="text-[10px] font-semibold text-[#627069]">
                        Stok {p.stockTotal} unit
                      </span>
                    </div>
                  </div>
                ))}

                {products.length === 0 && (
                  <p className="py-6 text-center text-xs text-[#627069]">
                    Belum ada produk. Tambahkan produk di tab Kelola Produk.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Quick Launchers & Shift Operations */}
          <div className="min-w-0 space-y-4 sm:space-y-6">
            {/* Quick Action Tiles */}
            <div className="rounded-3xl border border-[#dfe8e3] bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-[#198760]" />
                <h3 className="text-sm font-extrabold text-[#15211d]">Aksi Cepat Kasir &amp; Toko</h3>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  href={selectedOutletId === "all" ? "/pos" : `/pos?outlet=${encodeURIComponent(selectedOutletId)}`}
                  className="group flex flex-col justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-emerald-100/30 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-emerald-300"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-[#198760] text-white shadow-xs group-hover:scale-105 transition-transform">
                    <ShoppingCart className="size-4" />
                  </span>
                  <div className="mt-3">
                    <strong className="block text-xs font-bold text-[#15211d] group-hover:text-emerald-800">
                      Kasir POS
                    </strong>
                    <span className="text-[10px] text-[#627069]">Transaksi penjualan</span>
                  </div>
                </Link>

                <button
                  type="button"
                  onClick={() => setActiveTab("products")}
                  className="group text-left flex flex-col justify-between rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-blue-100/30 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-blue-300"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-blue-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Package className="size-4" />
                  </span>
                  <div className="mt-3">
                    <strong className="block text-xs font-bold text-[#15211d] group-hover:text-blue-800">
                      Katalog Menu
                    </strong>
                    <span className="text-[10px] text-[#627069]">Atur produk &amp; harga</span>
                  </div>
                </button>

                <Link
                  href="/inventory"
                  className="group flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-amber-100/30 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-amber-300"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <Warehouse className="size-4" />
                  </span>
                  <div className="mt-3">
                    <strong className="block text-xs font-bold text-[#15211d] group-hover:text-amber-800">
                      Stok Opname
                    </strong>
                    <span className="text-[10px] text-[#627069]">Koreksi stok gerai</span>
                  </div>
                </Link>

                <Link
                  href="/reports"
                  className="group flex flex-col justify-between rounded-2xl border border-purple-200/80 bg-gradient-to-br from-purple-50/70 to-purple-100/30 p-3.5 transition hover:-translate-y-0.5 hover:shadow-md hover:border-purple-300"
                >
                  <span className="grid size-9 place-items-center rounded-xl bg-purple-600 text-white shadow-xs group-hover:scale-105 transition-transform">
                    <BarChart3 className="size-4" />
                  </span>
                  <div className="mt-3">
                    <strong className="block text-xs font-bold text-[#15211d] group-hover:text-purple-800">
                      Laporan
                    </strong>
                    <span className="text-[10px] text-[#627069]">Rekap omzet harian</span>
                  </div>
                </Link>
              </div>
            </div>

            {/* Shift Operational Panel */}
            {shiftManagementEnabled ? (
              <ShiftPanel
                outlets={outlets}
                currentShift={
                  Array.isArray(currentShift)
                    ? currentShift[0]
                      ? {
                          ...currentShift[0],
                          openingCash: Number(currentShift[0].openingCash),
                          openedAt: new Date(currentShift[0].openedAt).toISOString(),
                        }
                      : null
                    : currentShift
                      ? {
                          ...currentShift,
                          openingCash: Number(currentShift.openingCash),
                          openedAt: new Date(currentShift.openedAt).toISOString(),
                        }
                      : null
                }
              />
            ) : (
              <div className="rounded-3xl border border-[#d7e7df] bg-gradient-to-br from-white to-[#f2faf6] p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-[#198760] shrink-0 border border-emerald-100">
                    <LockKeyhole className="size-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#15211d]">Manajemen Shift Kasir</h4>
                    <p className="mt-1 text-xs leading-relaxed text-[#627069]">
                      Tersedia pada Paket Bisnis untuk mengunci saldo kasir awal dan rekap pergantian shift tanpa selisih.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3 h-8 text-xs font-bold">
                      <Link href="/subscription">
                        Upgrade ke Paket Bisnis <ArrowUpRight className="size-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: KELOLA PRODUK (CRUD LENGKAP)                          */}
      {/* ============================================================ */}
      {activeTab === "products" && (
        <div className="space-y-4">
          {/* Toolbar Search & Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-3 shadow-xs">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#8b9991]" />
              <input
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Cari nama produk / kode SKU barcode..."
                className="h-10 w-full rounded-xl border border-[#dbe5df] bg-[#fbfdfc] pl-9 pr-3 text-xs focus:border-[#198760] focus:ring-1 focus:ring-[#198760]"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#627069]">Kategori:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="h-10 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-xs font-bold text-[#15211d] focus:border-[#198760]"
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

          {/* Table Products */}
          <div className="rounded-3xl border border-[#dfe8e3] bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#f8faf9]">
                <TableRow className="border-b border-[#edf2ee]">
                  <TableHead className="text-xs font-bold text-[#627069]">Produk</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">Kategori</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">SKU / Barcode</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">Harga Jual</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">Harga Modal</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">Stok Total</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069]">Status Kasir</TableHead>
                  <TableHead className="text-xs font-bold text-[#627069] text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.length > 0 ? (
                  filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-[#fbfdfc] transition">
                      <TableCell className="font-bold text-xs text-[#15211d]">
                        {p.name}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 border border-emerald-100">
                          {p.categoryName ?? "Umum"}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-[#75857e]">
                        {p.sku || "-"}
                      </TableCell>
                      <TableCell className="text-xs font-black text-[#198760]">
                        {money(p.sellingPrice)}
                      </TableCell>
                      <TableCell className="text-xs text-[#627069]">
                        {p.costPrice ? money(p.costPrice) : "Rp 0"}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-bold ${
                            Number(p.stockTotal) <= 0
                              ? "bg-rose-100 text-rose-800"
                              : Number(p.stockTotal) <= 5
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {Number(p.stockTotal)} unit
                        </span>
                      </TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => handleToggleProductStatus(p)}
                          className={`cursor-pointer rounded-full px-2.5 py-0.5 text-[10px] font-extrabold transition ${
                            p.isActive
                              ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                          title="Klik untuk mengubah status aktif di kasir"
                        >
                          {p.isActive ? "Aktif" : "Nonaktif"}
                        </button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#dbe5df] bg-white px-2.5 py-1 text-xs font-bold text-[#198760] hover:bg-[#eaf7f0] hover:border-[#198760] transition"
                            title="Edit detail produk"
                          >
                            <Edit2 className="size-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-32 text-center text-xs text-[#627069]">
                      <Package className="mx-auto size-8 text-[#a9bcaf] mb-1" />
                      Tidak ada produk yang sesuai dengan pencarian Anda.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 3: KELOLA KATEGORI (CRUD LENGKAP)                        */}
      {/* ============================================================ */}
      {activeTab === "categories" && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          {/* Add Category Card */}
          <div className="rounded-3xl border border-[#dfe8e3] bg-white p-6 shadow-sm h-fit">
            <div className="flex items-center gap-2 mb-4">
              <div className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
                <Plus className="size-4" />
              </div>
              <h3 className="text-sm font-black text-[#15211d]">Tambah Kategori Baru</h3>
            </div>
            <form onSubmit={handleCreateCategory} className="space-y-3.5">
              <div className="space-y-1">
                <Label htmlFor="cat-input" className="text-xs font-bold text-[#627069]">
                  Nama Kategori Menu
                </Label>
                <Input
                  id="cat-input"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Contoh: Coffee, Pastry, Non-Coffee..."
                  required
                  maxLength={80}
                  className="h-10 text-xs rounded-xl"
                />
              </div>
              <Button
                type="submit"
                disabled={loading || !newCategoryName.trim()}
                className="w-full h-10 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
              >
                {loading ? <Loader2 className="size-4 animate-spin" /> : <FolderPlus className="size-4" />}
                <span>Simpan Kategori</span>
              </Button>
            </form>
          </div>

          {/* Categories Grid */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#627069]">
                Kategori Terdaftar ({categories.length})
              </h3>
              <span className="text-[11px] text-[#627069]">Klik pensil untuk ubah nama</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {categories.map((c) => {
                const isEditing = editingCategoryId === c.id;
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-[#dfe8e3] bg-white p-4 shadow-xs hover:border-[#b8d6c7] transition"
                  >
                    {isEditing ? (
                      <div className="flex flex-1 items-center gap-1.5">
                        <Input
                          autoFocus
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCategory(c.id)}
                          disabled={loading}
                          className="grid size-8 place-items-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shrink-0"
                          title="Simpan"
                        >
                          <Check className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          className="grid size-8 place-items-center rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 shrink-0"
                          title="Batal"
                        >
                          <X className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#198760] shrink-0 border border-emerald-100">
                            <Tag className="size-4" />
                          </div>
                          <div className="min-w-0">
                            <strong className="block truncate text-xs font-bold text-[#15211d]">
                              {c.name}
                            </strong>
                            <span className="text-[10px] text-[#627069]">
                              {c.productCount !== undefined ? `${c.productCount} produk terkait` : "Kategori aktif"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(c.id);
                              setEditingCategoryName(c.name);
                            }}
                            className="grid size-8 place-items-center rounded-xl border border-[#dbe5df] bg-white text-[#627069] hover:text-[#198760] hover:border-[#198760] transition"
                            title="Ubah nama kategori"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <ConfirmationDialog
                            title={`Hapus kategori “${c.name}”?`}
                            description="Produk dalam kategori ini akan otomatis dialihkan ke kategori Umum. Tindakan ini tidak dapat dibatalkan."
                            confirmLabel="Hapus kategori"
                            disabled={loading}
                            onConfirm={() => void handleDeleteCategory(c)}
                            trigger={
                              <button
                                type="button"
                                className="grid size-8 place-items-center rounded-xl border border-[#fed7d7] bg-white text-rose-600 hover:bg-rose-50 transition"
                                title="Hapus kategori"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            }
                          />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="col-span-2 rounded-2xl border border-dashed border-[#dfe8e3] p-8 text-center text-xs text-[#627069]">
                  Belum ada kategori menu. Tambahkan kategori pertama Anda di sebelah kiri.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: KELOLA GERAI CABANG (CRUD LENGKAP)                    */}
      {/* ============================================================ */}
      {activeTab === "outlets" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-[#15211d]">Gerai &amp; Cabang Bisnis ({outlets.length})</h3>
              <p className="text-xs text-[#627069]">Atur nama cabang, alamat lokasi, dan akses kasir.</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {outlets.map((o) => {
              const isEditing = editingOutletId === o.id;
              return (
                <div
                  key={o.id}
                  className="rounded-3xl border border-[#dfe8e3] bg-white p-5 shadow-xs transition hover:border-[#b8d6c7]"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-[#627069]">Nama Gerai</Label>
                        <Input
                          value={editingOutletName}
                          onChange={(e) => setEditingOutletName(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-[#627069]">Alamat</Label>
                        <Input
                          value={editingOutletAddress}
                          onChange={(e) => setEditingOutletAddress(e.target.value)}
                          className="h-9 text-xs rounded-xl"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingOutletId(null)}
                          className="px-3 py-1.5 rounded-lg border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateOutlet(o.id)}
                          disabled={loading}
                          className="px-4 py-1.5 rounded-lg bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f]"
                        >
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-[#198760] border border-emerald-100">
                            <Store className="size-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-[#15211d]">{o.name}</h4>
                            <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.2 text-[10px] font-bold text-emerald-800">
                              Gerai Aktif
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingOutletId(o.id);
                              setEditingOutletName(o.name);
                              setEditingOutletAddress(o.address || "");
                            }}
                            className="grid size-8 place-items-center rounded-xl border border-[#dbe5df] text-[#627069] hover:text-[#198760] hover:border-[#198760] transition"
                            title="Edit gerai"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          {outlets.length > 1 && (
                            <ConfirmationDialog
                              title={`Hapus gerai “${o.name}”?`}
                              description="Gerai hanya dapat dihapus jika belum memiliki transaksi. Stok dan riwayat pergerakan pada gerai ini juga akan dihapus."
                              confirmLabel="Hapus gerai"
                              disabled={loading}
                              onConfirm={() => void handleDeleteOutlet(o)}
                              trigger={
                                <button
                                  type="button"
                                  className="grid size-8 place-items-center rounded-xl border border-[#fed7d7] text-rose-600 hover:bg-rose-50 transition"
                                  title="Hapus gerai"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              }
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-[#f0f4f2] text-xs text-[#627069] flex items-start gap-1.5">
                        <MapPin className="size-3.5 text-[#9cb0a5] shrink-0 mt-0.5" />
                        <span>{o.address || "Belum ada alamat spesifik"}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TAMBAH PRODUK BARU                                   */}
      {/* ============================================================ */}
      {isAddProductOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative my-auto w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setIsAddProductOpen(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] hover:bg-[#dfe8e3]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-[#edf2ee]">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-50 text-[#198760]">
                <Package className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#15211d]">Tambah Produk Baru ke Katalog</h3>
                <p className="text-xs text-[#627069]">Masukkan rincian produk, harga, dan alokasi stok awal.</p>
              </div>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs font-bold text-[#15211d]">Nama Produk *</Label>
                  <Input
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Contoh: Kopi Susu Aren Gula Jawa"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Kategori Menu</Label>
                  <select
                    value={productForm.categoryId}
                    onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}
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
                  <Label className="text-xs font-bold text-[#15211d]">Barcode / Kode SKU</Label>
                  <Input
                    value={productForm.sku}
                    onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                    placeholder="KSA-01 (opsional)"
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Jual *</Label>
                  <RupiahInput
                    required
                    value={Number(productForm.sellingPrice) || 0}
                    onChange={(value) => setProductForm({ ...productForm, sellingPrice: String(value) })}
                    placeholder="25000"
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs font-bold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Modal (HPP)</Label>
                  <RupiahInput
                    value={Number(productForm.costPrice) || 0}
                    onChange={(value) => setProductForm({ ...productForm, costPrice: String(value) })}
                    placeholder="15000"
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Gerai Stok Awal</Label>
                  <select
                    value={productForm.outletId}
                    onChange={(e) => setProductForm({ ...productForm, outletId: e.target.value })}
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-xs font-medium focus:border-[#198760]"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
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
              </div>

              {/* Profit Margin Preview Card */}
              <div className="flex items-center justify-between rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/80 to-[#f2faf6] p-3.5">
                <div>
                  <span className="text-[11px] font-bold text-[#627069]">Estimasi Keuntungan:</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-black text-emerald-800">
                      {sellNum > 0 ? money(profitNum) : "Rp 0"}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700">/ porsi/item</span>
                  </div>
                </div>
                <span className="rounded-xl bg-emerald-600 px-2.5 py-1 text-xs font-extrabold text-white shadow-2xs">
                  Margin {marginPct}%
                </span>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#15211d]">
                  <input
                    type="checkbox"
                    checked={productForm.trackStock}
                    onChange={(e) => setProductForm({ ...productForm, trackStock: e.target.checked })}
                    className="size-4 rounded text-[#198760]"
                  />
                  <span>Lacak stok produk otomatis di kasir</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddProductOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !productForm.name || !productForm.sellingPrice}
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] shadow-sm transition"
                  >
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                    <span>Simpan Produk</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: EDIT PRODUK                                          */}
      {/* ============================================================ */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] hover:bg-[#dfe8e3]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#edf2ee]">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
                <Edit2 className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#15211d]">Edit Produk</h3>
                <p className="text-xs text-[#627069]">Perbarui harga, kategori, atau status kasir</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-3.5">
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
                    className="h-10 text-xs rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Jual *</Label>
                  <RupiahInput
                    required
                    value={editingProduct.sellingPrice}
                    onChange={(value) => setEditingProduct({ ...editingProduct, sellingPrice: value })}
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs font-bold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold text-[#15211d]">Harga Modal</Label>
                  <RupiahInput
                    value={editingProduct.costPrice ?? 0}
                    onChange={(value) => setEditingProduct({ ...editingProduct, costPrice: value })}
                    className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-xs text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#edf2ee] pt-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#15211d]">
                  <input
                    type="checkbox"
                    checked={editingProduct.isActive}
                    onChange={(e) => setEditingProduct({ ...editingProduct, isActive: e.target.checked })}
                    className="size-4 rounded text-[#198760]"
                  />
                  <span>Aktif di Kasir POS</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    className="px-3.5 py-2 rounded-xl border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] transition"
                  >
                    {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    <span>Simpan</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: TAMBAH GERAI BARU                                    */}
      {/* ============================================================ */}
      {isAddOutletOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setIsAddOutletOpen(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] hover:bg-[#dfe8e3]"
            >
              <X className="size-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#edf2ee]">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-[#198760]">
                <Building2 className="size-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-[#15211d]">Daftarkan Gerai / Cabang</h3>
                <p className="text-xs text-[#627069]">Buka cabang baru untuk operasional toko Anda.</p>
              </div>
            </div>

            <form onSubmit={handleCreateOutlet} className="space-y-3.5">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#15211d]">Nama Gerai / Cabang *</Label>
                <Input
                  required
                  value={newOutletName}
                  onChange={(e) => setNewOutletName(e.target.value)}
                  placeholder="Contoh: Cabang Senopati, Kios Barat..."
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold text-[#15211d]">Alamat Lengkap</Label>
                <Input
                  value={newOutletAddress}
                  onChange={(e) => setNewOutletAddress(e.target.value)}
                  placeholder="Jl. Raya No. 123 (opsional)"
                  className="h-10 text-xs rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#edf2ee]">
                <button
                  type="button"
                  onClick={() => setIsAddOutletOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-[#dfe8e3] text-xs font-semibold text-[#627069]"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !newOutletName.trim()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] shadow-sm transition"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                  <span>Simpan Gerai</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
