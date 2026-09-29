import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { subscriptionPayment } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { getMembership } from "@/server/auth/auth-session";
import { parseTransferProofDataUrl, uploadTransferProofSchema } from "@/shared/validation/subscription";

const MAX_PROOF_BYTES = 4_000_000;

function estimateBytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4);
}

/**
 * Upload bukti transfer oleh owner: simpan JPEG/PNG/WebP (base64) beserta
 * bank dan nama pengirim. Pembayaran tetap `pending` sampai diverifikasi admin.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi Anda sudah berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil usaha belum tersedia." }, { status: 403 });
  if (membership.role !== "owner") return NextResponse.json({ message: "Hanya pemilik usaha yang dapat mengunggah bukti transfer." }, { status: 403 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format bukti transfer tidak valid." }, { status: 400 });
  }

  const parsed = uploadTransferProofSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0]?.message ?? "Data bukti transfer tidak valid." }, { status: 422 });

  const proof = parseTransferProofDataUrl(parsed.data.proofDataUrl);
  if (!proof) return NextResponse.json({ message: "Bukti transfer harus berupa gambar JPG, PNG, atau WebP." }, { status: 422 });
  if (estimateBytes(proof.base64) > MAX_PROOF_BYTES) {
    return NextResponse.json({ message: "Ukuran bukti transfer maksimal 4 MB." }, { status: 413 });
  }

  const [payment] = await db
    .select({ id: subscriptionPayment.id, status: subscriptionPayment.status })
    .from(subscriptionPayment)
    .where(and(eq(subscriptionPayment.id, parsed.data.paymentId), eq(subscriptionPayment.businessId, membership.businessId)))
    .limit(1);

  if (!payment) return NextResponse.json({ message: "Pembayaran tidak ditemukan." }, { status: 404 });
  if (payment.status !== "pending") {
    return NextResponse.json({ message: "Bukti hanya dapat diunggah untuk pembayaran yang masih menunggu verifikasi." }, { status: 409 });
  }

  const uploadedAt = new Date();
  await db
    .update(subscriptionPayment)
    .set({
      senderBank: parsed.data.senderBank,
      senderAccountName: parsed.data.senderAccountName,
      transferProofData: proof.base64,
      transferProofMime: proof.mime,
      transferProofUploadedAt: uploadedAt,
      updatedAt: uploadedAt,
    })
    .where(and(eq(subscriptionPayment.id, payment.id), eq(subscriptionPayment.status, "pending")));

  return NextResponse.json({
    paymentId: payment.id,
    proofUploaded: true,
    message: "Bukti transfer diterima dan menunggu verifikasi admin.",
  });
}
