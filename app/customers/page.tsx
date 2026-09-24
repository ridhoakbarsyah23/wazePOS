import { and, eq, sql } from "drizzle-orm";
import { Users } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { CustomerManager, type CustomerListItem } from "@/components/customer-manager";
import { Badge } from "@/components/ui/badge";
import { db } from "@/db";
import { customer, sale } from "@/db/schema";
import { requireDashboardAccess } from "@/lib/dashboard-access";
import { getPlanLimits } from "@/lib/plans";

export default async function CustomersPage() {
  const access = await requireDashboardAccess({ rule: "manageBusiness" });
  if (!access.ok) return access.lockout;
  const { session, membership, currentSubscription, subDetails, allowDarkMode } = access;

  const rows = await db
    .select({
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      note: customer.note,
      createdAt: customer.createdAt,
      transactionCount: sql<number>`count(${sale.id})::int`,
      totalSpent: sql<number>`coalesce(sum(case when ${sale.status} = 'completed' then ${sale.total} else 0 end), 0)::int`,
      lastVisitAt: sql<Date | null>`max(${sale.createdAt})`,
    })
    .from(customer)
    .leftJoin(sale, and(eq(sale.customerId, customer.id), eq(sale.businessId, membership.businessId)))
    .where(eq(customer.businessId, membership.businessId))
    .groupBy(customer.id)
    .orderBy(customer.name);

  const customers: CustomerListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    note: row.note,
    createdAt: new Date(row.createdAt).toISOString(),
    transactionCount: Number(row.transactionCount),
    totalSpent: Number(row.totalSpent),
    lastVisitAt: row.lastVisitAt ? new Date(row.lastVisitAt).toISOString() : null,
  }));

  const planLimits = getPlanLimits(currentSubscription?.plan);

  return (
    <AppHeader
      businessName={membership.businessName}
      userName={session.user.name}
      role={membership.role}
      trialDaysRemaining={subDetails.isTrialing ? subDetails.daysRemaining : null}
      allowDarkMode={allowDarkMode}
    >
      <section className="mx-auto w-[min(1140px,calc(100%-24px))] py-6 sm:w-[min(1140px,calc(100%-40px))] sm:py-10 animate-page-enter">
        <div className="relative overflow-hidden rounded-3xl border border-[#d8e8df] bg-gradient-to-br from-white via-[#f8fcfa] to-[#eaf7f0] p-5 shadow-[0_10px_35px_rgba(16,65,48,.07)] sm:p-7">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-emerald-300/20 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#198760] to-[#126b4b] text-white shadow-[0_10px_24px_rgba(25,135,96,.25)]">
              <Users className="size-6" />
            </span>
            <div className="min-w-0">
              <Badge variant="outline" className="w-fit border-emerald-200 bg-white/80 text-emerald-800">
                Pelanggan
              </Badge>
              <h1 className="mt-2 text-2xl font-black tracking-[-1px] text-[#15211d] sm:text-4xl">
                Daftar Pelanggan
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-[#627069]">
                Kelola kontak pelanggan, pantau riwayat kunjungan, dan hubungi kembali pelanggan setia Anda.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-7">
          <CustomerManager initialCustomers={customers} maxCustomers={planLimits.maxCustomers} />
        </div>
      </section>
    </AppHeader>
  );
}

export const revalidate = 0;
