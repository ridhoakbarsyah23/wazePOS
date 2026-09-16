import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { outlet, sale, saleItem } from "@/db/schema";
import { AppHeader } from "@/components/app-header";
import { canManageBusiness, getMembership, requireSession } from "@/lib/auth-session";

export default async function ReportsPage() {
  const session = await requireSession();
  const membership = await getMembership(session.user.id);
  if (!membership) redirect("/onboarding");
  if (!canManageBusiness(membership.role)) redirect("/pos");

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const [sales, topProducts] = await Promise.all([
    db.select({ id: sale.id, invoiceNumber: sale.invoiceNumber, total: sale.total, paymentMethod: sale.paymentMethod, outletName: outlet.name, createdAt: sale.createdAt })
      .from(sale).innerJoin(outlet, eq(outlet.id, sale.outletId))
      .where(and(eq(sale.businessId, membership.businessId), eq(sale.status, "completed"), gte(sale.createdAt, start), lt(sale.createdAt, end)))
      .orderBy(desc(sale.createdAt)),
    db.select({ productName: saleItem.productName, quantity: sql<number>`sum(${saleItem.quantity})::int`, revenue: sql<number>`sum(${saleItem.subtotal})::int` })
      .from(saleItem).innerJoin(sale, eq(sale.id, saleItem.saleId))
      .where(and(eq(sale.businessId, membership.businessId), eq(sale.status, "completed"), gte(sale.createdAt, start), lt(sale.createdAt, end)))
      .groupBy(saleItem.productName).orderBy(desc(sql`sum(${saleItem.quantity})`)).limit(10),
  ]);

  const total = sales.reduce((sum, item) => sum + Number(item.total), 0);
  const paymentTotals = sales.reduce<Record<string, number>>((result, item) => {
    result[item.paymentMethod] = (result[item.paymentMethod] ?? 0) + Number(item.total);
    return result;
  }, {});

  return (
    <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
      <AppHeader
        businessName={membership.businessName}
        role={membership.role}
      />
      <section className="mx-auto w-[min(1120px,calc(100%-32px))] py-10 animate-page-enter">
        <span className="section-kicker">Reports</span>
        <h1 className="mt-3 mb-2 text-3xl tracking-[-1.2px]">Laporan penjualan hari ini</h1>
        <p className="m-0 text-sm leading-7 text-[#627069]">{start.toLocaleDateString("id-ID", { dateStyle: "full" })}</p>
        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {[["Omzet", `Rp ${total.toLocaleString("id-ID")}`], ["Transaksi", String(sales.length)], ["Produk terjual", String(topProducts.reduce((sum, item) => sum + Number(item.quantity), 0))]].map(([label, value]) => <article key={label} className="rounded-2xl border border-[#dfe8e3] bg-white p-5 shadow-[0_8px_24px_rgba(16,65,48,.06)]"><p className="m-0 text-xs font-semibold uppercase tracking-[0.1em] text-[#627069]">{label}</p><p className="mt-3 text-2xl font-extrabold text-[#198760]">{value}</p></article>)}
        </div>
        <div className="mt-7 grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]"><h2 className="text-lg font-extrabold">Produk terlaris</h2><div className="mt-4 space-y-3">{topProducts.map((item) => <div key={item.productName} className="flex justify-between rounded-xl bg-[#f7faf8] px-4 py-3 text-sm"><span><strong>{item.productName}</strong><small className="ml-2 text-[#627069]">{item.quantity} item</small></span><strong>Rp {Number(item.revenue).toLocaleString("id-ID")}</strong></div>)}{topProducts.length === 0 && <p className="text-sm text-[#627069]">Belum ada penjualan hari ini.</p>}</div></section>
          <section className="rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]"><h2 className="text-lg font-extrabold">Metode pembayaran</h2><div className="mt-4 space-y-3">{Object.entries(paymentTotals).map(([method, amount]) => <div key={method} className="flex justify-between rounded-xl bg-[#f7faf8] px-4 py-3 text-sm"><span className="font-semibold uppercase">{method}</span><strong>Rp {amount.toLocaleString("id-ID")}</strong></div>)}{Object.keys(paymentTotals).length === 0 && <p className="text-sm text-[#627069]">Belum ada pembayaran hari ini.</p>}</div></section>
        </div>
        <section className="mt-7 rounded-2xl border border-[#dfe8e3] bg-white p-6 shadow-[0_8px_24px_rgba(16,65,48,.06)]"><h2 className="text-lg font-extrabold">Transaksi hari ini</h2><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-[#e7efea] text-[#627069]"><th className="px-3 py-2">Invoice</th><th className="px-3 py-2">Outlet</th><th className="px-3 py-2">Waktu</th><th className="px-3 py-2">Metode</th><th className="px-3 py-2 text-right">Total</th></tr></thead><tbody>{sales.map((item) => <tr key={item.id} className="border-b border-[#f0f4f1]"><td className="px-3 py-3"><a href={`/sales/${item.id}`} className="font-semibold text-[#198760] underline">{item.invoiceNumber}</a></td><td className="px-3 py-3">{item.outletName}</td><td className="px-3 py-3 text-[#627069]">{new Date(item.createdAt).toLocaleTimeString("id-ID")}</td><td className="px-3 py-3 uppercase">{item.paymentMethod}</td><td className="px-3 py-3 text-right font-bold">Rp {Number(item.total).toLocaleString("id-ID")}</td></tr>)}</tbody></table></div></section>
      </section>
    </main>
  );
}
