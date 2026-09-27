import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { createBusinessFollowUp, getBusinessFollowUps } from "@/server/admin/platform-admin-follow-up";
import { followUpInputSchema } from "@/shared/admin/platform-admin-follow-up";

export const runtime = "nodejs";
type Context = { params: Promise<{ businessId: string }> };
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function authorize(context: Context) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return { error: reply({ message: "Sesi tidak ditemukan." }, 401) };
  if (!allowed) return { error: reply({ message: "Akses admin ditolak." }, 403) };
  const { businessId } = await context.params;
  if (!businessId || businessId.length > 120) return { error: reply({ message: "ID usaha tidak valid." }, 400) };
  return { session, businessId };
}

export async function GET(request: Request, context: Context) {
  const access = await authorize(context);
  if (access.error) return access.error;
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  if (!Number.isSafeInteger(page) || page < 1) return reply({ message: "Halaman tidak valid." }, 400);
  try {
    const data = await getBusinessFollowUps(access.businessId, page);
    return data ? reply(data) : reply({ message: "Usaha tidak ditemukan." }, 404);
  } catch {
    return reply({ message: "Riwayat tindak lanjut belum dapat dimuat. Coba lagi." }, 500);
  }
}

export async function POST(request: Request, context: Context) {
  const access = await authorize(context);
  if (access.error) return access.error;
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin || request.headers.get("sec-fetch-site") === "cross-site") {
    return reply({ message: "Asal permintaan tidak diizinkan." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return reply({ message: "Gunakan data JSON." }, 415);
  }
  let body: unknown;
  try { body = await request.json(); } catch { return reply({ message: "Data tidak valid." }, 400); }
  const parsed = followUpInputSchema.safeParse(body);
  if (!parsed.success) return reply({ message: parsed.error.issues[0]?.message ?? "Data tidak valid." }, 400);
  try {
    const result = await createBusinessFollowUp(access.businessId, parsed.data, access.session.user);
    if (result.outcome === "not_found") return reply({ message: "Usaha tidak ditemukan." }, 404);
    if (result.outcome === "conflict") return reply({ message: "Ada pembaruan yang lebih baru. Muat ulang riwayat, tinjau status terbaru, lalu simpan kembali." }, 409);
    return reply({ entry: result.entry }, 201);
  } catch {
    return reply({ message: "Catatan belum dapat disimpan. Muat ulang riwayat sebelum mencoba lagi." }, 500);
  }
}
