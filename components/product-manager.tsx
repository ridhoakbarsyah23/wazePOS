"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  categoryId: string | null;
  sellingPrice: number;
  costPrice: number;
  trackStock: boolean;
  isActive: boolean;
};

type Category = { id: string; name: string };
type Outlet = { id: string; name: string };

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
}: {
  products: Product[];
  categories: Category[];
  outlets: Outlet[];
}) {
  const [items, setItems] = useState(products);
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    ...emptyProduct,
    outletId: outlets[0]?.id ?? "",
  });
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  function updateNewProduct(patch: Partial<typeof emptyProduct>) {
    setNewProduct((current) => ({ ...current, ...patch }));
  }

  async function create() {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          categoryId: newProduct.categoryId || null,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.message ?? "Produk gagal ditambahkan." });
        return;
      }
      window.location.reload();
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  async function save(item: Product) {
    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.message ?? "Produk gagal diperbarui." });
        return;
      }
      setItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
      setEditing(null);
      setMessage({ type: "success", text: result.message });
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  async function remove(item: Product) {
    if (!window.confirm(`Nonaktifkan produk "${item.name}"? Histori transaksi tetap aman.`)) return;

    setPending(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/products/${item.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.message ?? "Produk gagal dinonaktifkan." });
        return;
      }
      setItems((current) =>
        current.map((entry) => (entry.id === item.id ? { ...entry, isActive: false } : entry)),
      );
      setMessage({ type: "success", text: result.message });
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  function update(id: string, patch: Partial<Product>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold">Daftar produk</h2>
          <p className="mt-1 text-sm text-[#627069]">
            Tambah, ubah, atau nonaktifkan menu tanpa menghapus histori transaksi.
          </p>
        </div>
        <Button type="button" size="sm" onClick={() => setCreating((current) => !current)}>
          {creating ? "Tutup Form" : "Tambah Produk"}
        </Button>
      </div>

      {creating && (
        <div className="rounded-xl border border-[#cfe3d9] bg-[#f7faf8] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={newProduct.name}
              onChange={(event) => updateNewProduct({ name: event.target.value })}
              placeholder="Nama produk"
            />
            <Input
              value={newProduct.sku}
              onChange={(event) => updateNewProduct({ sku: event.target.value })}
              placeholder="SKU (opsional)"
            />
            <select
              value={newProduct.categoryId}
              onChange={(event) => updateNewProduct({ categoryId: event.target.value })}
              className="h-11 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm"
            >
              <option value="">Tanpa kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <select
              value={newProduct.outletId}
              onChange={(event) => updateNewProduct({ outletId: event.target.value })}
              className="h-11 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm"
            >
              <option value="" disabled>
                Pilih gerai
              </option>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>
                  {outlet.name}
                </option>
              ))}
            </select>
            <Input
              value={newProduct.sellingPrice}
              onChange={(event) => updateNewProduct({ sellingPrice: Number(event.target.value) })}
              type="number"
              min="0"
              placeholder="Harga jual"
            />
            <Input
              value={newProduct.costPrice}
              onChange={(event) => updateNewProduct({ costPrice: Number(event.target.value) })}
              type="number"
              min="0"
              placeholder="Harga modal"
            />
            <Input
              value={newProduct.initialStock}
              onChange={(event) => updateNewProduct({ initialStock: Number(event.target.value) })}
              type="number"
              min="0"
              placeholder="Stok awal"
            />
            <Input
              value={newProduct.lowStockThreshold}
              onChange={(event) => updateNewProduct({ lowStockThreshold: Number(event.target.value) })}
              type="number"
              min="0"
              placeholder="Batas stok minimum"
            />
            <label className="flex items-center gap-2 text-sm font-semibold md:col-span-2">
              <input
                type="checkbox"
                checked={newProduct.trackStock}
                onChange={(event) => updateNewProduct({ trackStock: event.target.checked })}
              />
              Pantau stok produk ini
            </label>
            <div className="flex gap-2 md:col-span-2">
              <Button type="button" disabled={pending || outlets.length === 0} onClick={create}>
                Simpan Produk
              </Button>
              <Button type="button" variant="outline" onClick={() => setCreating(false)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}

      {items.map((item) => {
        const isEditing = editing === item.id;
        return (
          <div key={item.id} className="rounded-xl border border-[#e5eee8] bg-[#f7faf8] p-4">
            {isEditing ? (
              <div className="grid gap-3 md:grid-cols-2">
                <Input value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} placeholder="Nama produk" />
                <Input value={item.sku ?? ""} onChange={(event) => update(item.id, { sku: event.target.value })} placeholder="SKU" />
                <select value={item.categoryId ?? ""} onChange={(event) => update(item.id, { categoryId: event.target.value || null })} className="h-11 rounded-xl border border-[#dbe5df] bg-white px-3 text-sm">
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <Input value={item.sellingPrice} onChange={(event) => update(item.id, { sellingPrice: Number(event.target.value) })} type="number" min="0" placeholder="Harga jual" />
                <Input value={item.costPrice} onChange={(event) => update(item.id, { costPrice: Number(event.target.value) })} type="number" min="0" placeholder="Harga modal" />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.trackStock} onChange={(event) => update(item.id, { trackStock: event.target.checked })} /> Pantau stok</label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.isActive} onChange={(event) => update(item.id, { isActive: event.target.checked })} /> Produk aktif</label>
                <div className="flex gap-2 md:col-span-2">
                  <Button type="button" disabled={pending} onClick={() => save(item)}>Simpan</Button>
                  <Button type="button" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="text-sm">{item.name}</strong>
                  <p className="m-0 mt-1 text-xs text-[#627069]">
                    {item.sku ?? "Tanpa SKU"} · Rp {Number(item.sellingPrice).toLocaleString("id-ID")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.isActive ? "bg-[#eaf7f0] text-[#198760]" : "bg-[#f7e7d7] text-[#a35f12]"}`}>
                    {item.isActive ? "Aktif" : "Nonaktif"}
                  </span>
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(item.id)}>Edit</Button>
                  {item.isActive && <button type="button" disabled={pending} onClick={() => remove(item)} className="h-9 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-600 disabled:opacity-50">Nonaktifkan</button>}
                </div>
              </div>
            )}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-sm text-[#627069]">Belum ada produk.</p>}
      {message && <p className={`m-0 text-sm font-semibold ${message.type === "error" ? "text-rose-600" : "text-[#198760]"}`}>{message.text}</p>}
    </div>
  );
}
