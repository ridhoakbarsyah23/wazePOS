import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { markPaymentDisbursed } from "@/server/admin/platform-admin-payment-disbursement";
import { markPaymentDisbursedSchema } from "@/shared/validation/subscription";

export const runtime = "nodejs";

/**
 * Menandai pembayaran `paid` sebagai dicairkan ke rekening pribadi.
 * Hanya Dashboard Admin. Transfer antar-rekening tetap dilakukan manual
 * via mobile banking; endpoint ini mencatat penandanya.
 */
export async function POST(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format pencairan tidak valid." }, { status: 400 });
  }

  const parsed = markPaymentDisbursedSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data pencairan tidak valid." }, { status: 422 });
  }

  const result = await markPaymentDisbursed(parsed.data, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });

  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  return NextResponse.json({ ok: true, message: "Pembayaran ditandai sudah dicairkan ke rekening pribadi." });
}
