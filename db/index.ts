import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://wazepos:wazepos@127.0.0.1:5434/wazepos";

const globalDatabase = globalThis as unknown as {
  wazeposSql?: ReturnType<typeof postgres>;
};

function shouldUseSSL(connectionString: string) {
  const lowercased = connectionString.toLowerCase();
  if (lowercased.includes("sslmode=disable") || lowercased.includes("ssl=false")) return false;
  if (lowercased.includes("sslmode=require") || lowercased.includes("sslmode=verify")) return true;
  if (lowercased.includes("ssl=true") || lowercased.includes("ssl=require")) return true;
  // Host lokal tidak butuh SSL; semua host remote/cloud (Supabase, Neon, AWS, dsb.)
  // umumnya mewajibkan TLS.
  if (/@(127\.0\.0\.1|localhost|\[::1\]|postgres|db|host\.docker\.internal)[:/]/.test(lowercased)) {
    return false;
  }
  return true;
}

const configuredPoolSize = Number(process.env.DB_POOL_MAX);
const poolSize = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
  ? configuredPoolSize
  : process.env.NODE_ENV === "production"
    ? 10
    : 5;

const sql =
  globalDatabase.wazeposSql ??
  postgres(connectionString, {
    max: poolSize,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 20,
    max_lifetime: 60 * 30,
    ssl: shouldUseSSL(connectionString) ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") globalDatabase.wazeposSql = sql;

export const db = drizzle(sql, { schema });
