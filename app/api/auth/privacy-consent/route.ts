import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema";
import { auth } from "@/server/auth/auth";
import { headers } from "next/headers";

export const runtime = "nodejs";

const privacyConsentSchema = z.object({
  email: z.email("Masukkan alamat email yang valid.").trim().toLowerCase(),
});

/**
 * Mencatat waktu persetujuan Kebijakan Privasi milik pendaftar manual tepat
 * setelah sign-up (sebelum verifikasi OTP selesai, memakai email sebagai kunci
 * karena sesi auto-sign-in belum tentu terbentuk).
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format data tidak valid." }, { status: 400 });
  }

  const parsed = privacyConsentSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Data persetujuan tidak valid." },
      { status: 422 },
    );
  }

  // Endpoint publik by-design (dipanggil sebelum sesi stabil), tetapi hanya
  // memperbarui kolom timestamp milik email yang memang sudah terdaftar —
  // tidak ada data sensitif yang bocor maupun diubah selain itu.
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  const now = new Date();

  try {
    if (session?.user.email?.toLowerCase() === parsed.data.email) {
      await db
        .update(user)
        .set({ privacyAcceptedAt: now, updatedAt: now })
        .where(eq(user.id, session.user.id));
    } else {
      await db
        .update(user)
        .set({ privacyAcceptedAt: now, updatedAt: now })
        .where(eq(user.email, parsed.data.email));
    }
  } catch {
    return NextResponse.json(
      { message: "Persetujuan belum berhasil disimpan. Coba lagi dari halaman verifikasi." },
      { status: 500 },
    );
  }

  return NextResponse.json({ message: "Persetujuan privasi tercatat." }, { status: 200 });
}
