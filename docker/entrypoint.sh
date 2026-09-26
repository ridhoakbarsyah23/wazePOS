#!/bin/sh
# Entrypoint container app wazePOS.
# - Validasi secret agar container gagal cepat dengan pesan jelas, bukan boot buta.
# - Tunggu postgres siap (TCP retry via node, karena pg_isready tidak ada di image app).
# - Jalankan migrasi Drizzle sekali sebelum server start (idempotent).
# - Jalankan server Next.js standalone.
set -eu

if [ -z "${BETTER_AUTH_SECRET:-}" ]; then
  echo "BETTER_AUTH_SECRET wajib diisi untuk service app. Set di environment lalu jalankan ulang." >&2
  exit 1
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL wajib diisi untuk service app." >&2
  exit 1
fi

DATABASE_URL_FOR_WAIT="${DATABASE_URL:-}"

if [ -n "$DATABASE_URL_FOR_WAIT" ]; then
  echo "Menunggu database siap..."
  node -e "
    const url = process.env.DATABASE_URL;
    const target = new URL(url);
    const net = require('node:net');
    const deadline = Date.now() + 60000;
    (function attempt() {
      const socket = net.connect({ host: target.hostname, port: Number(target.port || 5432) });
      socket.on('connect', () => { socket.end(); process.exit(0); });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() > deadline) { console.error('Database tidak merespons dalam 60 detik'); process.exit(1); }
        setTimeout(attempt, 1000);
      });
    })();
  "
fi

if [ "${RUN_MIGRATIONS:-1}" = "1" ]; then
  echo "Menjalankan migrasi database..."
  node scripts/migrate.mjs
fi

echo "Menjalankan server Next.js..."
exec node server.js
