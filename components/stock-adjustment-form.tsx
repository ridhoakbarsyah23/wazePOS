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
type StockSetting = {
  outletId: string;
  productId: string;
  currentQuantity: number;
  lowStockThreshold: number;
};

export function StockAdjustmentForm({
  outlets,
  products,
  stockSettings,
  initialOutletId,
  initialProductId,
  showSelectionHint = false,
}: {
  outlets: Option[];
  products: Option[];
  stockSettings: StockSetting[];
  initialOutletId?: string;
  initialProductId?: string;
  showSelectionHint?: boolean;
}) {
  const defaultOutletId = outlets.some((item) => item.id === initialOutletId)
    ? initialOutletId!
    : outlets[0]?.id ?? "";
  const defaultProductId = products.some((item) => item.id === initialProductId)
    ? initialProductId!
    : products[0]?.id ?? "";
  const initialStockSetting = stockSettings.find(
    (item) => item.outletId === defaultOutletId && item.productId === defaultProductId
  );
  const [outletId, setOutletId] = useState(defaultOutletId);
  const [productId, setProductId] = useState(defaultProductId);
  const [quantity, setQuantity] = useState("");
  const [threshold, setThreshold] = useState(String(initialStockSetting?.lowStockThreshold ?? 5));
  const [note, setNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [pending, setPending] = useState(false);
  const currentStockSetting = stockSettings.find(
    (item) => item.outletId === outletId && item.productId === productId,
  );
  const parsedQuantity = Number(quantity);
  const hasValidQuantity = quantity !== "" && Number.isFinite(parsedQuantity) && parsedQuantity >= 0;
  const currentQuantity = currentStockSetting?.currentQuantity ?? 0;
  const quantityDiff = hasValidQuantity ? parsedQuantity - currentQuantity : null;
  const wouldBeLow = hasValidQuantity
    ? parsedQuantity <= Number(threshold || 0)
    : false;

  function syncThreshold(nextOutletId: string, nextProductId: string) {
    const setting = stockSettings.find(
      (item) => item.outletId === nextOutletId && item.productId === nextProductId
    );
    setThreshold(String(setting?.lowStockThreshold ?? 5));
  }

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
    <form onSubmit={submit} className="space-y-5">
      {showSelectionHint && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[#cae8d9] bg-[#f1f8f4] p-3.5 text-sm text-[#106348]">
          <Boxes className="mt-0.5 size-4 shrink-0 text-[#198760]" />
          <div>
            <strong className="block text-xs font-extrabold">Produk siap diperbarui</strong>
            <span className="mt-1 block text-xs leading-5">
              Gerai dan produk telah dipilih. Masukkan jumlah fisik terbaru; nilai ini menggantikan stok sistem, bukan menambahnya.
            </span>
          </div>
        </div>
      )}

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

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="adj-outlet" className="text-xs font-bold flex items-center gap-1.5">
            <Store className="size-3.5 text-[#198760]" /> Gerai
          </Label>
          <select
            id="adj-outlet"
            value={outletId}
            onChange={(event) => {
              const nextOutletId = event.target.value;
              setOutletId(nextOutletId);
              syncThreshold(nextOutletId, productId);
            }}
            className="h-11 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
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
            <Boxes className="size-3.5 text-[#198760]" /> Produk
          </Label>
          <select
            id="adj-product"
            value={productId}
            onChange={(event) => {
              const nextProductId = event.target.value;
              setProductId(nextProductId);
              syncThreshold(outletId, nextProductId);
            }}
            className="h-11 w-full rounded-xl border border-[#dbe5df] bg-white px-3 text-sm font-semibold text-[#15211d] outline-none transition focus:border-[#23a473] focus:ring-4 focus:ring-[#23a473]/10"
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

        <div className="rounded-xl border border-[#dce9e2] bg-[#f7faf8] p-3.5 md:col-span-2">
          <p className="m-0 text-xs font-bold text-[#405148]">
            Stok sistem: {currentStockSetting?.currentQuantity.toLocaleString("id-ID") ?? 0} unit
          </p>
          <p className="m-0 mt-1 text-[11px] leading-4 text-[#71857c]">
            Masukkan hasil perhitungan fisik terbaru. Sistem akan mencatat selisihnya secara otomatis.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adj-quantity" className="text-xs font-bold flex items-center gap-1.5">
            <SlidersHorizontal className="size-3.5 text-[#198760]" /> Stok aktual <span className="text-rose-600">*</span>
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
            autoFocus={showSelectionHint}
          />
          <p className="m-0 text-[11px] leading-4 text-[#82928a]">Jumlah produk yang tersedia saat ini.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="adj-threshold" className="text-xs font-bold flex items-center gap-1.5">
            <AlertTriangle className="size-3.5 text-amber-600" /> Batas stok minimum
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
          <p className="m-0 text-[11px] leading-4 text-[#82928a]">Peringatan muncul saat stok mencapai angka ini.</p>
        </div>

        {quantityDiff !== null && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border p-3.5 md:col-span-2 ${
              quantityDiff === 0
                ? "border-[#dce9e2] bg-[#f7faf8] text-[#405148]"
                : quantityDiff > 0
                  ? "border-[#cae8d9] bg-[#f1f8f4] text-[#106348]"
                  : "border-[#f2d4b9] bg-[#fff0e5] text-[#a35f12]"
            }`}
          >
            {quantityDiff === 0 ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#198760]" />
            ) : (
              <Boxes className="mt-0.5 size-4 shrink-0" />
            )}
            <span className="text-xs font-semibold leading-5">
              {quantityDiff === 0
                ? "Stok aktual sama dengan stok sistem. Tidak ada selisih yang akan dicatat."
                : `Stok akan ${quantityDiff > 0 ? "bertambah" : "berkurang"} ${Math.abs(quantityDiff).toLocaleString("id-ID")} unit menjadi ${parsedQuantity.toLocaleString("id-ID")} unit.`}
              {wouldBeLow && (
                <span className="mt-1 block font-medium">
                  Perhatian: nilai ini berada pada atau di bawah batas stok minimum.
                </span>
              )}
            </span>
          </div>
        )}

        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="adj-note" className="text-xs font-bold flex items-center gap-1.5">
            <FileText className="size-3.5 text-[#198760]" /> Catatan <span className="font-medium text-[#82928a]">(opsional)</span>
          </Label>
          <Input
            id="adj-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={200}
            placeholder="Contoh: Stok opname berkala, retur pemasok, atau barang rusak"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end border-t border-[#edf2ee] pt-4">
        <Button
          type="submit"
          size="sm"
          className="h-11 w-full px-5 sm:w-auto"
          disabled={pending || !outletId || !productId || quantity === ""}
        >
          {pending ? "Menyimpan..." : "Simpan penyesuaian"}
        </Button>
      </div>
    </form>
  );
}
