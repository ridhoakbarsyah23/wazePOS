import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PosTerminal } from "@/components/pos/pos-terminal";
import { buildReceiptWhatsAppMessage } from "@/components/marketing/whatsapp-share-button";
import { hasPlanFeature, getPlanFeatureComparison } from "@/shared/billing/plans";
import { createSaleRequestFingerprint } from "@/shared/pos/sale-idempotency";
import { getReceiptPrintPage } from "@/shared/pos/receipt-print";
import { saleSchema } from "@/shared/validation/sale";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

const baseProps = {
  products: [
    {
      id: "product-1",
      name: "Kopi Susu",
      sku: "KOPI-001",
      sellingPrice: 10_000,
      categoryName: "Minuman",
      stock: 5,
      trackStock: true,
    },
  ],
  outlets: [{ id: "outlet-1", name: "Gerai Utama" }],
  initialOutletId: "outlet-1",
  allowNonCashPayments: false,
  allowQrisPayments: false,
  checkoutDisabledReason: null,
};

function addProduct() {
  const productName = screen.getByText("Kopi Susu");
  fireEvent.click(productName.closest("button") as HTMLButtonElement);
}

describe("catatan per item khusus Bisnis", () => {
  it("flag paket: hanya Bisnis yang boleh catat per item", () => {
    expect(hasPlanFeature("tumbuh", "saleItemNotes")).toBe(false);
    expect(hasPlanFeature("bisnis", "saleItemNotes")).toBe(true);

    const item = getPlanFeatureComparison()
      .flatMap((group) => group.items)
      .find((entry) => entry.name === "Catatan per item di struk");
    expect(item?.availability).toEqual({ tumbuh: false, bisnis: true });
  });

  it("validasi: catatan dipangkas dan dibatasi 140 karakter", () => {
    const parsed = saleSchema.safeParse({
      clientRequestId: "55555555-5555-4555-8555-555555555555",
      outletId: "33333333-3333-4333-8333-333333333333",
      paymentMethod: "cash",
      paidAmount: 20_000,
      items: [{ productId: "44444444-4444-4444-8444-444444444444", quantity: 1, note: "  less sugar  " }],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.items[0].note).toBe("less sugar");

    const tooLong = saleSchema.safeParse({
      clientRequestId: "55555555-5555-4555-8555-555555555555",
      outletId: "33333333-3333-4333-8333-333333333333",
      paymentMethod: "cash",
      paidAmount: 20_000,
      items: [{ productId: "44444444-4444-4444-8444-444444444444", quantity: 1, note: "x".repeat(141) }],
    });
    expect(tooLong.success).toBe(false);
  });

  it("fingerprint: catatan berbeda menghasilkan request id berbeda", () => {
    const base = {
      outletId: "33333333-3333-4333-8333-333333333333",
      paymentMethod: "cash" as const,
      paidAmount: 10_000,
    };
    const plain = createSaleRequestFingerprint({
      ...base,
      items: [{ productId: "44444444-4444-4444-8444-444444444444", quantity: 1 }],
    });
    const noted = createSaleRequestFingerprint({
      ...base,
      items: [{ productId: "44444444-4444-4444-8444-444444444444", quantity: 1, note: "less sugar" }],
    });
    expect(plain).not.toBe(noted);
  });

  it("cetak: struk ber-catatan diberi ruang tinggi tambahan", () => {
    const normal = getReceiptPrintPage("80mm", 2);
    const noted = getReceiptPrintPage("80mm", 2, { hasItemNotes: true });
    expect(noted.pageHeightMm).toBeGreaterThan(normal.pageHeightMm);
  });

  it("WA: catatan item ikut terkirim di pesan struk", () => {
    const message = buildReceiptWhatsAppMessage({
      businessName: "Toko Uji",
      outletName: "Gerai Utama",
      invoiceNumber: "INV-001",
      createdAt: new Date("2026-09-27T10:00:00+07:00"),
      items: [{ name: "Kopi Susu", quantity: 1, unitPrice: 10_000, subtotal: 10_000, note: "less sugar" }],
      subtotal: 10_000,
      total: 10_000,
      paidAmount: 10_000,
      changeAmount: 0,
      paymentMethod: "cash",
      saleId: "sale-1",
    });
    expect(message).toContain("Catatan: less sugar");
  });

  it("Tumbuh: input catatan tampil tapi terkunci", () => {
    render(<PosTerminal {...baseProps} allowSaleItemNotes={false} />);
    addProduct();

    const input = screen.getByLabelText("Catatan untuk Kopi Susu") as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(input.placeholder).toContain("Upgrade ke Bisnis");
    expect(screen.getByText("Catatan per item khusus Paket Bisnis.")).toBeDefined();
  });

  it("Bisnis: input catatan aktif dan terkirim ke API", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify({ saleId: "sale-1", invoiceNumber: "INV-001", total: 10_000, changeAmount: 0 }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    );
    render(<PosTerminal {...baseProps} allowSaleItemNotes />);
    addProduct();

    const input = screen.getByLabelText("Catatan untuk Kopi Susu") as HTMLInputElement;
    expect(input.disabled).toBe(false);
    fireEvent.change(input, { target: { value: "less sugar" } });
    fireEvent.keyDown(window, { key: "F9" });
    fireEvent.click(screen.getByRole("button", { name: /Bayar tunai/ }));

    await screen.findByText("0 item dipilih");
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body ?? "{}"));
    expect(body.items).toEqual([
      { productId: "product-1", quantity: 1, note: "less sugar" },
    ]);
    fetchMock.mockRestore();
  });
});
