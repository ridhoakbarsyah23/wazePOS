"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Maximize2,
  QrCode,
  ScanBarcode,
  ShieldCheck,
  Sparkles,
  X,
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
  businessName = "wazePOS Store",
}: {
  products: PosProduct[];
  outlets: PosOutlet[];
  initialOutletId: string;
  allowNonCashPayments: boolean;
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
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);
  const [completedReceipt, setCompletedReceipt] = useState<(ReceiptShareData & { cashierName?: string }) | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);


  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(products.map((item) => item.categoryName ?? "Umum"))).sort()],
    [products],
  );

  const filteredProducts = products.filter((item) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || item.name.toLowerCase().includes(query) || (item.sku ?? "").toLowerCase().includes(query);
    const matchesCategory = categoryFilter === "Semua" || (item.categoryName ?? "Umum") === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const total = cart.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0);
  const paid = paymentMethod === "cash" ? Number(paidAmount) || 0 : total;
  const change = paymentMethod === "cash" ? Math.max(0, paid - total) : 0;

  useEffect(() => {
    if (paymentMethod === "qris" && total > 0) {
      const activeOutletName = outlets.find((o) => o.id === outletId)?.name ?? "Kasir";
      const payload = `00020101021226590014ID.LINKAJA.WWW01189360091800000000000215000000000000000520454115303360540${total.toString().length}${total}5802ID59${businessName.length.toString().padStart(2, "0")}${businessName}6007JAKARTA62240120${activeOutletName.replace(/\s+/g, "")}${Date.now().toString().slice(-4)}6304`;
      
      QRCode.toDataURL(payload, {
        width: 380,
        margin: 1,
        color: { dark: "#102a20", light: "#ffffff" },
      })
        .then(setQrCodeUrl)
        .catch(() => setQrCodeUrl(null));
    }
  }, [paymentMethod, total, businessName, outletId, outlets]);

  const quickCashOptions = useMemo(() => {
    if (total <= 0) return [];
    const suggestions = new Set<number>();
    suggestions.add(total);

    const standardPresets = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];
    for (const p of standardPresets) {
      if (p > total) suggestions.add(p);
    }
    const nextTen = Math.ceil(total / 10_000) * 10_000;
    if (nextTen > total) suggestions.add(nextTen);
    const nextFifty = Math.ceil(total / 50_000) * 50_000;
    if (nextFifty > total) suggestions.add(nextFifty);

    return Array.from(suggestions)
      .filter((val) => val >= total)
      .sort((a, b) => a - b)
      .slice(0, 4);
  }, [total]);

  function addProduct(product: PosProduct) {
    setMessage(null);
    setCart((current) => {
      const existing = current.find((item) => item.id === product.id);
      if (existing) {
        if (product.trackStock && existing.quantity >= product.stock) return current;
        return current.map((item) => (item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { ...product, quantity: 1 }];
    });
  }

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
      setShowQrModal(false);

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
          if (prev === "cash") return "qris";
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

      // Escape: Close receipt modal, QR modal, clear search, or clear cart
      if (e.key === "Escape") {
        if (showReceiptModal) {
          e.preventDefault();
          setShowReceiptModal(false);
          return;
        }
        if (showQrModal) {
          e.preventDefault();
          setShowQrModal(false);
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
        const scannedCode = barcodeBufferRef.current.trim();
        barcodeBufferRef.current = "";

        if (scannedCode.length >= 2) {
          const matched = products.find(
            (p) =>
              p.sku?.toLowerCase() === scannedCode.toLowerCase() ||
              p.id.toLowerCase() === scannedCode.toLowerCase()
          );

          if (matched) {
            e.preventDefault();
            if (matched.trackStock && matched.stock < 1) {
              setMessage({ type: "error", text: `Stok produk ${matched.name} sudah habis.` });
            } else {
              addProduct(matched);
              setMessage({ type: "success", text: `Barcode discan: ${matched.name} (+1)` });
            }
            if (isInputActive && searchInputRef.current) {
              setSearch("");
            }
            return;
          } else if (scannedCode.length >= 3) {
            setMessage({
              type: "error",
              text: `Barcode "${scannedCode}" tidak ditemukan di katalog produk.`,
            });
          }
        }
        return;
      }

      // Buffer single printable characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        if (now - lastKeyTimeRef.current > 150) {
          barcodeBufferRef.current = "";
        }
        barcodeBufferRef.current += e.key;
        lastKeyTimeRef.current = now;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [products, cart, total, allowNonCashPayments, paymentMethod, showQrModal, search]);

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
          <span>Scanner USB Siap</span>
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
                placeholder="Ketik nama / scan barcode SKU... [F2]"
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
              onClick={() => {
                setPaymentMethod("qris");
                setMessage(null);
              }}
              className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-extrabold transition ${
                paymentMethod === "qris"
                  ? "bg-white text-[#198760] shadow-[0_2px_8px_rgba(0,0,0,0.06)] border border-[#cbe0d4]"
                  : "text-[#627069] hover:text-[#15211d]"
              }`}
            >
              <QrCode className="size-4" />
              <span>QRIS Digital</span>
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
                  <span className="text-base">{money(paid >= total ? change : total - paid)}</span>
                </div>
              )}
            </div>
          )}

          {/* QRIS MODE */}
          {paymentMethod === "qris" && (
            <div className="space-y-3 rounded-2xl border border-[#cbe0d4] bg-gradient-to-b from-[#f4faf7] to-white p-4 shadow-sm text-center">
              {/* QRIS Header */}
              <div className="flex items-center justify-between border-b border-[#dfe8e3] pb-2.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="grid size-8 place-items-center rounded-lg bg-[#de232c] text-white font-extrabold text-[11px] tracking-tighter">
                    QRIS
                  </div>
                  <div>
                    <p className="m-0 text-xs font-extrabold text-[#15211d]">QRIS Standar Nasional</p>
                    <p className="m-0 text-[10px] text-[#627069]">Bank Indonesia & ASPI</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  Nominal Pas
                </span>
              </div>

              {/* QR Code Container */}
              {total > 0 ? (
                <div className="space-y-2">
                  <div className="mx-auto flex w-fit flex-col items-center rounded-2xl border border-[#dfe8e3] bg-white p-3 shadow-inner">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="QRIS Code"
                        className="size-44 rounded-lg object-contain"
                      />
                    ) : (
                      <div className="grid size-44 place-items-center text-xs text-[#627069]">
                        Menyiapkan QRIS...
                      </div>
                    )}
                    <span className="mt-1 text-[11px] font-bold text-[#627069] tracking-wider">
                      {businessName}
                    </span>
                  </div>

                  {/* Nominal Callout */}
                  <div className="rounded-xl bg-emerald-50/80 border border-emerald-200/60 p-2.5 text-center">
                    <span className="block text-[11px] font-medium text-[#627069]">Total Bayar QRIS:</span>
                    <strong className="text-lg font-extrabold text-[#198760]">{money(total)}</strong>
                  </div>

                  {/* Customer Screen Expansion Button */}
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#b2d8c5] bg-white py-2 text-xs font-bold text-[#198760] transition hover:bg-[#eaf7f0]"
                  >
                    <Maximize2 className="size-3.5" />
                    <span>Perbesar Layar untuk Pelanggan</span>
                  </button>
                </div>
              ) : (
                <div className="py-6 text-xs text-[#627069]">
                  <QrCode className="mx-auto size-10 text-[#9bb0a5] mb-2" />
                  Tambahkan produk ke keranjang untuk menampilkan QRIS.
                </div>
              )}

              {/* Supported apps */}
              <div className="border-t border-[#edf2ee] pt-2 text-[10px] text-[#627069]">
                <p className="m-0 mb-1 font-semibold text-[#15211d]">Bisa di-scan menggunakan:</p>
                <p className="m-0 text-[#627069] leading-4">
                  BCA, Livin&apos; Mandiri, BRImo, BNI, GoPay, OVO, DANA, ShopeePay, LinkAja &amp; semua m-Banking.
                </p>
              </div>
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
            disabled={isSubmitting || cart.length === 0}
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

      {/* FULLSCREEN CUSTOMER QRIS MODAL */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center border border-[#dfe8e3]">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 grid size-8 place-items-center rounded-full bg-[#f0f4f1] text-[#627069] transition hover:bg-[#dfe8e3] hover:text-[#15211d]"
            >
              <X className="size-4" />
            </button>

            {/* Official QRIS Header */}
            <div className="inline-flex items-center gap-2 rounded-xl bg-[#fdf2f2] px-3.5 py-1.5 border border-[#fed7d7] text-xs font-extrabold text-[#c53030] mb-3">
              <span className="rounded bg-[#c53030] px-1.5 py-0.5 text-[10px] font-black text-white">QRIS</span>
              <span>PEMBAYARAN DIGITAL RESMI</span>
            </div>

            <h3 className="text-xl font-extrabold tracking-tight text-[#15211d]">
              {businessName}
            </h3>
            <p className="mt-0.5 text-xs text-[#627069]">
              {outlets.find((o) => o.id === outletId)?.name ?? "Kasir Toko"}
            </p>

            {/* Large QR Code Display */}
            <div className="my-4 mx-auto flex w-fit flex-col items-center rounded-2xl border-2 border-dashed border-[#198760]/30 bg-[#fbfdfc] p-4 shadow-sm">
              {qrCodeUrl && (
                <img
                  src={qrCodeUrl}
                  alt="QRIS Pelanggan"
                  className="size-64 rounded-xl object-contain shadow-sm"
                />
              )}
              <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#198760]">
                <ShieldCheck className="size-4" />
                <span>NMID Terverifikasi Nasional</span>
              </div>
            </div>

            {/* Total Price Tag */}
            <div className="rounded-2xl bg-gradient-to-r from-[#eaf7f0] to-[#f2faf5] p-3.5 border border-[#cae8d9] mb-4">
              <p className="m-0 text-xs font-medium text-[#627069]">Total yang Harus Dibayar:</p>
              <p className="m-0 text-2xl font-black text-[#198760] tracking-tight">{money(total)}</p>
            </div>

            <p className="text-[11px] text-[#627069] leading-relaxed mb-5">
              Buka aplikasi <strong>BCA, Mandiri, BRI, GoPay, OVO, DANA, ShopeePay</strong>, atau m-Banking Anda, arahkan kamera ke QR Code di atas.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="h-11 rounded-xl border border-[#dfe8e3] text-xs font-bold text-[#627069] hover:bg-[#f0f4f1] transition"
              >
                Tutup Tampilan
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={completeSale}
                className="h-11 rounded-xl bg-[#198760] text-xs font-bold text-white hover:bg-[#14714f] transition shadow-md"
              >
                {isSubmitting ? "Menyimpan..." : "Sudah Bayar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
