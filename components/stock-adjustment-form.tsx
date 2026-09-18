"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  FileText,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Option = { id: string; name: string };

export function StockAdjustmentForm({
  outlets,
  products,
}: {
  outlets: Option[];
  products: Option[];
}) {
  const [outletId, setOutletId] = useState(outlets[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState("5");
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setFeedback(null);

    try {
      const response = await fetch("/api/stock/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          productId,
          quantity: Number(quantity),
          lowStockThreshold: Number(threshold),
          note,
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        setFeedback({ type: "error", message: result.message ?? "Penyesuaian stok gagal." });
        return;
      }

      setFeedback({ type: "success", message: result.message ?? "Stok berhasil diperbarui!" });
      setQuantity("");
      setNote("");
      window.setTimeout(() => window.location.reload(), 800);
    } catch {
      setFeedback({ type: "error", message: "Tidak dapat terhubung ke server." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {feedback && (
        <div
          role="status"
          className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-sm font-semibold transition-all ${
            feedback.type === "success"
              ? "border-[#cae8d9] bg-[#eaf7f0] text-[#106348]"
              : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-4 shrink-0 text-[#198760] mt-0.5" />
          ) : (
            <AlertTriangle className="size-4 shrink-0 text-[#a35f12] mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="adj-outlet" className="text-xs font-bold flex items-center gap-1.5">
            <Store className="size-3.5 text-[#198760]" /> Pilih Gerai
          </Label>
          <select
            id="adj-outlet"
            value={outletId}
            onChange={(event) => setOutletId(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
            disabled={pending || outlets.length === 0}
            required
          >
            {outlets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adj-product" className="text-xs font-bold flex items-center gap-1.5">
            <Boxes className="size-3.5 text-[#198760]" /> Pilih Produk
          </Label>
          <select
            id="adj-product"
            value={productId}
            onChange={(event) => setProductId(event.target.value)}
            className="h-10 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
            disabled={pending || products.length === 0}
            required
          >
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adj-quantity" className="text-xs font-bold flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 text-[#198760]" /> Jumlah Stok Aktual *
          </Label>
          <Input
            id="adj-quantity"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            type="number"
            min="0"
            required
            placeholder="0"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adj-threshold" className="text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-600" /> Batas Stok Minimum
          </Label>
          <Input
            id="adj-threshold"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            type="number"
            min="0"
            required
            placeholder="5"
            disabled={pending}
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="adj-note" className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="size-3.5 text-[#198760]" /> Catatan / Keterangan Penyesuaian
          </Label>
          <Input
            id="adj-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="Contoh: Stok opname berkala, retur supplier, barang rusak"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          size="sm"
          disabled={pending || !outletId || !productId || quantity === ""}
        >
          {pending ? "Menyimpan..." : "Simpan Perubahan Stok"}
        </Button>
      </div>
    </form>
  );
}
