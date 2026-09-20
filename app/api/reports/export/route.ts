import { and, desc, eq, gte, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { outlet, sale } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getBusinessSubscription, getMembership } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature } from "@/lib/plans";
import { createSalesReportCsv, getReportDayRange } from "@/lib/reporting";

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });
  }

  const membership = await getMembership(session.user.id);
  if (!membership || !canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki akses ke laporan." }, { status: 403 });
  }

  const currentSubscription = await getBusinessSubscription(membership.businessId);
  const subscriptionDetails = getSubscriptionStatusDetails(currentSubscription);
  if (!subscriptionDetails.isValid) {
    return NextResponse.json(
      { message: subscriptionDetails.message, code: "SUBSCRIPTION_EXPIRED" },
      { status: 403 },
    );
  }
  if (!hasPlanFeature(currentSubscription?.plan, "exportReports")) {
    return NextResponse.json(
      { message: "Ekspor laporan tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const requestedOutletId = url.searchParams.get("outlet");
  const { dateKey, start, end } = getReportDayRange(url.searchParams.get("date") ?? undefined);
  let outletId: string | null = null;

  if (requestedOutletId && requestedOutletId !== "all") {
    const [ownedOutlet] = await db
      .select({ id: outlet.id })
      .from(outlet)
      .where(and(eq(outlet.id, requestedOutletId), eq(outlet.businessId, membership.businessId)))
      .limit(1);
    if (!ownedOutlet) {
      return NextResponse.json({ message: "Gerai tidak valid." }, { status: 422 });
    }
    outletId = ownedOutlet.id;
  }

  const filters = [
    eq(sale.businessId, membership.businessId),
    gte(sale.createdAt, start),
    lt(sale.createdAt, end),
    ...(outletId ? [eq(sale.outletId, outletId)] : []),
  ];
  const rows = await db
    .select({
      invoiceNumber: sale.invoiceNumber,
      outletName: outlet.name,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paidAmount: sale.paidAmount,
      changeAmount: sale.changeAmount,
      createdAt: sale.createdAt,
    })
    .from(sale)
    .innerJoin(outlet, eq(outlet.id, sale.outletId))
    .where(and(...filters))
    .orderBy(desc(sale.createdAt));

  const csv = createSalesReportCsv(rows);
  return new Response(csv, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="laporan-penjualan-${dateKey}.csv"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
