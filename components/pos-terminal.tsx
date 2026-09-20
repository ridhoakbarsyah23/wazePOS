"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { calculateCartTotal, calculatePayment, getQuickCashOptions } from "@/lib/pos-calculations";
import { filterPosProducts, getProductStockIssue, resolveProductEntry } from "@/lib/pos-product-search";
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

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const activeOutletName = outlets.find((outlet) => outlet.id === outletId)?.name ?? "Gerai";

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <section className="min-w-0 border border-[#d9e2dd] bg-white">
        <div className="border-b border-[#e5ebe8] p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label htmlFor="pos-product-search" className="mb-1.5 block text-xs font-semibold text-[#44534c]">
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
                  className="h-11 w-full border border-[#cbd6d0] bg-white pl-10 pr-16 text-sm text-[#17211d] outline-none placeholder:text-[#96a19b] focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
                />
                <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 border border-[#d9e2dd] bg-[#f6f8f7] px-1.5 py-0.5 font-mono text-[10px] text-[#6c7a73]">F2</kbd>
              </div>
            </div>
            <div className="flex h-11 items-center gap-2 border border-[#d9e2dd] bg-[#f8faf9] px-3 text-sm text-[#44534c] sm:min-w-48">
              <Store className="size-4 text-[#187c59]" />
              <span className="truncate font-semibold">{activeOutletName}</span>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-4 border-b border-[#e5ebe8]">
            <div className="flex min-w-0 gap-5 overflow-x-auto">
              {categories.map((category) => (
                <button
                  type="button"
                  key={category}
                  onClick={() => setCategoryFilter(category)}
                  className={`relative shrink-0 pb-2.5 text-sm font-semibold transition-colors ${
                    categoryFilter === category
                      ? "text-[#126b4b] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-[#187c59]"
                      : "text-[#6c7a73] hover:text-[#17211d]"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
            <div className="hidden shrink-0 items-center gap-1.5 pb-2.5 text-xs text-[#6c7a73] sm:flex">
              <ScanBarcode className="size-3.5" /> Scanner siap
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between text-xs text-[#6c7a73]">
            <span>{filteredProducts.length} produk</span>
            {search && <span>Hasil untuk “{search}”</span>}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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
                  className={`group min-h-32 border border-[#dde5e1] bg-white p-3.5 text-left hover:border-[#7fb59e] hover:bg-[#f6faf8] disabled:cursor-not-allowed disabled:bg-[#f6f7f6] disabled:opacity-55 ${styles.productCard} ${isJustAdded ? styles.productCardAdded : ""}`}
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
                  <span className="block truncate text-xs text-[#6c7a73]">{product.categoryName ?? "Umum"}</span>
                  <strong className="mt-1.5 block min-h-10 text-sm leading-5 text-[#17211d]">{product.name}</strong>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <span className="block text-sm font-bold text-[#126b4b]">{money(product.sellingPrice)}</span>
                      <span className={`mt-0.5 block text-xs ${unavailable ? "font-semibold text-rose-600" : "text-[#78857f]"}`}>
                        {product.trackStock ? (unavailable ? "Stok habis" : `Stok ${product.stock}`) : "Tanpa stok"}
                      </span>
                    </div>
                    {quantityInCart > 0 && (
                      <span
                        key={isJustAdded ? addedFeedback.sequence : 0}
                        className={`grid size-7 place-items-center bg-[#187c59] text-xs font-bold text-white ${isJustAdded ? styles.quantityPulse : ""}`}
                        aria-label={`${quantityInCart} di keranjang`}
                      >
                        {quantityInCart}
                      </span>
                    )}
                    {quantityInCart === 0 && (
                      <span
                        className="grid size-7 place-items-center border border-[#cbd8d1] text-[#187c59] transition-colors group-hover:border-[#7fb59e] group-hover:bg-[#eaf5ef]"
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
            <div className="grid min-h-56 place-items-center border border-dashed border-[#d9e2dd] text-center">
              <div>
                <Search className="mx-auto size-5 text-[#9aa69f]" />
                <p className="mt-2 text-sm font-semibold text-[#44534c]">Produk tidak ditemukan</p>
                <p className="mt-1 text-xs text-[#78857f]">Coba nama, kategori, atau SKU lain.</p>
              </div>
            </div>
          )}
        </div>

        <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[#e5ebe8] bg-[#fafbfa] px-4 py-2.5 text-[11px] text-[#78857f] sm:px-5">
          <span><kbd className="font-mono font-semibold text-[#44534c]">F2</kbd> cari</span>
          <span><kbd className="font-mono font-semibold text-[#44534c]">F4</kbd> metode bayar</span>
          <span><kbd className="font-mono font-semibold text-[#44534c]">F9</kbd> uang pas</span>
          <span><kbd className="font-mono font-semibold text-[#44534c]">Esc</kbd> bersihkan</span>
        </footer>
      </section>

      <aside className="border border-[#d9e2dd] bg-white xl:sticky xl:top-4">
        <div className="flex items-center justify-between border-b border-[#e5ebe8] px-4 py-3.5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold text-[#17211d]">
              <ShoppingCart className="size-4 text-[#187c59]" /> Pesanan
            </h2>
            <p
              key={addedFeedback?.sequence ?? 0}
              className={`mt-0.5 text-xs text-[#78857f] ${addedFeedback ? styles.cartCountPulse : ""}`}
            >
              {cartItemCount} item dipilih
            </p>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setCart([]);
                setPaidAmount("");
                setMessage(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#9a4b28] hover:text-[#7d3518]"
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

        <div className="max-h-[340px] overflow-y-auto px-4">
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
                <div className="flex items-center border border-[#d9e2dd]">
                  <button
                    type="button"
                    aria-label={`Kurangi ${item.name}`}
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    disabled={isRemoving}
                    className={`grid size-8 place-items-center text-[#44534c] hover:bg-[#f2f5f3] disabled:opacity-35 ${styles.quantityButton}`}
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span
                    key={quantityChange?.sequence ?? 0}
                    className={`min-w-9 border-x border-[#d9e2dd] text-center text-sm font-bold leading-8 ${
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
                    className={`grid size-8 place-items-center text-[#126b4b] hover:bg-[#f2f5f3] disabled:opacity-35 ${styles.quantityButton}`}
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
                  className={`ml-auto inline-flex items-center gap-1.5 px-1 py-1 text-xs text-[#78857f] hover:text-rose-600 disabled:pointer-events-none ${styles.removeButton}`}
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
                <ShoppingBasket className="mx-auto size-6 text-[#a3ada8]" />
                <p className="mt-2 text-sm font-semibold text-[#44534c]">Pesanan masih kosong</p>
                <p className="mt-1 max-w-52 text-xs leading-5 text-[#78857f]">Pilih produk di sebelah kiri atau pindai SKU.</p>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-[#d9e2dd] p-4">
          <div className="flex items-end justify-between gap-4">
            <span className="text-sm text-[#6c7a73]">Total</span>
            <strong className="text-2xl tracking-[-0.5px] text-[#17211d]">{money(total)}</strong>
          </div>

          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold text-[#44534c]">Metode pembayaran</p>
            <div className={`grid gap-2 ${allowNonCashPayments ? "grid-cols-4" : "grid-cols-2"}`}>
              <button
                type="button"
                aria-pressed={paymentMethod === "cash"}
                onClick={() => {
                  setPaymentMethod("cash");
                  setMessage(null);
                }}
                className={`flex h-10 items-center justify-center gap-1.5 border text-xs font-semibold ${paymentMethod === "cash" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-[#d9e2dd] text-[#596861] hover:bg-[#f7f9f8]"}`}
              >
                <Banknote className="size-3.5" /> Tunai
              </button>
              <button
                type="button"
                aria-pressed={paymentMethod === "qris"}
                disabled={!allowQrisPayments}
                title={allowQrisPayments ? "Gunakan pembayaran QRIS" : "QRIS belum tersedia"}
                onClick={() => {
                  if (!allowQrisPayments) return;
                  setPaymentMethod("qris");
                  setMessage(null);
                }}
                className={`flex h-10 items-center justify-center gap-1.5 border text-xs font-semibold ${paymentMethod === "qris" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-[#d9e2dd] text-[#596861] hover:bg-[#f7f9f8] disabled:cursor-not-allowed disabled:bg-[#f5f6f5] disabled:text-[#a4ada8]"}`}
              >
                <QrCode className="size-3.5" /> QRIS
              </button>
              {allowNonCashPayments && (
                <>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "debit"}
                    onClick={() => setPaymentMethod("debit")}
                    className={`h-10 border text-xs font-semibold ${paymentMethod === "debit" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-[#d9e2dd] text-[#596861] hover:bg-[#f7f9f8]"}`}
                  >
                    Debit
                  </button>
                  <button
                    type="button"
                    aria-pressed={paymentMethod === "credit"}
                    onClick={() => setPaymentMethod("credit")}
                    className={`h-10 border text-xs font-semibold ${paymentMethod === "credit" ? "border-[#187c59] bg-[#edf7f2] text-[#126b4b]" : "border-[#d9e2dd] text-[#596861] hover:bg-[#f7f9f8]"}`}
                  >
                    Kredit
                  </button>
                </>
              )}
            </div>
            {!allowQrisPayments && <p className="mt-1.5 text-[11px] text-[#87928d]">QRIS menunggu integrasi pembayaran resmi.</p>}
          </div>

          {checkoutDisabledReason && (
            <p className="m-0 mt-3 border-l-2 border-amber-500 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
              {checkoutDisabledReason}
            </p>
          )}

          {paymentMethod === "cash" && (
            <div className="mt-4 border-t border-[#edf1ef] pt-4">
              <label className="grid gap-1.5 text-xs font-semibold text-[#44534c]">
                Uang diterima
                <RupiahInput
                  value={Number(paidAmount) || 0}
                  onChange={(value) => setPaidAmount(String(value))}
                  onEmpty={() => setPaidAmount("")}
                  max={2_000_000_000}
                  className="h-11 w-full border border-[#cbd6d0] bg-white pl-10 pr-3 text-base font-bold text-[#17211d] outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
                />
              </label>

              {total > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {quickCashOptions.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setPaidAmount(String(amount))}
                      className={`border px-2.5 py-1.5 text-xs font-semibold ${Number(paidAmount) === amount ? "border-[#187c59] bg-[#187c59] text-white" : "border-[#d9e2dd] bg-white text-[#44534c] hover:border-[#9aaca2]"}`}
                    >
                      {amount === total ? "Uang pas" : money(amount)}
                    </button>
                  ))}
                </div>
              )}

              {paid > 0 && (
                <div className={`mt-3 flex items-center justify-between border-l-2 px-3 py-2.5 text-sm ${paid >= total ? "border-[#187c59] bg-[#f1f8f4] text-[#126b4b]" : "border-amber-500 bg-amber-50 text-amber-900"}`}>
                  <span>{paid >= total ? "Kembalian" : "Kurang"}</span>
                  <strong>{money(paid >= total ? change : shortfall)}</strong>
                </div>
              )}
            </div>
          )}

          {(paymentMethod === "debit" || paymentMethod === "credit") && (
            <div className="mt-3 flex gap-2 border-l-2 border-[#187c59] bg-[#f4f8f6] px-3 py-2.5 text-xs leading-5 text-[#44534c]">
              <CreditCard className="mt-0.5 size-4 shrink-0 text-[#187c59]" />
              Proses {paymentMethod === "debit" ? "kartu debit" : "kartu kredit"} di mesin EDC sebesar {money(total)}.
            </div>
          )}

          {message && (
            <p className={`m-0 mt-3 flex items-start gap-2 border-l-2 px-3 py-2.5 text-xs leading-5 ${message.type === "success" ? "border-[#187c59] bg-[#f1f8f4] text-[#126b4b]" : "border-amber-500 bg-amber-50 text-amber-900"}`} role="status">
              {message.type === "success" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 size-3.5 shrink-0" />}
              <span>{message.text}</span>
            </p>
          )}

          {invoiceId && (
            <a href={`/sales/${invoiceId}`} className="mt-3 flex items-center justify-center gap-1.5 border border-[#b8cbc1] py-2 text-xs font-semibold text-[#126b4b] hover:bg-[#f4f8f6]">
              Lihat struk terakhir <ArrowRight className="size-3.5" />
            </a>
          )}

          <button
            type="button"
            disabled={isSubmitting || cart.length === 0 || Boolean(checkoutDisabledReason)}
            onClick={completeSale}
            className="mt-3 h-12 w-full bg-[#187c59] px-4 text-sm font-bold text-white transition-colors hover:bg-[#126a4b] disabled:cursor-not-allowed disabled:bg-[#c8d0cc]"
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
        />
      )}
    </div>
  );

}
