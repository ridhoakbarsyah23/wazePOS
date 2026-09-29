import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";

/**
 * Ambil bukti transfer sebagai data URL untuk ditampilkan ke Platform Admin.
 * Tidak di-cache: hanya admin terverifikasi yang boleh membuka.
 */
export async function GET(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  const paymentId = new URL(request.url).searchParams.get("paymentId")?.trim() ?? "";
  if (!paymentId || paymentId.length > 120) {
    return NextResponse.json({ message: "ID pembayaran tidak valid." }, { status: 400 });
  }

  const [payment] = await db
    .select({
      id: subscriptionPayment.id,
      businessId: subscriptionPayment.businessId,
      plan: subscriptionPayment.plan,
      amount: subscriptionPayment.amount,
      status: subscriptionPayment.status,
      senderBank: subscriptionPayment.senderBank,
      senderAccountName: subscriptionPayment.senderAccountName,
      transferProofData: subscriptionPayment.transferProofData,
      transferProofMime: subscriptionPayment.transferProofMime,
      transferProofUploadedAt: subscriptionPayment.transferProofUploadedAt,
      verifiedBy: subscriptionPayment.verifiedBy,
      verifiedAt: subscriptionPayment.verifiedAt,
      verificationNote: subscriptionPayment.verificationNote,
      createdAt: subscriptionPayment.createdAt,
    })
    .from(subscriptionPayment)
    .where(eq(subscriptionPayment.id, paymentId))
    .limit(1);

  if (!payment) return NextResponse.json({ message: "Pembayaran tidak ditemukan." }, { status: 404 });
  if (!payment.transferProofData || !payment.transferProofMime) {
    return NextResponse.json({ message: "Belum ada bukti transfer untuk pembayaran ini." }, { status: 404 });
  }

  return NextResponse.json(
    {
      ...payment,
      transferProofData: undefined,
      proofDataUrl: `data:${payment.transferProofMime};base64,${payment.transferProofData}`,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
