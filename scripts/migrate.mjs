import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos";

// Guard: jalankan eksplisit dengan --remote (atau MIGRATE_ALLOW_REMOTE=1) untuk
// menyentuh database remote. Mencegah migrasi lokal tidak sengaja mengubah produksi.
const allowRemote =
  process.argv.includes("--remote") || process.env.MIGRATE_ALLOW_REMOTE === "1";
const isRemote = !/@(127\.0\.0\.1|localhost|\[::1\]|postgres|db|host\.docker\.internal)[:/]/.test(databaseUrl);

if (isRemote && !allowRemote) {
  console.error(
    [
      "MIGRASI DIBATALKAN: DATABASE_URL menunjuk ke database remote.",
      "",
      "  Host: " + new URL(databaseUrl).host,
      "",
      "Jika memang sengaja, jalankan:",
      "  npm run db:migrate:production",
      "atau set MIGRATE_ALLOW_REMOTE=1.",
    ].join("\n"),
  );
  process.exit(1);
}

const client = postgres(databaseUrl, { max: 1 });

try {
  await migrate(drizzle(client), { migrationsFolder: "db/migrations" });
  console.log("Migrasi database selesai dan seluruh perubahan tertunda telah diterapkan.");
} finally {
  await client.end();
}
