import { NextResponse } from "next/server";
import { getPlatformAdminBusinessExportRows } from "@/lib/platform-admin-dashboard";
import { getPlatformAdminRequestSession } from "@/lib/platform-admin-api";
import { recordPlatformAdminAudit } from "@/lib/platform-admin-audit";
import { platformAdminStateMeta } from "@/lib/platform-admin-ui";

export const runtime = "nodejs";

function escapeCsv(value: string | number | null | undefined) {
  const raw = value == null ? "" : String(value);
  const normalized = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return /[",\n\r]/.test(normalized) ? `"${normalized.replaceAll('"', '""')}"` : normalized;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

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
    "ID usaha",
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
    business.id,
    business.name,
    business.type,
    business.ownerName,
    business.ownerEmail,
    business.plan,
    platformAdminStateMeta[business.state].label,
    formatDate(business.state.startsWith("trial") ? business.trialEndsAt : business.currentPeriodEnd),
    formatDate(business.createdAt),
    business.outletCount,
    business.memberCount,
    business.saleCount ?? 0,
    business.grossRevenue ?? 0,
    formatDate(business.lastActivityAt),
    business.onboardingCompleted ? "Selesai" : "Belum selesai",
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((value) => escapeCsv(value)).join(","))
    .join("\r\n");
  const filename = `daftar-usaha-platform-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(`\uFEFF${csv}\r\n`, {
    status: 200,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": "text/csv; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...(result.truncated ? { "X-Export-Truncated": "true" } : {}),
    },
  });
}
