"use client";

import { useState } from "react";

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

export function ProductManager({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [items, setItems] = useState(products);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function save(item: Product) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.message ?? "Produk gagal diperbarui.");
        return;
      }
      setItems((current) => current.map((entry) => entry.id === item.id ? item : entry));
      setEditing(null);
      setMessage(result.message);
    } catch {
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  function update(id: string, patch: Partial<Product>) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const isEditing = editing === item.id;
        return (
          <div key={item.id} className="rounded-xl border border-[#e5eee8] bg-[#f7faf8] p-4">
            {isEditing ? (
              <div className="grid gap-3 md:grid-cols-2">
                <input value={item.name} onChange={(event) => update(item.id, { name: event.target.value })} className="h-10 rounded-lg border border-[#dbe5df] bg-white px-3 text-sm" placeholder="Nama produk" />
                <input value={item.sku ?? ""} onChange={(event) => update(item.id, { sku: event.target.value })} className="h-10 rounded-lg border border-[#dbe5df] bg-white px-3 text-sm" placeholder="SKU" />
                <select value={item.categoryId ?? ""} onChange={(event) => update(item.id, { categoryId: event.target.value || null })} className="h-10 rounded-lg border border-[#dbe5df] bg-white px-3 text-sm">
                  <option value="">Tanpa kategori</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
                <input value={item.sellingPrice} onChange={(event) => update(item.id, { sellingPrice: Number(event.target.value) })} type="number" min="0" className="h-10 rounded-lg border border-[#dbe5df] bg-white px-3 text-sm" placeholder="Harga jual" />
                <input value={item.costPrice} onChange={(event) => update(item.id, { costPrice: Number(event.target.value) })} type="number" min="0" className="h-10 rounded-lg border border-[#dbe5df] bg-white px-3 text-sm" placeholder="Harga modal" />
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.trackStock} onChange={(event) => update(item.id, { trackStock: event.target.checked })} /> Pantau stok</label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={item.isActive} onChange={(event) => update(item.id, { isActive: event.target.checked })} /> Produk aktif</label>
                <div className="flex gap-2 md:col-span-2">
                  <button type="button" disabled={pending} onClick={() => save(item)} className="rounded-lg bg-[#198760] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Simpan</button>
                  <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-[#cfe3d9] px-3 py-2 text-xs font-bold text-[#198760]">Batal</button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><strong className="text-sm">{item.name}</strong><p className="m-0 mt-1 text-xs text-[#627069]">{item.sku ?? "Tanpa SKU"} · Rp {Number(item.sellingPrice).toLocaleString("id-ID")}</p></div>
                <div className="flex items-center gap-2"><span className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.isActive ? "bg-[#eaf7f0] text-[#198760]" : "bg-[#f7e7d7] text-[#a35f12]"}`}>{item.isActive ? "Aktif" : "Nonaktif"}</span><button type="button" onClick={() => setEditing(item.id)} className="rounded-lg border border-[#cfe3d9] px-3 py-2 text-xs font-bold text-[#198760]">Edit</button></div>
              </div>
            )}
          </div>
        );
      })}
      {items.length === 0 && <p className="text-sm text-[#627069]">Belum ada produk.</p>}
      {message && <p className="m-0 text-sm font-semibold text-[#198760]">{message}</p>}
    </div>
  );
}
