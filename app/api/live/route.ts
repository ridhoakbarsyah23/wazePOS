import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Liveness probe ringan untuk Docker HEALTHCHECK.
// Sengaja TIDAK menyentuh database/env agar container dianggap sehat
// selama proses Node jalan — kesiapan bisnis tetap di /api/health.
export async function GET() {
  return NextResponse.json({ ok: true }, { status: 200 });
}
