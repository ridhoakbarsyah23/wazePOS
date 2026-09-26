// Rate limiter in-memory per proses server. Cukup untuk satu instansi
// (Vercel Node runtime); antar-instansi tidak dibagi — kalau nanti skala,
// ganti store-nya ke Redis/Upstash tanpa mengubah pemakaian.

type Bucket = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  /** Identitas unik, mis. `${route}:${ip}` */
  key: string;
  /** Jumlah request maksimal dalam satu window */
  limit: number;
  /** Panjang window dalam detik */
  windowSeconds: number;
};

export type RateLimitResult = {
  ok: boolean;
  /** Detik sampai window reset (untuk header Retry-After) */
  retryAfterSeconds: number;
};

const buckets = new Map<string, Bucket>();

// Cegah Map tumbuh tanpa batas: bucket kadaluarsa dibersihkan tiap eksekusi.
function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function checkRateLimit({ key, limit, windowSeconds }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  prune(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { ok: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }

  return { ok: true, retryAfterSeconds: 0 };
}

/** Ambil identitas pemanggil: IP dari proxy header (Vercel) dengan fallback. */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Response JSON standar untuk request yang melebihi batas. */
export function rateLimitResponse(retryAfterSeconds: number) {
  return Response.json(
    { message: "Terlalu banyak permintaan. Coba lagi sebentar lagi." },
    { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
  );
}
