import { and, desc, eq, gte, ilike, lt, sql } from "drizzle-orm";
import {
  Banknote,
  CalendarDays,
  CreditCard,
  ExternalLink,
  History,
  QrCode,
  ReceiptText,
  RotateCcw,
  Search,
  Store,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SubscriptionLockout } from "@/components/subscription-lockout";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { outlet, sale, user } from "@/db/schema";
import { getWorkspaceContext, requireSession } from "@/lib/auth-session";
import { getSubscriptionStatusDetails } from "@/lib/plans";
import { formatReportRange, getReportDateRange, paymentLabel } from "@/lib/reporting";

const paymentMethods = ["cash", "qris", "debit", "credit"] as const;
const transactionStatuses = ["completed", "voided"] as const;

function dateKeyInJakarta(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function paymentIcon(method: string) {
  if (method === "cash") return <Banknote className="size-3.5" />;
  if (method === "qris") return <QrCode className="size-3.5" />;
  return <CreditCard className="size-3.5" />;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    outlet?: string;
    from?: string;
    to?: string;
    payment?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const session = await requireSession();
  const { membership, currentSubscription } = await getWorkspaceContext(session.user.id);
  if (!membership) redirect("/onboarding");

  const subDetails = getSubscriptionStatusDetails(currentSubscription);
  if (!subDetails.isValid) {
    if (membership.role === "owner") redirect("/subscription?expired=1");
    return (
      <main className="min-h-dvh bg-[#f4faf7] text-[#15211d]">
        <AppHeader businessName={membership.businessName} role={membership.role} />
        <SubscriptionLockout
          businessName={membership.businessName}
          role={membership.role}
          reason={subDetails.message}
        />
      </main>
    );
  }

  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000);
  const { fromKey, toKey, start, end } = getReportDateRange(
    params.from ?? dateKeyInJakarta(defaultFrom),
    params.to ?? dateKeyInJakarta(today),
  );
  const paymentMethod = paymentMethods.find((method) => method === params.payment) ?? null;
  const transactionStatus = transactionStatuses.find((status) => status === params.status) ?? null;
  const invoiceQuery = (params.q ?? "").trim().slice(0, 80);

  const outlets = await db
    .select({ id: outlet.id, name: outlet.name, slug: outlet.slug })
    .from(outlet)
    .where(eq(outlet.businessId, membership.businessId))
    .orderBy(outlet.name);
  const activeOutlet = outlets.find((item) => item.id === params.outlet) ?? null;

  const filters = [
    eq(sale.businessId, membership.businessId),
    gte(sale.createdAt, start),
    lt(sale.createdAt, end),
    ...(membership.role === "cashier" ? [eq(sale.cashierId, session.user.id)] : []),
    ...(activeOutlet ? [eq(sale.outletId, activeOutlet.id)] : []),
    ...(paymentMethod ? [eq(sale.paymentMethod, paymentMethod)] : []),
    ...(transactionStatus ? [eq(sale.status, transactionStatus)] : []),
    ...(invoiceQuery ? [ilike(sale.invoiceNumber, `%${invoiceQuery}%`)] : []),
  ];

  const [transactions, summary] = await Promise.all([
    db
      .select({
        id: sale.id,
        invoiceNumber: sale.invoiceNumber,
        status: sale.status,
        total: sale.total,
        paymentMethod: sale.paymentMethod,
        createdAt: sale.createdAt,
        outletName: outlet.name,
        cashierName: user.name,
      })
      .from(sale)
      .innerJoin(outlet, eq(outlet.id, sale.outletId))
      .innerJoin(user, eq(user.id, sale.cashierId))
      .where(and(...filters))
      .orderBy(desc(sale.createdAt))
      .limit(100),
    db
      .select({
        count: sql<number>`count(*)::int`,
        completedTotal: sql<number>`coalesce(sum(case when ${sale.status} = 'completed' then ${sale.total} else 0 end), 0)::int`,
        voidedCount: sql<number>`count(*) filter (where ${sale.status} = 'voided')::int`,
      })
      .from(sale)
      .where(and(...filters)),
  ]);

  const resultCount = Number(summary[0]?.count ?? 0);
  const completedTotal = Number(summary[0]?.completedTotal ?? 0);
  const voidedCount = Number(summary[0]?.voidedCount ?? 0);
  const headerOutlets = [{ id: "all", name: "Semua Gerai" }, ...outlets];

  return (
    <AppHeader
      businessName={membership.businessName}
      outletName={activeOutlet?.name ?? "Semua Gerai"}
      outlets={headerOutlets}
      activeOutletId={activeOutlet?.id ?? "all"}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
    >
      <section className="mx-auto w-[min(1180px,calc(100%-24px))] py-6 animate-page-enter sm:w-[min(1180px,calc(100%-40px))] sm:py-8">
        <header className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#187c59]">
              <History className="size-4" /> Riwayat transaksi
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.7px] text-[#17211d]">Semua transaksi</h1>
            <p className="mt-1 text-sm text-[#6c7a73]">
              {membership.role === "cashier"
                ? "Lihat transaksi yang Anda proses dan buka kembali detail struknya."
                : "Periksa transaksi seluruh gerai dan buka detail struk kapan saja."}
            </p>
          </div>
          <p className="text-xs text-[#78857f]">Periode {formatReportRange(fromKey, toKey)}</p>
        </header>

        <div className="mt-5 border border-[#d9e2dd] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5ebe8] px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-[#17211d]">Cari transaksi</h2>
              <p className="mt-0.5 text-xs text-[#78857f]">Gunakan filter untuk menemukan struk lebih cepat.</p>
            </div>
            <Link href="/transactions" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#68766f] hover:text-[#187c59]">
              <RotateCcw className="size-3.5" /> Reset
            </Link>
          </div>

          <form action="/transactions" method="get" className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
            <label className="relative grid gap-1.5 text-xs font-semibold text-[#52645c] sm:col-span-2 lg:col-span-2">
              Nomor invoice
              <Search className="pointer-events-none absolute bottom-3 left-3 size-4 text-[#87928d]" />
              <input
                name="q"
                defaultValue={invoiceQuery}
                maxLength={80}
                placeholder="Cari invoice..."
                className="h-10 border border-[#d6e0db] bg-white pl-9 pr-3 text-sm outline-none focus:border-[#187c59] focus:ring-2 focus:ring-[#187c59]/10"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              <span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 text-[#187c59]" /> Dari</span>
              <input type="date" name="from" defaultValue={fromKey} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#187c59]" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Sampai
              <input type="date" name="to" defaultValue={toKey} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#187c59]" />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c]">
              Status
              <select name="status" defaultValue={transactionStatus ?? "all"} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#187c59]">
                <option value="all">Semua status</option>
                <option value="completed">Selesai</option>
                <option value="voided">Dibatalkan</option>
              </select>
            </label>
            <Button type="submit" className="h-10">Tampilkan</Button>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c] sm:col-span-1 lg:col-span-2">
              Gerai
              <select name="outlet" defaultValue={activeOutlet?.id ?? "all"} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#187c59]">
                <option value="all">Semua gerai</option>
                {outlets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-[#52645c] sm:col-span-1 lg:col-span-2">
              Pembayaran
              <select name="payment" defaultValue={paymentMethod ?? "all"} className="h-10 border border-[#d6e0db] bg-white px-2 text-sm outline-none focus:border-[#187c59]">
                <option value="all">Semua metode</option>
                <option value="cash">Tunai</option>
                <option value="qris">QRIS</option>
                <option value="debit">Kartu debit</option>
                <option value="credit">Kartu kredit</option>
              </select>
            </label>
          </form>
        </div>

        <div className="mt-4 grid grid-cols-3 border border-[#d9e2dd] bg-white">
          <div className="p-3 sm:p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78857f]">Ditemukan</span>
            <strong className="mt-1 block text-lg text-[#17211d] sm:text-xl">{resultCount}</strong>
          </div>
          <div className="border-x border-[#e5ebe8] p-3 sm:p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78857f]">Nilai selesai</span>
            <strong className="mt-1 block truncate text-sm text-[#187c59] sm:text-xl">Rp {completedTotal.toLocaleString("id-ID")}</strong>
          </div>
          <div className="p-3 sm:p-4">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#78857f]">Dibatalkan</span>
            <strong className={`mt-1 block text-lg sm:text-xl ${voidedCount > 0 ? "text-rose-600" : "text-[#17211d]"}`}>{voidedCount}</strong>
          </div>
        </div>

        <div className="mt-4 overflow-hidden border border-[#d9e2dd] bg-white">
          <div className="flex items-center justify-between border-b border-[#e5ebe8] px-4 py-3">
            <div className="flex items-center gap-2">
              <ReceiptText className="size-4 text-[#187c59]" />
              <h2 className="text-sm font-bold text-[#17211d]">Daftar transaksi</h2>
            </div>
            <span className="text-xs text-[#78857f]">Maksimal 100 terbaru</span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#fafbfa] text-xs font-semibold text-[#68766f]">
                <tr>
                  <th className="px-4 py-3">Invoice</th>
                  <th className="px-4 py-3">Waktu</th>
                  <th className="px-4 py-3">Gerai &amp; kasir</th>
                  <th className="px-4 py-3">Pembayaran</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((item) => (
                  <tr key={item.id} className="border-t border-[#edf1ef] hover:bg-[#f8fbf9]">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-[#17211d]">{item.invoiceNumber}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-[#68766f]">{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs font-medium"><Store className="size-3 text-[#187c59]" /> {item.outletName}</span>
                      <span className="mt-1 flex items-center gap-1 text-[11px] text-[#78857f]"><UserRound className="size-3" /> {item.cashierName}</span>
                    </td>
                    <td className="px-4 py-3"><span className="inline-flex items-center gap-1.5 text-xs text-[#44534c]">{paymentIcon(item.paymentMethod)} {paymentLabel(item.paymentMethod)}</span></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-[10px] font-bold ${item.status === "completed" ? "bg-[#eaf7f0] text-[#187c59]" : "bg-rose-50 text-rose-700"}`}>
                        {item.status === "completed" ? "Selesai" : "Dibatalkan"}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${item.status === "voided" ? "text-rose-600 line-through" : "text-[#17211d]"}`}>Rp {Number(item.total).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/sales/${item.id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#187c59] hover:underline">
                        Detail <ExternalLink className="size-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-[#edf1ef] md:hidden">
            {transactions.map((item) => (
              <Link key={item.id} href={`/sales/${item.id}`} className="block p-4 active:bg-[#f3f8f5]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="block truncate font-mono text-xs font-semibold text-[#17211d]">{item.invoiceNumber}</span>
                    <span className="mt-1 block text-[11px] text-[#78857f]">{new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                  </div>
                  <strong className={item.status === "voided" ? "text-sm text-rose-600 line-through" : "text-sm text-[#17211d]"}>Rp {Number(item.total).toLocaleString("id-ID")}</strong>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-[#68766f]">{item.outletName} · {paymentLabel(item.paymentMethod)}</span>
                  <span className={item.status === "completed" ? "font-semibold text-[#187c59]" : "font-semibold text-rose-600"}>{item.status === "completed" ? "Selesai" : "Dibatalkan"}</span>
                </div>
              </Link>
            ))}
          </div>

          {transactions.length === 0 && (
            <div className="px-4 py-12 text-center">
              <ReceiptText className="mx-auto size-6 text-[#9aa69f]" />
              <p className="mt-2 text-sm font-semibold text-[#44534c]">Transaksi tidak ditemukan</p>
              <p className="mt-1 text-xs text-[#78857f]">Ubah periode atau filter pencarian.</p>
            </div>
          )}
        </div>
      </section>
    </AppHeader>
  );
}
