import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { business } from "@/db/schema";
import { auth } from "@/lib/auth/auth";
import { canManageBusiness, getWorkspaceContext } from "@/lib/auth/auth-session";
import { hasPlanFeature } from "@/lib/billing/plans";
import { normalizeReceiptSettings, receiptSettingsSchema } from "@/lib/validation/receipt-settings";

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ message: "Sesi berakhir." }, { status: 401 });

  const context = await getWorkspaceContext(session.user.id);
  const membership = context.membership;
  if (!membership) return NextResponse.json({ message: "Profil tidak ditemukan." }, { status: 403 });
  if (!canManageBusiness(membership.role)) {
    return NextResponse.json({ message: "Hanya Pemilik Usaha atau Admin yang dapat mengubah pengaturan struk." }, { status: 403 });
  }
  if (!hasPlanFeature(context.currentSubscription?.plan, "receiptSettings")) {
    return NextResponse.json(
      { message: "Pengaturan struk kustom hanya tersedia pada Paket Bisnis.", code: "PLAN_FEATURE_REQUIRED" },
      { status: 403 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Format tidak valid." }, { status: 400 });
  }

  const parsed = receiptSettingsSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.issues[0]?.message ?? "Pengaturan struk tidak valid." },
      { status: 422 },
    );
  }

  try {
    const [updated] = await db
      .update(business)
      .set({ receiptSettings: parsed.data, updatedAt: new Date() })
      .where(eq(business.id, membership.businessId))
      .returning({ receiptSettings: business.receiptSettings });

    if (!updated) {
      return NextResponse.json({ message: "Usaha tidak ditemukan." }, { status: 404 });
    }

    return NextResponse.json({
      message: "Pengaturan struk berhasil disimpan.",
      receiptSettings: normalizeReceiptSettings(updated.receiptSettings),
    });
  } catch (error) {
    console.error("Failed to update receipt settings", error);
    return NextResponse.json({ message: "Gagal menyimpan pengaturan struk." }, { status: 500 });
  }
}
