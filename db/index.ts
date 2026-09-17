import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://wazepos:wazepos@127.0.0.1:5434/wazepos";

const globalDatabase = globalThis as unknown as {
  wazeposSql?: ReturnType<typeof postgres>;
};

const sql =
  globalDatabase.wazeposSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    prepare: false,
    connect_timeout: 10,
    ssl: connectionString.includes("supabase.com") ? "require" : undefined,
  });

if (process.env.NODE_ENV !== "production") globalDatabase.wazeposSql = sql;

export const db = drizzle(sql, { schema });
