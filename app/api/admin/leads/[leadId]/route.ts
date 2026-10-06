import { NextResponse } from "next/server";
import { getPlatformAdminRequestSession } from "@/server/admin/platform-admin-api";
import { updatePlatformAdminLead } from "@/server/admin/platform-admin-leads";
import { leadUpdateSchema } from "@/shared/admin/platform-admin-leads";

export const runtime = "nodejs";

type Context = { params: Promise<{ leadId: string }> };
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function authorize(context: Context) {
  const { session, allowed } = await getPlatformAdminRequestSession();
  if (!session) return { error: reply({ message: "Sesi tidak ditemukan." }, 401) };
  if (!allowed) return { error: reply({ message: "Akses admin ditolak." }, 403) };

  const { leadId } = await context.params;
  if (!leadId || leadId.length > 120) return { error: reply({ message: "ID lead tidak valid." }, 400) };

  return { leadId };
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
  try {
    body = await request.json();
  } catch {
    return reply({ message: "Data tidak valid." }, 400);
  }

  const parsed = leadUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return reply({ message: parsed.error.issues[0]?.message ?? "Data lead tidak valid." }, 422);
  }

  try {
    const lead = await updatePlatformAdminLead(access.leadId, parsed.data);
    if (!lead) return reply({ message: "Lead tidak ditemukan." }, 404);
    return reply({ lead, message: "Status lead tersimpan." });
  } catch {
    return reply({ message: "Status lead belum dapat disimpan. Coba lagi." }, 500);
  }
}
