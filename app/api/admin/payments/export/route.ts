import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/lib/admin/platform-admin-api";
import { recordPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";
import { buildCsvResponse, formatCsvDate } from "@/lib/admin/platform-admin-csv";
import { getPlatformAdminPaymentExportRows } from "@/lib/admin/platform-admin-payments";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  const url = new URL(request.url);
  const result = await getPlatformAdminPaymentExportRows({
    query: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    plan: url.searchParams.get("plan") ?? undefined,
  });

  await recordPlatformAdminAudit({
    action: "payment_export",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name,
    entityType: "payment_directory",
    metadata: {
      filters: result.filters,
      exported: result.payments.length,
      truncated: result.truncated,
    },
  });

  const header = [
    "ID pembayaran",
    "ID usaha",
    "Nama usaha",
    "Email owner",
    "Paket",
    "Nominal",
    "Mata uang",
    "Status",
    "Provider",
    "Order ID",
    "Tipe pembayaran",
    "Dibuat",
    "Dibayar",
  ];
  const rows = result.payments.map((item) => [
    item.id,
    item.businessId,
    item.businessName,
    item.ownerEmail,
    item.plan,
    item.amount,
    item.currency,
    item.status,
    item.provider,
    item.providerOrderId,
    item.providerPaymentType,
    formatCsvDate(item.createdAt),
    formatCsvDate(item.paidAt),
  ]);
  const filename = `pembayaran-platform-${new Date().toISOString().slice(0, 10)}.csv`;

  return buildCsvResponse(header, rows, filename, result.truncated);
}
