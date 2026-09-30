import nextEnv from "@next/env";
import postgres from "postgres";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const databaseUrl = process.env.DATABASE_URL ?? "postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos";
const usesSSL = !/sslmode=disable|ssl=false/i.test(databaseUrl)
  && (/sslmode=require|sslmode=verify|ssl=true|ssl=require/i.test(databaseUrl)
    || !/@(127\.0\.0\.1|localhost|\[::1\]|postgres|db|host\.docker\.internal)[:/]/.test(databaseUrl));

const isRemote = !/@(127\.0\.0\.1|localhost|\[::1\]|postgres|db|host\.docker\.internal)[:/]/.test(databaseUrl);

console.log(`Menghubungkan ke ${isRemote ? "PRODUCTION" : "LOCAL"} database...`);

const client = postgres(databaseUrl, { max: 1, ssl: usesSSL ? "require" : undefined });

try {
  // Hapus semua data termasuk riwayat migrasi Drizzle agar bisa migrasi ulang 
  await client`DROP SCHEMA IF EXISTS public CASCADE;`;
  await client`DROP SCHEMA IF EXISTS drizzle CASCADE;`;
  
  await client`CREATE SCHEMA public;`;
  console.log(`Berhasil menghapus seluruh data dan tabel di ${isRemote ? "PRODUCTION" : "LOCAL"}!`);
} catch (error) {
  console.error("Gagal menghapus data:", error);
} finally {
  await client.end();
}
