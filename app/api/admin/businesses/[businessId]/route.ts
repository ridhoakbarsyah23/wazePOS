import { NextResponse } from "next/server";
import { getPlatformAdminBusinessDetail } from "@/lib/admin/platform-admin-business-detail";
import { getPlatformAdminRequestSession } from "@/lib/admin/platform-admin-api";
import { recordPlatformAdminAudit } from "@/lib/admin/platform-admin-audit";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ businessId: string }> },
) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  const { businessId } = await params;
  if (!businessId || businessId.length > 120) {
    return NextResponse.json({ message: "ID usaha tidak valid." }, { status: 400 });
  }

  try {
    const detail = await getPlatformAdminBusinessDetail(businessId);
    if (!detail) return NextResponse.json({ message: "Usaha tidak ditemukan." }, { status: 404 });

    await recordPlatformAdminAudit({
      action: "business_detail_view",
      actorUserId: session.user.id,
      actorEmail: session.user.email,
      actorName: session.user.name,
      businessId,
      entityType: "business",
      entityId: businessId,
    });

    return NextResponse.json(
      { detail },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Failed to load Platform Admin business detail", error);
    return NextResponse.json({ message: "Detail usaha belum dapat dimuat." }, { status: 500 });
  }
}
