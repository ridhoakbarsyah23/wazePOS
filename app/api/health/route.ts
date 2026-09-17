import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const environment = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(process.env.BETTER_AUTH_SECRET),
    authUrl: process.env.BETTER_AUTH_URL ?? null,
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? null,
  };

  if (!environment.databaseUrl || !environment.authSecret) {
    return NextResponse.json(
      { ok: false, environment, database: { connected: false, authTables: false } },
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
        environment,
        database: { connected: true, authTables },
      },
      { status: authTables ? 200 : 503 },
    );
  } catch (error) {
    console.error("Health check database failure", error);
    return NextResponse.json(
      { ok: false, environment, database: { connected: false, authTables: false } },
      { status: 503 },
    );
  }
}
