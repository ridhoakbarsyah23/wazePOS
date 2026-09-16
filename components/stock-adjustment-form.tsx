"use client";

import { useState } from "react";

type Option = { id: string; name: string };

export function StockAdjustmentForm({ outlets, products }: { outlets: Option[]; products: Option[] }) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outletId, productId, quantity, lowStockThreshold: threshold, note }),
      });
      const result = await response.json();
      setMessage(result.message ?? "Selesai.");
      if (response.ok) window.setTimeout(() => window.location.reload(), 700);
    } catch {
      setMessage("Tidak dapat terhubung ke server.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Gerai
        <select value={outletId} onChange={(event) => setOutletId(event.target.value)} className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3">
          {outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Produk
        <select value={productId} onChange={(event) => setProductId(event.target.value)} className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3">
          {products.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Jumlah stok aktual
        <input value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min="0" required className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d]">Batas stok minimum
        <input value={threshold} onChange={(event) => setThreshold(event.target.value)} type="number" min="0" required className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3" />
      </label>
      <label className="grid gap-2 text-sm font-bold text-[#34443d] md:col-span-2">Catatan
        <input value={note} onChange={(event) => setNote(event.target.value)} maxLength={200} placeholder="Contoh: opname harian" className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3" />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button type="button" onClick={submit} disabled={pending || !outletId || !productId} className="h-11 rounded-xl bg-[#198760] px-4 text-sm font-bold text-white disabled:opacity-50">{pending ? "Menyimpan..." : "Simpan stok"}</button>
        {message && <span className="text-sm font-semibold text-[#198760]">{message}</span>}
      </div>
    </div>
  );
}
