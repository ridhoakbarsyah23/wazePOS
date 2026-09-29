import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { verifyBankTransferPayment } from "@/server/admin/platform-admin-payment-verification";
import { verifyBankTransferSchema } from "@/shared/validation/subscription";

export const runtime = "nodejs";

/**
 * Verifikasi transfer bank: `approve` mengaktifkan paket 1 tahun,
 * `reject` menandai pembayaran gagal. Hanya Platform Admin.
 */
export async function POST(request: Request) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return NextResponse.json({ message: "Sesi tidak ditemukan." }, { status: 401 });
  if (!allowed) return NextResponse.json({ message: "Akses admin ditolak." }, { status: 403 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format verifikasi tidak valid." }, { status: 400 });
  }

  const parsed = verifyBankTransferSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data verifikasi tidak valid." }, { status: 422 });
  }

  const result = await verifyBankTransferPayment(parsed.data, {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
  });

  if (!result.ok) return NextResponse.json({ message: result.message }, { status: result.status });

  const emailSuffix =
    result.emailSent === true
      ? " Email pemberitahuan telah dikirim ke owner."
      : result.emailSkipped === "no-owner"
        ? " Email pemberitahuan tidak terkirim karena email owner belum tersedia."
        : result.emailSkipped === "no-config"
          ? " Email pemberitahuan tidak terkirim karena konfigurasi Resend belum tersedia."
          : " Email pemberitahuan gagal dikirim, tetapi status verifikasi tetap tersimpan.";
  return NextResponse.json({
    ok: true,
    status: result.status,
    emailSent: result.emailSent,
    message: `${result.status === "paid" ? "Pembayaran disetujui dan paket diaktifkan." : "Pembayaran ditolak."}${emailSuffix}`,
  });
}
