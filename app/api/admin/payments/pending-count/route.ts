import { NextResponse } from "next/server";
import { getPendingPaymentNotificationCounts } from "@/server/admin/platform-admin-payment-notifications";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Jumlah pembayaran menunggu untuk bell notifikasi dashboard admin.
 * Di-polling oleh `PlatformAdminPaymentNotificationBell` setiap 30 detik.
 */
export async function GET() {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  try {
    const counts = await getPendingPaymentNotificationCounts();
    return NextResponse.json(counts, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json({ message: "Jumlah pembayaran belum dapat dimuat." }, { status: 500 });
  }
}
