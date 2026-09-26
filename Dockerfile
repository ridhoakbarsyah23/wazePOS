# syntax=docker/dockerfile:1
# Multi-stage build untuk Next.js standalone (Next 16).
# - deps: install dependencies untuk build
# - builder: build aplikasi (butuh ARG NEXT_PUBLIC_* karena masuk bundle)
# - prod-deps: hanya modul yang dibutuhkan scripts/migrate.mjs
# - runner: image final non-root yang menjalankan server.js
#
# Versi base di-pin agar build reproducible. Update manual setelah uji:
# `docker pull node:20.20.2-alpine` dan `docker pull postgres:17.11-alpine`.

FROM node:20.20.2-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20.20.2-alpine AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Dummy khusus build agar prerender tidak noisy (BetterAuthError default secret).
# Tidak terbawa ke image final karena stage runner tidak mewarisi ENV ini.
ENV BETTER_AUTH_SECRET=build-only-dummy-secret-min-32-chars-000000 \
    DATABASE_URL=postgresql://wazepos:wazepos@127.0.0.1:5434/wazepos
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* di-bake saat build. Isi via --build-arg atau docker compose args.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_TRIAL_URL=/register
ARG NEXT_PUBLIC_WHATSAPP_NUMBER=
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_PUBLIC_TRIAL_URL=$NEXT_PUBLIC_TRIAL_URL \
    NEXT_PUBLIC_WHATSAPP_NUMBER=$NEXT_PUBLIC_WHATSAPP_NUMBER
RUN npm run build

FROM node:20.20.2-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

FROM node:20.20.2-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && apk add --no-cache wget
# Output standalone Next.js: server.js + aset statis + public.
# node_modules bawaan standalone sudah berisi tree minimal hasil trace Next.js,
# jadi jangan timpa dengan full node_modules (hemat ~600MB).
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Modul tambahan khusus scripts/migrate.mjs (tidak ikut trace standalone):
# drizzle-orm (9.9MB) + postgres (0.3MB) + @next/env (10KB).
COPY --from=prod-deps /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=prod-deps /app/node_modules/postgres ./node_modules/postgres
COPY --from=prod-deps /app/node_modules/@next/env ./node_modules/@next/env
COPY --from=prod-deps /app/package.json ./package.json
# File yang dibutuhkan entrypoint untuk migrasi saat container start
COPY --chown=nextjs:nodejs db/migrations ./db/migrations
COPY --chown=nextjs:nodejs scripts/migrate.mjs ./scripts/migrate.mjs
COPY --chown=nextjs:nodejs docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh
USER nextjs
EXPOSE 3000
# Liveness ringan (/api/live) agar tidak 503 saat RESEND_* kosong.
# Kesiapan bisnis tetap dicek manual via /api/health.
HEALTHCHECK --interval=15s --timeout=5s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/live || exit 1
ENTRYPOINT ["./entrypoint.sh"]
