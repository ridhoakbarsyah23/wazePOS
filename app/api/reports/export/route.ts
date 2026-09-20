import { and, desc, eq, gte, ilike, lt } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { outlet, sale } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getBusinessSubscription, getMembership } from "@/lib/auth-session";
import { getSubscriptionStatusDetails, hasPlanFeature } from "@/lib/plans";
import { createSalesReportWorkbook, formatReportRange, getReportDateRange, paymentLabel } from "@/lib/reporting";

const paymentMethods = ["cash", "qris", "debit", "credit"] as const;
const statuses = ["completed", "voided"] as const;

export const runtime = "nodejs";

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
  const legacyDate = url.searchParams.get("date") ?? undefined;
  const { fromKey, toKey, start, end } = getReportDateRange(
    url.searchParams.get("from") ?? legacyDate,
    url.searchParams.get("to") ?? legacyDate,
  );
  const requestedPayment = url.searchParams.get("payment");
  const paymentMethod = paymentMethods.find((method) => method === requestedPayment) ?? null;
  const requestedStatus = url.searchParams.get("status");
  const status = statuses.find((item) => item === requestedStatus) ?? null;
  const query = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  let outletId: string | null = null;
  let outletLabel = "Semua Gerai";

  if (requestedOutletId && requestedOutletId !== "all") {
    const [ownedOutlet] = await db
      .select({ id: outlet.id, name: outlet.name })
      .from(outlet)
      .where(and(eq(outlet.id, requestedOutletId), eq(outlet.businessId, membership.businessId)))
      .limit(1);
    if (!ownedOutlet) {
      return NextResponse.json({ message: "Gerai tidak valid." }, { status: 422 });
    }
    outletId = ownedOutlet.id;
    outletLabel = ownedOutlet.name;
  }

  const filters = [
    eq(sale.businessId, membership.businessId),
    gte(sale.createdAt, start),
    lt(sale.createdAt, end),
    ...(outletId ? [eq(sale.outletId, outletId)] : []),
    ...(paymentMethod ? [eq(sale.paymentMethod, paymentMethod)] : []),
    ...(status ? [eq(sale.status, status)] : []),
    ...(query ? [ilike(sale.invoiceNumber, `%${query}%`)] : []),
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
      voidReason: sale.voidReason,
      createdAt: sale.createdAt,
    })
    .from(sale)
    .innerJoin(outlet, eq(outlet.id, sale.outletId))
    .where(and(...filters))
    .orderBy(desc(sale.createdAt));

  const workbook = await createSalesReportWorkbook({
    rows,
    businessName: membership.businessName,
    periodLabel: formatReportRange(fromKey, toKey),
    outletLabel,
    paymentFilter: paymentMethod ? paymentLabel(paymentMethod) : "Semua metode",
    statusFilter: status === "completed" ? "Selesai" : status === "voided" ? "Dibatalkan" : "Semua status",
  });
  const filenamePeriod = fromKey === toKey ? fromKey : `${fromKey}_${toKey}`;

  return new Response(new Uint8Array(workbook), {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="laporan-penjualan-${filenamePeriod}.xlsx"`,
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
