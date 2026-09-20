"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { calculateCartTotal, calculatePayment, getQuickCashOptions } from "@/lib/pos-calculations";
import { filterPosProducts, getProductStockIssue, resolveProductEntry } from "@/lib/pos-product-search";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  QrCode,
  ScanBarcode,
  Sparkles,
} from "lucide-react";
import { ReceiptModal } from "./receipt-modal";
import { ReceiptShareData } from "./whatsapp-share-button";


type PosProduct = {
  id: string;
  name: string;
  sku: string | null;
  sellingPrice: number;
  categoryName: string | null;
  stock: number;
  trackStock: boolean;
};

type PosOutlet = { id: string; name: string };
type CartItem = PosProduct & { quantity: number };

const money = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

export function PosTerminal({
  products,
  outlets,
  initialOutletId,
  allowNonCashPayments,
  allowQrisPayments,
  checkoutDisabledReason,
  businessName = "wazePOS Store",
}: {
  products: PosProduct[];
  outlets: PosOutlet[];
  initialOutletId: string;
  allowNonCashPayments: boolean;
  allowQrisPayments: boolean;
  checkoutDisabledReason: string | null;
  businessName?: string;
}) {
  const outletId = initialOutletId;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "qris" | "debit" | "credit">("cash");
  const [paidAmount, setPaidAmount] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<(ReceiptShareData & { cashierName?: string }) | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);


  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((item) => item.categoryName ?? "Umum"))).sort()],
    [products],
  );

  const filteredProducts = filterPosProducts(products, search, categoryFilter);

  const total = calculateCartTotal(cart);
  const { paid, change, shortfall } = calculatePayment(total, paymentMethod, paidAmount);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const quickCashOptions = getQuickCashOptions(total);

  const addProduct = useCallback((product: PosProduct) => {
    const quantityInCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;
    const stockIssue = getProductStockIssue(product, quantityInCart);
    if (stockIssue === "out-of-stock") {
      setMessage({ type: "error", text: `Stok produk ${product.name} sudah habis.` });
      return false;
    }
    if (stockIssue === "stock-limit") {
      setMessage({ type: "error", text: `Jumlah ${product.name} di keranjang sudah mencapai stok tersedia.` });
      return false;
    }

    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1 }];
    });
    setMessage(null);
    return true;
  }, [cart]);

  const addProductFromEntry = useCallback((rawValue: string) => {
    const resolved = resolveProductEntry(products, rawValue);
    if (!resolved) {
      const resultCount = filterPosProducts(products, rawValue, "Semua").length;
      setMessage({
        type: "error",
        text:
          resultCount > 1
            ? `Ditemukan ${resultCount} produk. Ketik SKU lengkap atau perjelas pencarian.`
            : `Produk dengan kode atau pencarian "${rawValue.trim()}" tidak ditemukan.`,
      });
      return;
    }

    if (addProduct(resolved.product)) {
      setSearch("");
      setCategoryFilter("Semua");
      setMessage({
        type: "success",
        text: `${resolved.match === "code" ? "SKU dipindai" : "Produk ditambahkan"}: ${resolved.product.name} (+1)`,
      });
    }
  }, [addProduct, products]);

  function updateQuantity(id: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === id ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }

  async function completeSale() {
    if (!outletId || cart.length === 0) {
      setMessage({ type: "error", text: "Pilih gerai dan tambahkan produk ke keranjang." });
      return;
    }
    if (checkoutDisabledReason) {
      setMessage({ type: "error", text: checkoutDisabledReason });
      return;
    }
    if (paymentMethod === "qris" && !allowQrisPayments) {
      setPaymentMethod("cash");
      setMessage({
        type: "error",
        text: "QRIS belum tersedia sampai integrasi pembayaran resmi selesai.",
      });
      return;
    }
    if (paid < total) {
      setMessage({ type: "error", text: "Pembayaran masih kurang dari total transaksi." });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outletId,
          paymentMethod,
          paidAmount: paid,
          items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage({ type: "error", text: result.message ?? "Transaksi gagal." });
        return;
      }
      const completedItems = cart.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.sellingPrice,
        subtotal: item.sellingPrice * item.quantity,
      }));
      const activeOutletName = outlets.find((o) => o.id === outletId)?.name ?? "Kasir";

      setCompletedReceipt({
        businessName,
        outletName: activeOutletName,
        invoiceNumber: result.invoiceNumber,
        createdAt: new Date(),
        items: completedItems,
        subtotal: total,
        total: result.total ?? total,
        paidAmount: paid,
        changeAmount: result.changeAmount ?? (paid - total),
        paymentMethod,
        saleId: result.saleId,
      });
      setShowReceiptModal(true);

      setMessage({
        type: "success",
        text:
          paymentMethod === "qris"
            ? "Pembayaran QRIS berhasil dikonfirmasi (Lunas)."
            : `Transaksi berhasil. Kembalian ${money(result.changeAmount)}.`,
      });
      setInvoiceId(result.saleId);
      setCart([]);
      setPaidAmount("");
    } catch {
      setMessage({ type: "error", text: "Tidak dapat terhubung ke server." });
    } finally {
      setIsSubmitting(false);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        activeEl?.tagName === "SELECT";

      if (showReceiptModal && e.key !== "Escape") return;

      // F2: Focus Search Bar
      if (e.key === "F2") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // /: Focus Search Bar when not already typing in an input
      if (e.key === "/" && !isInputActive) {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // F4: Switch Payment Method
      if (e.key === "F4") {
        e.preventDefault();
        setPaymentMethod((prev) => {
          if (prev === "cash") {
            if (allowQrisPayments) return "qris";
            return allowNonCashPayments ? "debit" : "cash";
          }
          if (prev === "qris") return allowNonCashPayments ? "debit" : "cash";
          if (prev === "debit") return "credit";
          return "cash";
        });
        return;
      }

      // F9: Quick Exact Cash
      if (e.key === "F9") {
        e.preventDefault();
        if (cart.length > 0) {
          setPaymentMethod("cash");
          setPaidAmount(String(total));
        }
        return;
      }

      // Space: Exact Cash (if in cash mode and not typing in an input)
      if (e.key === " " && !isInputActive && cart.length > 0) {
        e.preventDefault();
        if (paymentMethod === "cash") {
          setPaidAmount(String(total));
        }
        return;
      }

      // Escape: Close receipt modal, clear search, or clear cart
      if (e.key === "Escape") {
        if (showReceiptModal) {
          e.preventDefault();
          setShowReceiptModal(false);
          return;
        }
        if (search.length > 0) {
          e.preventDefault();
          setSearch("");
          return;
        }
        if (cart.length > 0) {
          e.preventDefault();
          setCart([]);
          setMessage({ type: "success", text: "Keranjang belanja telah dikosongkan." });
          return;
        }
      }

      // Hardware Barcode Scanner logic (rapid key stream ending with Enter)
      const now = Date.now();
      if (e.key === "Enter") {
        if (isInputActive) {
          barcodeBufferRef.current = "";
          return;
        }

        const scannedCode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";

        if (scannedCode.length >= 2) {
          e.preventDefault();
          addProductFromEntry(scannedCode);
        }
        return;
      }

      // Buffer karakter scanner hanya ketika kasir tidak sedang mengisi input lain.
      if (!isInputActive && e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (now - lastKeyTimeRef.current > 150) {
          barcodeBufferRef.current = "";
        }
        barcodeBufferRef.current += e.key;
        lastKeyTimeRef.current = now;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart, total, allowNonCashPayments, allowQrisPayments, paymentMethod, showReceiptModal, search, addProductFromEntry]);

  return (
    <div className="space-y-4">
      {/* Shortcut & Hardware Scanner Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#dfe8e3] bg-white px-4 py-2.5 text-xs text-[#627069] shadow-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5 font-bold text-[#15211d]">
            <kbd className="rounded-md border border-[#cddbd3] bg-[#f7faf8] px-1.5 py-0.5 font-mono text-[10px] text-[#198760] shadow-2xs">F2 / /</kbd>
            <span>Cari Produk</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 font-bold text-[#15211d]">
            <kbd className="rounded-md border border-[#cddbd3] bg-[#f7faf8] px-1.5 py-0.5 font-mono text-[10px] text-[#198760] shadow-2xs">F4</kbd>
            <span>Ganti Pembayaran</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#15211d]">
            <kbd className="rounded-md border border-[#cddbd3] bg-[#f7faf8] px-1.5 py-0.5 font-mono text-[10px] text-[#198760] shadow-2xs">F9 / Space</kbd>
            <span>Uang Pas</span>
          </div>
          <div className="hidden md:flex items-center gap-1.5 font-bold text-[#15211d]">
            <kbd className="rounded-md border border-[#cddbd3] bg-[#f7faf8] px-1.5 py-0.5 font-mono text-[10px] text-[#198760] shadow-2xs">Esc</kbd>
            <span>Bersihkan / Batal</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          <ScanBarcode className="size-3.5 text-emerald-700" />
          <span>Mode Scanner Aktif</span>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        <section className="min-w-0 rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
          <div className="flex flex-wrap items-center gap-3">
            <label className="grid flex-1 gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#627069]">
              Gerai aktif
              <select
                value={outletId}
                disabled
                className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-sm font-semibold normal-case tracking-normal text-[#15211d] disabled:opacity-100"
              >
                {outlets.map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid flex-[2] gap-1 text-xs font-bold uppercase tracking-[0.08em] text-[#627069]">
              Cari produk
              <input
                ref={searchInputRef}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter") return;
                  event.preventDefault();
                  event.stopPropagation();
                  addProductFromEntry(event.currentTarget.value);
                }}
                placeholder="Ketik nama atau scan SKU, lalu Enter... [F2]"
                aria-label="Cari produk berdasarkan nama atau SKU"
                className="h-11 rounded-xl border border-[#dbe5df] bg-[#fbfdfc] px-3 text-sm font-normal normal-case tracking-normal text-[#15211d] focus:border-[#198760] focus:outline-hidden focus:ring-1 focus:ring-[#198760]"
              />
            </label>
          </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((category) => (
            <button
              type="button"
              key={category}
              onClick={() => setCategoryFilter(category)}
              className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold transition-colors ${
                categoryFilter === category ? "bg-[#198760] text-white" : "bg-[#eef7f2] text-[#198760] hover:bg-[#e2f2e9]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const unavailable = product.trackStock && product.stock < 1;
            return (
              <button
                type="button"
                disabled={unavailable}
                key={product.id}
                onClick={() => addProduct(product)}
                className="rounded-xl border border-[#e4ece7] bg-[#fbfdfc] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#8cc9aa] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#198760]">
                  {product.categoryName ?? "Umum"}
                </span>
                <strong className="mt-2 block text-sm text-[#15211d]">{product.name}</strong>
                <span className="mt-2 block text-sm font-bold text-[#198760]">{money(product.sellingPrice)}</span>
                <span className="mt-1 block text-xs text-[#627069]">
                  {product.trackStock ? `Stok ${product.stock}` : "Stok tidak dilacak"}
                </span>
              </button>
            );
          })}
        </div>
        {filteredProducts.length === 0 && (
          <p className="mt-6 rounded-xl bg-[#f7faf8] p-5 text-sm text-[#627069]">Produk tidak ditemukan.</p>
        )}
      </section>

      <aside className="h-fit rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_24px_rgba(16,65,48,.06)]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Keranjang</h2>
          <span className="rounded-full bg-[#eaf7f0] px-2.5 py-1 text-xs font-bold text-[#198760]">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} item
          </span>
        </div>

        <div className="mt-4 space-y-3">
          {cart.map((item) => (
            <div key={item.id} className="rounded-xl border border-[#edf2ee] bg-[#f7faf8] p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <strong className="text-sm">{item.name}</strong>
                  <p className="m-0 mt-1 text-xs text-[#627069]">{money(item.sellingPrice)} / item</p>
                </div>
                <strong className="text-sm">{money(item.sellingPrice * item.quantity)}</strong>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  className="h-8 w-8 rounded-lg bg-white text-lg font-bold text-[#198760]"
                >
                  -
                </button>
                <span className="min-w-6 text-center text-sm font-bold">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  disabled={item.trackStock && item.quantity >= item.stock}
                  className="h-8 w-8 rounded-lg bg-white text-lg font-bold text-[#198760] disabled:opacity-40"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, 0)}
                  className="ml-auto text-xs font-bold text-[#a35f12]"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
          {cart.length === 0 && (
            <p className="rounded-xl border border-dashed border-[#dfe8e3] p-5 text-sm text-[#627069]">
              Keranjang masih kosong.
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-[#e7efea] pt-4">
          <div className="flex justify-between text-sm text-[#627069]">
            <span>Subtotal</span>
            <strong className="text-[#15211d]">{money(total)}</strong>
          </div>
          <div className="mt-2 flex justify-between text-lg font-extrabold">
            <span>Total</span>
            <span className="text-[#198760]">{money(total)}</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-[0.08em] text-[#627069]">
              Metode Pembayaran
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#198760]">
              <Sparkles className="size-3" /> Siap Digunakan
            </span>
          </div>

          {checkoutDisabledReason && (
            <p className="m-0 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm font-semibold text-amber-800">
              {checkoutDisabledReason}
            </p>
          )}

          {/* Payment Method Selector Pills */}
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#eef4f1] p-1 border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => {
                setPaymentMethod("cash");
                setMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-extrabold transition ${
                paymentMethod === "cash"
                  ? "bg-white text-[#198760] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#cbe0d4]"
                  : "text-[#627069] hover:text-[#15211d]"
              }`}
            >
              <Banknote className="size-4" />
              <span>Tunai (Cash)</span>
            </button>
            <button
              type="button"
              disabled={!allowQrisPayments}
              onClick={() => {
                if (!allowQrisPayments) return;
                setPaymentMethod("qris");
                setMessage(null);
              }}
              title={
                allowQrisPayments
                  ? "Gunakan pembayaran QRIS"
                  : "Menunggu integrasi penyedia pembayaran resmi"
              }
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-extrabold transition ${
                paymentMethod === "qris"
                  ? "bg-white text-[#198760] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#cbe0d4]"
                  : allowQrisPayments
                    ? "text-[#627069] hover:text-[#15211d]"
                    : "cursor-not-allowed text-[#94a39c] opacity-70"
              }`}
            >
              <QrCode className="size-4" />
              <span>{allowQrisPayments ? "QRIS Digital" : "QRIS Belum Tersedia"}</span>
            </button>
          </div>

          {/* Optional Debit/Credit toggle if plan allows */}
          {allowNonCashPayments && (
            <div className="flex items-center justify-end gap-2 text-xs text-[#627069]">
              <span className="text-[11px]">Opsi kartu:</span>
              <button
                type="button"
                onClick={() => setPaymentMethod("debit")}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                  paymentMethod === "debit"
                    ? "bg-[#198760] text-white border-[#198760]"
                    : "bg-white border-[#dfe8e3] text-[#627069]"
                }`}
              >
                Debit
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("credit")}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold border ${
                  paymentMethod === "credit"
                    ? "bg-[#198760] text-white border-[#198760]"
                    : "bg-white border-[#dfe8e3] text-[#627069]"
                }`}
              >
                Kredit
              </button>
            </div>
          )}

          {/* TUNAI MODE */}
          {paymentMethod === "cash" && (
            <div className="space-y-3 rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-3.5">
              <label className="grid gap-1 text-xs font-bold text-[#15211d]">
                <span>Uang Diterima dari Pembeli</span>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-bold text-[#627069]">Rp</span>
                  <input
                    value={paidAmount}
                    onChange={(event) => setPaidAmount(event.target.value)}
                    type="number"
                    min="0"
                    max="2000000000"
                    placeholder="0"
                    className="h-11 w-full rounded-xl border border-[#dbe5df] bg-white pl-10 pr-3 text-sm font-bold text-[#15211d] focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/20"
                  />
                </div>
              </label>

              {/* Quick Cash Presets */}
              {total > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-[#627069]">Pilihan Uang Cepat:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickCashOptions.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => setPaidAmount(String(amount))}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-bold transition ${
                          Number(paidAmount) === amount
                            ? "bg-[#198760] text-white border-[#198760]"
                            : "bg-white border-[#dbe5df] text-[#15211d] hover:border-[#198760] hover:bg-[#f0f8f4]"
                        }`}
                      >
                        {amount === total ? `Uang Pas (${money(amount)})` : money(amount)}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setPaidAmount((curr) => String((Number(curr) || 0) + 10_000))}
                      className="rounded-lg border border-[#dbe5df] bg-white px-2 py-1 text-xs font-bold text-[#627069] hover:text-[#198760]"
                    >
                      +10rb
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaidAmount((curr) => String((Number(curr) || 0) + 50_000))}
                      className="rounded-lg border border-[#dbe5df] bg-white px-2 py-1 text-xs font-bold text-[#627069] hover:text-[#198760]"
                    >
                      +50rb
                    </button>
                  </div>
                </div>
              )}

              {/* Kembalian / Status Pembayaran */}
              {paid > 0 && (
                <div
                  className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-sm font-bold ${
                    paid >= total
                      ? "bg-[#eaf7f0] text-[#198760] border border-[#cae8d9]"
                      : "bg-[#fff3ea] text-[#c25e1a] border border-[#fed7aa]"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {paid >= total ? <CheckCircle2 className="size-4" /> : <AlertCircle className="size-4" />}
                    <span>{paid >= total ? "Kembalian Kasir" : "Pembayaran Kurang"}</span>
                  </span>
                  <span className="text-base">{money(paid >= total ? change : shortfall)}</span>
                </div>
              )}
            </div>
          )}

          {/* DEBIT / CREDIT CARD MODE */}
          {(paymentMethod === "debit" || paymentMethod === "credit") && (
            <div className="rounded-2xl border border-[#dfe8e3] bg-[#fafcfb] p-4 text-xs text-[#627069] space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#15211d]">
                <CreditCard className="size-4 text-[#198760]" />
                <span className="capitalize">Mesin EDC / Kartu {paymentMethod}</span>
              </div>
              <p className="m-0 leading-5">
                Gesek atau tap kartu di mesin EDC gerai dengan nominal sesuai tagihan:
                <strong className="text-[#198760] ml-1">{money(total)}</strong>.
              </p>
            </div>
          )}

          {/* Notification Messages */}
          {message && (
            <p
              className={`m-0 rounded-xl px-3.5 py-3 text-sm font-semibold flex items-center gap-2 ${
                message.type === "success"
                  ? "bg-[#eaf7f0] text-[#198760] border border-[#cae8d9]"
                  : "bg-[#fff0e5] text-[#a35f12] border border-[#fed7aa]"
              }`}
            >
              {message.type === "success" ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
              <span>{message.text}</span>
            </p>
          )}

          {invoiceId && (
            <a
              href={`/sales/${invoiceId}`}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-[#198760] bg-[#eaf7f0] py-2.5 text-center text-xs font-bold text-[#198760] hover:bg-[#d8f0e3] transition"
            >
              <span>Lihat & Cetak Struk Penjualan</span>
              <ArrowRight className="size-3.5" />
            </a>
          )}

          {/* Submit Button */}
          <button
            type="button"
            disabled={isSubmitting || cart.length === 0 || Boolean(checkoutDisabledReason)}
            onClick={completeSale}
            className="h-12 w-full rounded-xl bg-[#198760] text-sm font-bold text-white shadow-[0_4px_14px_rgba(25,135,96,.3)] transition hover:bg-[#14714f] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {isSubmitting
              ? "Menyimpan transaksi..."
              : paymentMethod === "qris"
              ? `Konfirmasi Bayar QRIS (${money(total)})`
              : paymentMethod === "cash"
              ? `Bayar Tunai (${money(total)})`
              : `Selesaikan Transaksi (${money(total)})`}
          </button>
        </div>
      </aside>

      {/* SUCCESS RECEIPT MODAL WITH THERMAL PRINT & WHATSAPP */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => {
          setShowReceiptModal(false);
          searchInputRef.current?.focus();
        }}
        receipt={completedReceipt}
      />
      </div>
    </div>
  );

}
