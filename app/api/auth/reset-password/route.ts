import { and, eq, gt } from "drizzle-orm";
import { NextResponse } from "next/server";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, user, verification } from "@/db/schema";
import { resetPasswordSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = resetPasswordSchema.safeParse(json);

    if (!result.success) {
      const firstError = Object.values(result.error.flatten().fieldErrors)[0]?.[0];
      return NextResponse.json(
        { message: firstError ?? "Data tidak valid." },
        { status: 422 }
      );
    }

    const { token, password } = result.data;

    // Cari token verifikasi yang masih berlaku
    const [tokenRecord] = await db
      .select({
        id: verification.id,
        identifier: verification.identifier,
        value: verification.value,
        expiresAt: verification.expiresAt,
      })
      .from(verification)
      .where(
        and(
          eq(verification.value, token),
          gt(verification.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!tokenRecord) {
      return NextResponse.json(
        { message: "Tautan reset kata sandi tidak valid atau telah kedaluwarsa." },
        { status: 400 }
      );
    }

    const email = tokenRecord.identifier;

    // Cari user berdasarkan email
    const [userRecord] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!userRecord) {
      return NextResponse.json(
        { message: "Akun pengguna tidak ditemukan." },
        { status: 404 }
      );
    }

    // Hash password baru
    const hashedPassword = await hashPassword(password);

    // Update password di tabel account
    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(account.userId, userRecord.id));

    // Hapus token verifikasi yang sudah digunakan
    await db.delete(verification).where(eq(verification.id, tokenRecord.id));

    return NextResponse.json(
      { message: "Kata sandi akun Anda berhasil diperbarui. Silakan masuk kembali." },
      { status: 200 }
    );
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
