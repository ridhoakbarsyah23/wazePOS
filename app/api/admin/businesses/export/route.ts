import { NextResponse } from "next/server";
import { getPlatformAdminBusinessExportRows } from "@/server/admin/platform-admin-dashboard";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { recordPlatformAdminAudit } from "@/server/admin/platform-admin-audit";
import { buildCsvResponse, formatCsvDate } from "@/shared/admin/platform-admin-csv";
import { formatBusinessReference, platformAdminStateMeta } from "@/shared/admin/platform-admin-ui";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  const url = new URL(request.url);
  const result = await getPlatformAdminBusinessExportRows({
    query: url.searchParams.get("q") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    businessType: url.searchParams.get("businessType") ?? undefined,
    plan: url.searchParams.get("plan") ?? undefined,
    onboarding: url.searchParams.get("onboarding") ?? undefined,
    registeredFrom: url.searchParams.get("registeredFrom") ?? undefined,
    registeredTo: url.searchParams.get("registeredTo") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
  });

  await recordPlatformAdminAudit({
    action: "business_export",
    actorUserId: session.user.id,
    actorEmail: session.user.email,
    actorName: session.user.name,
    entityType: "business_directory",
    metadata: {
      filters: result.filters,
      exported: result.businesses.length,
      truncated: result.truncated,
    },
  });

  const header = [
    "Kode usaha",
    "ID internal",
    "Nama usaha",
    "Jenis usaha",
    "Owner",
    "Email owner",
    "Paket",
    "Status subscription",
    "Akhir trial/periode",
    "Tanggal terdaftar",
    "Outlet",
    "Anggota",
    "Jumlah transaksi",
    "Pendapatan transaksi",
    "Aktivitas terakhir",
    "Onboarding",
  ];
  const rows = result.businesses.map((business) => [
    formatBusinessReference(business.id, business.createdAt),
    business.id,
    business.name,
    business.type,
    business.ownerName,
    business.ownerEmail,
    business.plan,
    platformAdminStateMeta[business.state].label,
    formatCsvDate(business.state.startsWith("trial") ? business.trialEndsAt : business.currentPeriodEnd),
    formatCsvDate(business.createdAt),
    business.outletCount,
    business.memberCount,
    business.saleCount ?? 0,
    business.grossRevenue ?? 0,
    formatCsvDate(business.lastActivityAt),
    business.onboardingCompleted ? "Selesai" : "Belum selesai",
  ]);
  const filename = `daftar-usaha-platform-${new Date().toISOString().slice(0, 10)}.csv`;

  return buildCsvResponse(header, rows, filename, result.truncated);
}
