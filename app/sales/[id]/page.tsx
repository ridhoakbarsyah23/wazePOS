import { and, eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { business, outlet, sale, saleItem, user } from "@/db/schema";
import { getMembership, requireSession } from "@/lib/auth-session";
import { PrintButton } from "@/components/print-button";

export default async function SaleReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  const { id } = await params;

  const [receipt] = await db
    .select({
      id: sale.id,
      invoiceNumber: sale.invoiceNumber,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      paymentMethod: sale.paymentMethod,
      createdAt: sale.createdAt,
      businessName: business.name,
      outletName: outlet.name,
      cashierName: user.name,
    })
    .from(sale)
    .innerJoin(business, eq(business.id, sale.businessId))
    .innerJoin(outlet, eq(outlet.id, sale.outletId))
    .innerJoin(user, eq(user.id, sale.cashierId))
    .where(and(eq(sale.id, id), eq(sale.businessId, membership.businessId)))
    .limit(1);

  if (!receipt) notFound();
  const items = await db.select().from(saleItem).where(eq(saleItem.saleId, receipt.id)).orderBy(saleItem.createdAt);
  const money = (value: number) => `Rp ${Number(value).toLocaleString("id-ID")}`;

  return (
    <main className="min-h-dvh bg-[#f4faf7] px-4 py-8 text-[#15211d]">
      <div className="mx-auto max-w-xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <a href="/pos" className="text-sm font-bold text-[#198760]">← Kembali ke kasir</a>
          <PrintButton />
        </div>
        <article className="rounded-2xl border border-[#dfe8e3] bg-white p-7 shadow-[0_8px_24px_rgba(16,65,48,.06)] print:border-0 print:shadow-none">
          <header className="border-b border-dashed border-[#cddbd3] pb-5 text-center">
            <h1 className="text-2xl font-extrabold">waze<span className="text-[#198760]">POS</span></h1>
            <p className="mt-2 text-sm font-bold">{receipt.businessName}</p>
            <p className="m-0 text-xs text-[#627069]">{receipt.outletName}</p>
          </header>
          <div className="flex justify-between gap-4 border-b border-dashed border-[#cddbd3] py-4 text-xs text-[#627069]">
            <div><p className="m-0 font-bold text-[#15211d]">{receipt.invoiceNumber}</p><p className="m-0 mt-1">{new Date(receipt.createdAt).toLocaleString("id-ID")}</p></div>
            <div className="text-right"><p className="m-0">Kasir</p><p className="m-0 font-bold text-[#15211d]">{receipt.cashierName}</p></div>
          </div>
          <div className="space-y-3 py-5">
            {items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><div><p className="m-0 font-semibold">{item.productName}</p><p className="m-0 text-xs text-[#627069]">{item.quantity} × {money(item.unitPrice)}</p></div><strong>{money(item.subtotal)}</strong></div>)}
          </div>
          <div className="space-y-2 border-t border-dashed border-[#cddbd3] pt-4 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{money(receipt.subtotal)}</strong></div>
            <div className="flex justify-between"><span>Diskon</span><strong>{money(receipt.discount)}</strong></div>
            <div className="flex justify-between text-lg font-extrabold"><span>Total</span><strong className="text-[#198760]">{money(receipt.total)}</strong></div>
            {receipt.paymentMethod === "qris" ? (
              <>
                <div className="flex justify-between pt-2 text-[#627069]">
                  <span className="font-bold text-[#de232c] flex items-center gap-1">QRIS DIGITAL</span>
                  <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-extrabold text-emerald-700">LUNAS</span>
                </div>
                <div className="flex justify-between text-xs text-[#627069]">
                  <span>Nominal Pas</span>
                  <span>{money(receipt.paidAmount)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between pt-2 text-[#627069]">
                  <span>{receipt.paymentMethod.toUpperCase()}</span>
                  <span>Dibayar {money(receipt.paidAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-[#198760]">
                  <span>Kembalian</span>
                  <span>{money(receipt.changeAmount)}</span>
                </div>
              </>
            )}
          </div>
          <p className="m-0 mt-7 border-t border-dashed border-[#cddbd3] pt-5 text-center text-xs text-[#627069]">Terima kasih sudah berbelanja.</p>
        </article>
      </div>
    </main>
  );
}
