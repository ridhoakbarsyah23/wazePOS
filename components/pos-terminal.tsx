"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { calculateCartTotal, calculatePayment, getQuickCashOptions } from "@/lib/pos-calculations";
import { filterPosProducts, getProductStockIssue, resolveProductEntry } from "@/lib/pos-product-search";
import {
  clearSaleRequestId,
  createSaleRequestFingerprint,
  getOrCreateSaleRequestId,
} from "@/lib/sale-idempotency";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  CheckCircle2,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  ScanBarcode,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Store,
  Trash2,
} from "lucide-react";
import { RupiahInput } from "@/components/ui/rupiah-input";
import type { ReceiptSettings } from "@/lib/validation/receipt-settings";
import type { ReceiptShareData } from "./whatsapp-share-button";
import styles from "./pos-terminal.module.css";

const ReceiptModal = dynamic(
  () => import("./receipt-modal").then((module) => module.ReceiptModal),
  { ssr: false },
);

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

const PAYMENT_METHODS = [
  { id: "cash", label: "Tunai", icon: Banknote, hint: "Uang tunai & kembalian" },
  { id: "qris", label: "QRIS", icon: QrCode, hint: "Satu kode untuk semua e-wallet" },
  { id: "debit", label: "Debit", icon: CreditCard, hint: "Kartu debit via mesin EDC" },
  { id: "credit", label: "Kredit", icon: CreditCard, hint: "Kartu kredit via mesin EDC" },
] as const;

