import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  // Detail environment hanya untuk internal/debugging; produksi cukup status ok
  // supaya endpoint publik ini tidak membocorkan konfigurasi ke pihak luar.
  const includeDetails = process.env.NODE_ENV !== "production";

  const passwordResetEmail = Boolean(
    process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL,
  );
  const environment = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.BETTER_AUTH_SECRET),
    authUrl: process.env.BETTER_AUTH_URL ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
    passwordResetEmail,
  };
  const requiredEnvironmentReady =
    environment.databaseUrl &&
    environment.authSecret &&
    (process.env.NODE_ENV !== "production" || passwordResetEmail);

  if (!requiredEnvironmentReady) {
    return NextResponse.json(
      { ok: false, ...(includeDetails ? { environment } : {}), database: { connected: false, authTables: false } },
      { status: 503 },
    );
  }

  try {
    const result = await db.execute<{ userTable: string | null; accountTable: string | null }>(
      sql`select to_regclass('public.user') as "userTable", to_regclass('public.account') as "accountTable"`,
    );
    const tables = result[0];
    const authTables = Boolean(tables?.userTable && tables?.accountTable);

    return NextResponse.json(
      {
        ok: authTables,
        ...(includeDetails ? { environment } : {}),
        database: { connected: true, authTables },
      },
      { status: authTables ? 200 : 503 },
    );
  } catch (error) {
    console.error("Health check database failure", error);
    const errorCode =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "string"
        ? error.code
        : "DATABASE_CONNECTION_FAILED";
    return NextResponse.json(
      {
        ok: false,
        ...(includeDetails ? { environment, errorCode } : {}),
        database: { connected: false, authTables: false },
      },
      { status: 503 },
    );
  }
}
