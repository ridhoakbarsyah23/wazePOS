import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { user, verification } from "@/db/schema";
import { forgotPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = forgotPasswordSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { message: "Masukkan alamat email yang valid." },
        { status: 422 }
      );
    }

    const { email } = result.data;

    // Cari akun berdasarkan email
    const [existingUser] = await db
      .select({ id: user.id, name: user.name })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existingUser) {
      // Keamanan: jangan membocorkan apakah email terdaftar atau tidak
      return NextResponse.json(
        {
          message:
            "Jika email terdaftar, instruksi atur ulang kata sandi telah disiapkan.",
        },
        { status: 200 }
      );
    }

    // Buat token verifikasi baru (berlaku 1 jam)
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Hapus token lama jika ada
    await db.delete(verification).where(eq(verification.identifier, email));

    // Simpan token verifikasi
    await db.insert(verification).values({
      id: randomUUID(),
      identifier: email,
      value: token,
      expiresAt,
    });

    return NextResponse.json(
      {
        message: "Instruksi atur ulang kata sandi telah disiapkan.",
        token, // Mengembalikan token agar pengguna lokal/dev dapat langsung mereset tanpa SMTP
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
