import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://wazepos:wazepos@127.0.0.1:5434/wazepos";

const globalDatabase = globalThis as unknown as {
  wazeposSql?: ReturnType<typeof postgres>;
};

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
    ssl: connectionString.includes("supabase.com") ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") globalDatabase.wazeposSql = sql;

export const db = drizzle(sql, { schema });
