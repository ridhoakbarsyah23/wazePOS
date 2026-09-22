import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const client = postgres(
  process.env.DATABASE_URL ?? "postgres://wazepos:wazepos@127.0.0.1:5434/wazepos",
  { max: 1 },
);

try {
  await migrate(drizzle(client), { migrationsFolder: "db/migrations" });
  console.log("Migrasi database selesai dan seluruh perubahan tertunda telah diterapkan.");
} finally {
  await client.end();
}
