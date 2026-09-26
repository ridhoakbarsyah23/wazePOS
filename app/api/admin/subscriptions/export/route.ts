import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { recordPlatformAdminAudit } from "@/server/admin/platform-admin-audit";
import { buildCsvResponse, formatCsvDate } from "@/shared/admin/platform-admin-csv";
import { getPlatformAdminSubscriptionExportRows } from "@/server/admin/platform-admin-subscriptions";
import { getSubscriptionBoundary, platformAdminStateMeta } from "@/shared/admin/platform-admin-ui";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  const url = new URL(request.url);
  const result = await getPlatformAdminSubscriptionExportRows({
    query: url.searchParams.get("q") ?? undefined,
    state: url.searchParams.get("state") ?? undefined,
    plan: url.searchParams.get("plan") ?? undefined,
  });

  await recordPlatformAdminAudit({
    action: "subscription_export",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name,
    entityType: "subscription_directory",
    metadata: {
      filters: result.filters,
      exported: result.subscriptions.length,
      truncated: result.truncated,
    },
  });

  const header = [
    "ID langganan",
    "ID usaha",
    "Nama usaha",
    "Jenis usaha",
    "Owner",
    "Email owner",
    "Paket",
    "Status subscription",
    "Batas waktu",
    "Mulai periode",
    "Akhir periode",
    "Tanggal terdaftar",
  ];
  const rows = result.subscriptions.map((item) => [
    item.id,
    item.businessId,
    item.businessName,
    item.businessType,
    item.ownerName,
    item.ownerEmail,
    item.plan,
    platformAdminStateMeta[item.state].label,
    formatCsvDate(getSubscriptionBoundary(item)),
    formatCsvDate(item.currentPeriodStart),
    formatCsvDate(item.currentPeriodEnd),
    formatCsvDate(item.createdAt),
  ]);
  const filename = `langganan-platform-${new Date().toISOString().slice(0, 10)}.csv`;

  return buildCsvResponse(header, rows, filename, result.truncated);
}
