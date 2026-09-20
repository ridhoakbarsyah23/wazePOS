import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { auth } from "@/lib/auth";
import { canManageBusiness, getMembership } from "@/lib/auth-session";
import { businessSettingsSchema } from "@/lib/validation/settings";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const membership = await getMembership(session.user.id);
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Anda tidak memiliki izin mengubah profil usaha." }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format tidak valid." }, { status: 400 });
  }

  const parsed = businessSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Data usaha tidak valid." },
      { status: 422 },
    );
  }

  try {
    const [updated] = await db
      .update(business)
      .set({
        name: parsed.data.name,
        type: parsed.data.type,
        updatedAt: new Date(),
      })
      .where(eq(business.id, membership.businessId))
      .returning({ name: business.name, type: business.type });

    if (!updated) {
      return NextResponse.json({ message: "Usaha tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({ message: "Profil usaha berhasil diperbarui.", business: updated });
  } catch (error) {
    console.error("Failed to update business settings", error);
    return NextResponse.json({ message: "Gagal memperbarui profil usaha." }, { status: 500 });
  }
}