export function PosTerminal({
  products,
  outlets,
  initialOutletId,
  allowNonCashPayments,
  allowQrisPayments,
  checkoutDisabledReason,
  businessName = "wazePOS Store",
  receiptSettings,
}: {
  products: PosProduct[];
  outlets: PosOutlet[];
  initialOutletId: string;
  allowNonCashPayments: boolean;
  allowQrisPayments: boolean;
  checkoutDisabledReason: string | null;
  businessName?: string;
  receiptSettings?: ReceiptSettings | null;
}) {
  const outletId = initialOutletId;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const addedFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quantityFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removalTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());

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
  const [addedFeedback, setAddedFeedback] = useState<{
    productId: string;
    productName: string;
    sequence: number;
  } | null>(null);
  const [quantityFeedback, setQuantityFeedback] = useState<{
    productId: string;
    direction: "increase" | "decrease";
    sequence: number;
  } | null>(null);
  const [removingItemIds, setRemovingItemIds] = useState<string[]>([]);


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

  useEffect(() => () => {
    if (addedFeedbackTimerRef.current) clearTimeout(addedFeedbackTimerRef.current);
    if (quantityFeedbackTimerRef.current) clearTimeout(quantityFeedbackTimerRef.current);
    removalTimersRef.current.forEach((timer) => clearTimeout(timer));
    removalTimersRef.current.clear();
  }, []);

  const quickCashOptions = getQuickCashOptions(total);

  const showAddedFeedback = useCallback((product: PosProduct) => {
    if (addedFeedbackTimerRef.current) clearTimeout(addedFeedbackTimerRef.current);
    setAddedFeedback((current) => ({
      productId: product.id,
      productName: product.name,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    addedFeedbackTimerRef.current = setTimeout(() => setAddedFeedback(null), 900);
  }, []);

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
    showAddedFeedback(product);
    setMessage(null);
    return true;
  }, [cart, showAddedFeedback]);

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

  function removeCartItem(id: string) {
    if (removingItemIds.includes(id)) return;
    setRemovingItemIds((current) => [...current, id]);

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setTimeout(() => {
      setCart((current) => current.filter((item) => item.id !== id));
      setRemovingItemIds((current) => current.filter((itemId) => itemId !== id));
      removalTimersRef.current.delete(timer);
    }, reduceMotion ? 0 : 220);
    removalTimersRef.current.add(timer);
  }

  function updateQuantity(id: string, quantity: number) {
    const currentItem = cart.find((item) => item.id === id);
    if (!currentItem || removingItemIds.includes(id)) return;
    if (quantity <= 0) {
      removeCartItem(id);
      return;
    }

    const direction = quantity > currentItem.quantity ? "increase" : "decrease";
    if (quantityFeedbackTimerRef.current) clearTimeout(quantityFeedbackTimerRef.current);
    setQuantityFeedback((current) => ({
      productId: id,
      direction,
      sequence: (current?.sequence ?? 0) + 1,
    }));
    quantityFeedbackTimerRef.current = setTimeout(() => setQuantityFeedback(null), 360);
    setCart((current) => current.map((item) => (item.id === id ? { ...item, quantity } : item)));
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
    if (paymentMethod !== "cash" && paid < total) {
      // Tidak pernah seharusnya terjadi (non-tunai otomatis dianggap lunas),
      // tapi tetap dijaga agar total selalu tertutup.
      setMessage({ type: "error", text: "Pembayaran masih kurang dari total transaksi." });
      return;
    }
    if (paid < total) {
      setMessage({ type: "error", text: "Pembayaran masih kurang dari total transaksi." });
      return;
    }
    setIsSubmitting(true);
    setMessage(null);
    const salePayload = {
      outletId,
      paymentMethod,
      paidAmount: paid,
      items: cart.map((item) => ({ productId: item.id, quantity: item.quantity })),
    };
    const fingerprint = createSaleRequestFingerprint(salePayload);
    const clientRequestId = getOrCreateSaleRequestId(sessionStorage, fingerprint);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...salePayload,
          clientRequestId,
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
      clearSaleRequestId(sessionStorage, clientRequestId);
      setShowReceiptModal(true);

      setMessage({
        type: "success",
        text:
          paymentMethod === "qris"
            ? "Pembayaran QRIS berhasil dikonfirmasi (Lunas)."
            : paymentMethod === "cash"
              ? `Transaksi berhasil. Kembalian ${money(result.changeAmount)}.`
              : `Transaksi ${paymentMethod === "debit" ? "kartu debit" : "kartu kredit"} berhasil (Lunas).`,
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

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeOutletName = outlets.find((outlet) => outlet.id === outletId)?.name ?? "Gerai";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_400px] xl:items-start">
      <section className="min-w-0 overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_4px_20px_rgba(16,65,48,.04)]">
        <div className="border-b border-[#edf2ee] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="pos-product-search" className="mb-1.5 block text-xs font-bold text-[#44534c]">
                Cari atau pindai produk
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#78857f]" />
                <input
                  id="pos-product-search"
                  ref={searchInputRef}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    event.stopPropagation();
                    addProductFromEntry(event.currentTarget.value);
                  }}
                  placeholder="Nama produk atau SKU"
                  aria-label="Cari produk berdasarkan nama atau SKU"
                  className="h-11 w-full rounded-xl border border-[#dbe5df] bg-[#f8faf9] pl-10 pr-16 text-sm text-[#17211d] outline-none transition placeholder:text-[#96a19b] focus:border-[#198760] focus:bg-white focus:ring-2 focus:ring-[#198760]/10"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-[#dbe5df] bg-white px-1.5 py-0.5 font-mono text-[10px] text-[#6c7a73]">F2</kbd>
              </div>
            </div>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-[#dbe5df] bg-[#f8faf9] px-3.5 text-sm text-[#44534c] sm:min-w-48">
              <Store className="size-4 text-[#198760]" />
              <span className="truncate font-bold">{activeOutletName}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex min-w-0 gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all ${
                    categoryFilter === category
                      ? "border-[#198760] bg-[#198760] text-white shadow-[0_2px_8px_rgba(25,135,96,.3)]"
                      : "border-[#dbe5df] bg-white text-[#596861] hover:border-[#9ac3b0] hover:text-[#198760]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 text-xs font-semibold text-[#6c7a73] sm:flex">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#198760] opacity-60" />
                <span className="relative inline-flex size-2 rounded-full bg-[#198760]" />
              </span>
              <ScanBarcode className="size-3.5" /> Scanner siap
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between text-xs text-[#6c7a73]">
            <span className="font-semibold">{filteredProducts.length} produk</span>
            {search && <span className="rounded-full bg-[#eaf5ef] px-2.5 py-1 font-semibold text-[#126b4b]">Hasil: “{search}”</span>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filteredProducts.map((product) => {
              const unavailable = product.trackStock && product.stock < 1;
              const quantityInCart = cart.find((item) => item.id === product.id)?.quantity ?? 0;
              const isJustAdded = addedFeedback?.productId === product.id;
              return (
                <button
                  type="button"
                  disabled={unavailable}
                  key={product.id}
                  onClick={() => addProduct(product)}
                  className={`group min-h-32 rounded-2xl border border-[#e5ede8] bg-white p-3.5 text-left transition hover:border-[#7fb59e] hover:bg-[#f6faf8] hover:shadow-[0_6px_16px_rgba(16,65,48,.08)] disabled:cursor-not-allowed disabled:bg-[#f6f7f6] disabled:opacity-55 ${styles.productCard} ${isJustAdded ? styles.productCardAdded : ""}`}
                >
                  {isJustAdded && (
                    <span
                      key={addedFeedback.sequence}
                      className={styles.addedConfirmation}
                      aria-hidden="true"
                    >
                      <ShoppingCart className="size-3.5" /> Ditambahkan
                    </span>
                  )}
                  <span className="inline-block rounded-md bg-[#f0f5f2] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#6c7a73]">{product.categoryName ?? "Umum"}</span>
                  <strong className="mt-2 block min-h-10 text-sm leading-5 text-[#17211d]">{product.name}</strong>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <span className="block text-sm font-black text-[#198760]">{money(product.sellingPrice)}</span>
                      <span className={`mt-0.5 block text-xs ${unavailable ? "font-semibold text-rose-600" : "text-[#78857f]"}`}>
                        {product.trackStock ? (unavailable ? "Stok habis" : `Stok ${product.stock}`) : "Tanpa stok"}
                      </span>
                    </div>
                    {quantityInCart > 0 && (
                      <span
                        key={isJustAdded ? addedFeedback.sequence : 0}
                        className={`grid size-7 place-items-center rounded-full bg-[#198760] text-xs font-bold text-white shadow-[0_2px_8px_rgba(25,135,96,.35)] ${isJustAdded ? styles.quantityPulse : ""}`}
                        aria-label={`${quantityInCart} di keranjang`}
                      >
                        {quantityInCart}
                      </span>
                    )}
                    {quantityInCart === 0 && (
                      <span
                        className="grid size-7 place-items-center rounded-full border border-[#cbd8d1] text-[#198760] transition-colors group-hover:border-[#7fb59e] group-hover:bg-[#eaf5ef]"
                        aria-hidden="true"
                      >
                        <Plus className="size-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="grid min-h-56 place-items-center rounded-2xl border-2 border-dashed border-[#dfe8e3] bg-[#fbfdfc] text-center">
              <div>
                <span className="mx-auto grid size-11 place-items-center rounded-2xl bg-emerald-50 text-[#198760]">
                  <Search className="size-5" />
                </span>
                <p className="mt-2.5 text-sm font-bold text-[#44534c]">Produk tidak ditemukan</p>
                <p className="mt-1 text-xs text-[#78857f]">Coba nama, kategori, atau SKU lain.</p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#edf2ee] bg-[#fafbfa] px-4 py-2.5 text-[11px] text-[#78857f] sm:px-5">
          <span><kbd className="rounded-md border border-[#dbe5df] bg-white px-1.5 py-0.5 font-mono font-semibold text-[#44534c]">F2</kbd> cari</span>
          <span><kbd className="rounded-md border border-[#dbe5df] bg-white px-1.5 py-0.5 font-mono font-semibold text-[#44534c]">F9</kbd> uang pas</span>
          <span><kbd className="rounded-md border border-[#dbe5df] bg-white px-1.5 py-0.5 font-mono font-semibold text-[#44534c]">Esc</kbd> bersihkan</span>
        </footer>
      </section>

      <aside className="overflow-hidden rounded-3xl border border-[#dfe8e3] bg-white shadow-[0_4px_20px_rgba(16,65,48,.04)] xl:sticky xl:top-4">
        <div className="flex items-center justify-between border-b border-[#edf2ee] bg-gradient-to-r from-[#f7fbf9] to-white px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="relative grid size-9 place-items-center rounded-xl bg-[#198760] text-white shadow-[0_2px_10px_rgba(25,135,96,.3)]">
              <ShoppingCart className="size-4" />
              {cartItemCount > 0 && (
                <span className="absolute -right-1 -top-1 grid min-w-4.5 place-items-center rounded-full border-2 border-white bg-amber-400 px-1 text-[9px] font-black text-[#5b3a00]">
                  {cartItemCount}
                </span>
              )}
            </span>
            <div>
              <h2 className="text-base font-black text-[#17211d]">Pesanan</h2>
              <p
                key={addedFeedback?.sequence ?? 0}
                className={`mt-0.5 text-xs text-[#78857f] ${addedFeedback ? styles.cartCountPulse : ""}`}
              >
                {cartItemCount} item dipilih
              </p>
            </div>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setPaidAmount("");
                setMessage(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-bold text-[#9a4b28] transition hover:bg-rose-50 hover:text-rose-700"
            >
              <Trash2 className="size-3.5" /> Kosongkan
            </button>
          )}
        </div>

        {addedFeedback && (
          <div
            key={addedFeedback.sequence}
            className={styles.cartNotice}
            role="status"
            aria-live="polite"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="truncate"><strong>{addedFeedback.productName}</strong> ditambahkan ke pesanan</span>
          </div>
        )}

        <div className="max-h-[320px] overflow-y-auto px-4">
          {cart.map((item) => {
            const isJustAdded = addedFeedback?.productId === item.id;
            const quantityChange = quantityFeedback?.productId === item.id ? quantityFeedback : null;
            const isRemoving = removingItemIds.includes(item.id);
            return (
            <div
              key={`${item.id}:${isJustAdded ? addedFeedback.sequence : 0}`}
              className={`border-b border-[#edf1ef] py-3.5 ${isJustAdded ? styles.cartItemAdded : ""} ${isRemoving ? styles.cartItemRemoving : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-sm text-[#17211d]">{item.name}</strong>
                  <p className="mt-0.5 text-xs text-[#78857f]">{money(item.sellingPrice)} / item</p>
                </div>
                <strong className="shrink-0 text-sm text-[#17211d]">{money(item.sellingPrice * item.quantity)}</strong>
              </div>
              <div className="mt-2.5 flex items-center">
                <div className="flex items-center rounded-xl border border-[#dbe5df] bg-white">
                  <button
                    type="button"
                    aria-label={`Kurangi ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={isRemoving}
                    className={`grid size-8 place-items-center rounded-l-xl text-[#44534c] hover:bg-[#f2f5f3] disabled:opacity-35 ${styles.quantityButton}`}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span
                    key={quantityChange?.sequence ?? 0}
                    className={`min-w-9 border-x border-[#dbe5df] text-center text-sm font-bold leading-8 ${
                      quantityChange?.direction === "increase"
                        ? styles.quantityIncrease
                        : quantityChange?.direction === "decrease"
                          ? styles.quantityDecrease
                          : ""
                    }`}
                  >
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Tambah ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    disabled={isRemoving || (item.trackStock && item.quantity >= item.stock)}
                    className={`grid size-8 place-items-center rounded-r-xl text-[#126b4b] hover:bg-[#f2f5f3] disabled:opacity-35 ${styles.quantityButton}`}
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus ${item.name} dari pesanan`}
                  title={`Hapus ${item.name}`}
                  disabled={isRemoving}
                  onClick={() => removeCartItem(item.id)}
                  className={`ml-auto inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-xs text-[#78857f] hover:text-rose-600 disabled:pointer-events-none ${styles.removeButton}`}
                >
                  <Trash2 className="size-3.5" /> Hapus
                </button>
              </div>
            </div>
            );
          })}

          {cart.length === 0 && (
            <div className="grid min-h-44 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#198760]">
                  <ShoppingBasket className="size-6" />
                </span>
                <p className="mt-2.5 text-sm font-bold text-[#44534c]">Pesanan masih kosong</p>
                <p className="mt-1 max-w-52 text-xs leading-5 text-[#78857f]">Pilih produk di sebelah kiri atau pindai SKU.</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#d9e2dd] bg-[#fbfdfc] p-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm font-semibold text-[#6c7a73]">Total</span>
            <strong className="text-2xl font-black tracking-[-0.5px] text-[#17211d]">{money(total)}</strong>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e5ede8] bg-white p-3">
            <p className="mb-2 text-xs font-bold text-[#44534c]">Metode pembayaran</p>
            <div className="grid grid-cols-4 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                const isSelected = paymentMethod === method.id;
                const isLocked =
                  (method.id === "qris" && !allowQrisPayments) ||
                  ((method.id === "debit" || method.id === "credit") && !allowNonCashPayments);
                return (
                  <button
                    key={method.id}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={isLocked}
                    title={isLocked ? "Tersedia di paket lebih tinggi" : method.hint}
                    onClick={() => {
                      setPaymentMethod(method.id);
                      setMessage(null);
                    }}
                    className={`flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-[11px] font-bold transition-all active:scale-95 ${
                      isSelected
                        ? "border-[#198760] bg-[#edf7f2] text-[#126b4b] shadow-[0_2px_10px_rgba(25,135,96,.18)]"
                        : isLocked
                          ? "cursor-not-allowed border-[#e5ede8] bg-[#f6f7f6] text-[#a4ada8]"
                          : "border-[#dbe5df] bg-white text-[#596861] hover:border-[#7fb59e] hover:text-[#126b4b]"
                    }`}
                  >
                    <Icon className="size-4.5" />
                    {method.label}
                    {isLocked && <span aria-hidden="true" className="text-[8px] font-extrabold uppercase tracking-wide">🔒 Paket</span>}
                  </button>
                );
              })}
            </div>

            {(paymentMethod === "debit" || paymentMethod === "credit") && (
              <div className="mt-3 flex gap-2 rounded-xl border-l-4 border-[#198760] bg-[#f4f8f6] px-3 py-2.5 text-xs leading-5 text-[#44534c]">
                <CreditCard className="mt-0.5 size-4 shrink-0 text-[#198760]" />
                Proses {paymentMethod === "debit" ? "kartu debit" : "kartu kredit"} di mesin EDC sebesar <strong className="whitespace-nowrap">{money(total)}</strong>.
              </div>
            )}
          </div>

          {paymentMethod === "cash" && (
            <div className="mt-3 rounded-2xl border border-[#e5ede8] bg-white p-3">

            <p className="flex items-center gap-1.5 text-xs font-bold text-[#44534c]">
              <Banknote className="size-4 text-[#198760]" /> Uang diterima
            </p>

            <label className="mt-2 grid gap-1.5 text-xs font-bold text-[#44534c]">
              <RupiahInput
                value={Number(paidAmount) || 0}
                onChange={(value) => setPaidAmount(String(value))}
                onEmpty={() => setPaidAmount("")}
                max={2_000_000_000}
                className="h-11 w-full rounded-xl border border-[#cbd6d0] bg-white pl-10 pr-3 text-base font-bold text-[#17211d] outline-none transition focus:border-[#198760] focus:ring-2 focus:ring-[#198760]/10"
              />
            </label>

            {total > 0 && (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {quickCashOptions.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setPaidAmount(String(amount))}
                    className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                      Number(paidAmount) === amount
                        ? "border-[#198760] bg-[#198760] text-white shadow-[0_2px_8px_rgba(25,135,96,.3)]"
                        : "border-[#dbe5df] bg-white text-[#44534c] hover:border-[#198760] hover:text-[#198760]"
                    }`}
                  >
                    {amount === total ? "Uang pas" : money(amount)}
                  </button>
                ))}
              </div>
            )}

            {paid > 0 && (
              <div className={`mt-3 flex items-center justify-between rounded-xl border-l-4 px-3 py-2.5 text-sm font-semibold ${paid >= total ? "border-[#198760] bg-[#f1f8f4] text-[#126b4b]" : "border-amber-500 bg-amber-50 text-amber-900"}`}>
                <span className="flex items-center gap-1.5">
                  <Banknote className="size-4" />
                  {paid >= total ? "Kembalian" : "Kurang"}
                </span>
                <strong className="text-base">{money(paid >= total ? change : shortfall)}</strong>
              </div>
            )}
            </div>
          )}  

          {checkoutDisabledReason && (
            <p className="m-0 mt-3 rounded-xl border-l-4 border-amber-500 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              {checkoutDisabledReason}
            </p>
          )}

          {message && (
            <p className={`m-0 mt-3 flex items-start gap-2 rounded-xl border-l-4 px-3 py-2.5 text-xs leading-5 ${message.type === "success" ? "border-[#198760] bg-[#f1f8f4] text-[#126b4b]" : "border-amber-500 bg-amber-50 text-amber-900"}`} role="status">
              {message.type === "success" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 size-3.5 shrink-0" />}
              <span>{message.text}</span>
            </p>
          )}

          {invoiceId && (
            <a href={`/sales/${invoiceId}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl border border-[#b8cbc1] bg-white py-2 text-xs font-bold text-[#126b4b] transition hover:bg-[#f4f8f6]">
              Lihat struk terakhir <ArrowRight className="size-3.5" />
            </a>
          )}

          <button
            type="button"
            disabled={isSubmitting || cart.length === 0 || Boolean(checkoutDisabledReason)}
            onClick={completeSale}
            className="mt-3 h-13 w-full rounded-2xl bg-gradient-to-r from-[#198760] to-[#116b4c] px-4 text-sm font-black text-white shadow-[0_6px_18px_rgba(25,135,96,.35)] transition hover:shadow-[0_8px_24px_rgba(25,135,96,.45)] active:scale-[0.98] disabled:cursor-not-allowed disabled:from-[#c8d0cc] disabled:to-[#c8d0cc] disabled:shadow-none"
          >
            {isSubmitting
              ? "Menyimpan transaksi..."
              : paymentMethod === "qris"
                ? `Bayar QRIS · ${money(total)}`
                : paymentMethod === "cash"
                  ? `Bayar tunai · ${money(total)}`
                  : `Selesaikan transaksi · ${money(total)}`}
          </button>
        </div>
      </aside>

      {showReceiptModal && (
        <ReceiptModal
          isOpen
          onClose={() => {
            setShowReceiptModal(false);
            searchInputRef.current?.focus();
          }}
          receipt={completedReceipt}
          receiptSettings={receiptSettings}
        />
      )}
    </div>
  );

}
