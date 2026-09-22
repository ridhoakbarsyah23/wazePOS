import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Ban } from "lucide-react";
import { db } from "@/db";
import { business, outlet, sale, saleItem, user } from "@/db/schema";
import { canManageBusiness, getMembership, requireSession } from "@/lib/auth-session";
import { normalizeReceiptSettings } from "@/lib/validation/receipt-settings";
import { PrintButton } from "@/components/print-button";
import { VoidSaleButton } from "@/components/void-sale-button";
import { WhatsAppShareButton } from "@/components/whatsapp-share-button";


export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  const { id } = await params;

  const receiptFilters = [
    eq(sale.id, id),
    eq(sale.businessId, membership.businessId),
    ...(membership.role === "cashier" ? [eq(sale.cashierId, session.user.id)] : []),
  ];

  const [receipt] = await db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      status: sale.status,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      voidedAt: sale.voidedAt,
      voidedById: sale.voidedById,
      voidReason: sale.voidReason,
      businessName: business.name,
      outletName: outlet.name,
      cashierName: user.name,
      receiptSettings: business.receiptSettings,
    })
    .from(sale)
    .innerJoin(business, eq(business.id, sale.businessId))
    .innerJoin(outlet, eq(outlet.id, sale.outletId))
    .innerJoin(user, eq(user.id, sale.cashierId))
    .where(and(...receiptFilters))
    .limit(1);

  if (!receipt) notFound();
  const [items, voidedBy] = await Promise.all([
    db.select().from(saleItem).where(eq(saleItem.saleId, receipt.id)).orderBy(saleItem.createdAt),
    receipt.voidedById
      ? db.select({ name: user.name }).from(user).where(eq(user.id, receipt.voidedById)).limit(1)
      : Promise.resolve([]),
  ]);
  const money = (value: number) => `Rp ${Number(value).toLocaleString("id-ID")}`;
  const isVoided = receipt.status === "voided";
  const userCanVoid = canManageBusiness(membership.role);
  const settings = normalizeReceiptSettings(receipt.receiptSettings);

  const shareData = {
    businessName: receipt.businessName,
    outletName: receipt.outletName,
    invoiceNumber: receipt.invoiceNumber,
    createdAt: receipt.createdAt,
    items: items.map((i) => ({
      name: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      subtotal: i.subtotal,
    })),
    subtotal: receipt.subtotal,
    discount: receipt.discount,
    total: receipt.total,
    paidAmount: receipt.paidAmount,
    changeAmount: receipt.changeAmount,
    paymentMethod: receipt.paymentMethod,
    saleId: receipt.id,
  };


  return (
    <main className="min-h-dvh bg-[#f4faf7] px-4 py-8 text-[#15211d] print:bg-white print:p-0 print:m-0">
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .thermal-receipt {
            width: 100% !important;
            margin: 0 auto !important;
            padding: 6px 8px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          }
          html[data-receipt-paper="58mm"] .thermal-receipt {
            max-width: 58mm !important;
            font-size: 11px !important;
            line-height: 1.25 !important;
          }
          html[data-receipt-paper="80mm"] .thermal-receipt {
            max-width: 80mm !important;
            font-size: 13px !important;
            line-height: 1.35 !important;
          }
        }
      `}</style>

      <div className="mx-auto max-w-xl print:max-w-none print:w-full print:m-0 print:p-0">
        {/* Header Action Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/transactions"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#198760] transition hover:text-[#14714f]"
            >
              <ArrowLeft className="size-3.5" />
              <span>Kembali ke riwayat</span>
            </Link>
            <Link href="/pos" className="text-xs font-semibold text-[#627069] transition hover:text-[#15211d]">
              Buka kasir
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <VoidSaleButton
              saleId={receipt.id}
              invoiceNumber={receipt.invoiceNumber}
              isVoided={isVoided}
              canVoid={userCanVoid}
            />
            <WhatsAppShareButton receipt={shareData} />
            <PrintButton
              itemCount={items.length}
              hasDiscount={receipt.discount > 0}
              isVoided={isVoided}
            />
          </div>

        </div>

        {/* Struk Card / Thermal Paper */}
        <article
          className={`thermal-receipt relative rounded-2xl border bg-white p-7 shadow-[0_8px_24px_rgba(16,65,48,.06)] transition ${
            isVoided ? "border-rose-300 bg-rose-50/20" : "border-[#dfe8e3]"
          }`}
        >
          {/* Stempel VOID jika status transaksi voided */}
          {isVoided && (
            <div className="mb-4 rounded-xl border-2 border-dashed border-rose-500 bg-rose-50/80 px-4 py-2.5 text-center text-rose-700">
              <div className="flex items-center justify-center gap-1.5 font-black text-sm uppercase tracking-wider">
                <Ban className="size-4" />
                <span>Transaksi Telah Dibatalkan (VOID)</span>
              </div>
              <p className="m-0 mt-0.5 text-[10px] text-rose-600">
                Stok produk telah dikembalikan dan nominal tidak dihitung ke omzet gerai.
              </p>
              {(receipt.voidedAt || receipt.voidReason) && (
                <div className="mt-2 border-t border-rose-200 pt-2 text-left text-[10px] leading-4 text-rose-700">
                  {receipt.voidedAt && (
                    <p className="m-0">
                      Dibatalkan {new Date(receipt.voidedAt).toLocaleString("id-ID")}
                      {voidedBy[0]?.name ? ` oleh ${voidedBy[0].name}` : ""}
                    </p>
                  )}
                  {receipt.voidReason && <p className="m-0 mt-0.5">Alasan: {receipt.voidReason}</p>}
                </div>
              )}
            </div>
          )}

          <header className="border-b border-dashed border-[#cddbd3] pb-4 text-center">
            {settings.showLogo && (
              <h1 className="text-xl font-extrabold tracking-tight">
                waze<span className="text-[#198760]">POS</span>
              </h1>
            )}
            <p className="mt-1 text-sm font-bold">{receipt.businessName}</p>
            <p className="m-0 text-xs text-[#627069]">{receipt.outletName}</p>
            {settings.headerNote && <p className="m-0 mt-1 text-[11px] text-[#627069]">{settings.headerNote}</p>}
          </header>

          <div className="flex justify-between gap-4 border-b border-dashed border-[#cddbd3] py-3 text-xs text-[#627069]">
            <div>
              <p className={`m-0 font-bold ${isVoided ? "line-through text-rose-600" : "text-[#15211d]"}`}>
                {receipt.invoiceNumber}
              </p>
              {settings.showDateTime && <p className="m-0 mt-0.5">{new Date(receipt.createdAt).toLocaleString("id-ID")}</p>}
            </div>
            {settings.showCashier && (
              <div className="text-right">
                <p className="m-0">Kasir</p>
                <p className="m-0 font-bold text-[#15211d]">{receipt.cashierName}</p>
              </div>
            )}
          </div>

          <div className="space-y-2.5 py-4">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between gap-4 text-xs sm:text-sm">
                <div>
                  <p className="m-0 font-semibold">{item.productName}</p>
                  {settings.showUnitPrice && (
                    <p className="m-0 text-xs text-[#627069]">
                      {item.quantity} × {money(item.unitPrice)}
                    </p>
                  )}
                </div>
                <strong className={isVoided ? "text-[#8b9991]" : "text-[#15211d]"}>
                  {money(item.subtotal)}
                </strong>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 border-t border-dashed border-[#cddbd3] pt-3 text-xs sm:text-sm">
            <div className="flex justify-between text-[#627069]">
              <span>Subtotal</span>
              <strong className="text-[#15211d]">{money(receipt.subtotal)}</strong>
            </div>

            {receipt.discount > 0 && (
              <div className="flex justify-between text-[#627069]">
                <span>Diskon</span>
                <strong className="text-[#de232c]">-{money(receipt.discount)}</strong>
              </div>
            )}

            <div className="flex justify-between text-base font-extrabold pt-1">
              <span>Total</span>
              <strong className={isVoided ? "text-rose-600 line-through" : "text-[#198760]"}>
                {money(receipt.total)}
              </strong>
            </div>

            {receipt.paymentMethod === "qris" ? (
              <>
                <div className="flex justify-between pt-2 text-[#627069]">
                  <span className="font-bold text-[#de232c] flex items-center gap-1">QRIS DIGITAL</span>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-extrabold ${isVoided ? "bg-rose-100 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                    {isVoided ? "VOID" : "LUNAS"}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[#627069]">
                  <span>Nominal Pas</span>
                  <span>{money(receipt.paidAmount)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between pt-2 text-[#627069]">
                  <span className="font-semibold uppercase">{receipt.paymentMethod}</span>
                  <span>Dibayar {money(receipt.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#198760]">
                  <span>Kembalian</span>
                  <span>{money(receipt.changeAmount)}</span>
                </div>
              </>
            )}
          </div>

          {(settings.footerMessage === "thankYou" || settings.footerNote) && (
            <footer className="m-0 mt-5 border-t border-dashed border-[#cddbd3] pt-4 text-center text-xs text-[#627069]">
              {settings.footerMessage === "thankYou" && (
                <>
                  <p className="m-0">Terima kasih sudah berbelanja.</p>
                  <p className="m-0 mt-1 text-[10px] text-[#8b9991]">Simpan struk ini sebagai bukti pembayaran yang sah.</p>
                </>
              )}
              {settings.footerNote && <p className="m-0 mt-1">{settings.footerNote}</p>}
            </footer>
          )}
        </article>
      </div>
    </main>
  );
}
