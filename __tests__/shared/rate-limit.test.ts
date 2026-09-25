import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, getClientIp } from "@/lib/shared/rate-limit";

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("mengizinkan request sampai batas lalu menolak sisanya", () => {
    const key = "route:1.2.3.4";
    for (let i = 0; i < 3; i += 1) {
      expect(checkRateLimit({ key, limit: 3, windowSeconds: 60 }).ok).toBe(true);
    }
    const blocked = checkRateLimit({ key, limit: 3, windowSeconds: 60 });
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("me-reset hitungan setelah window berlalu", () => {
    const key = "route:5.6.7.8";
    for (let i = 0; i < 5; i += 1) checkRateLimit({ key, limit: 5, windowSeconds: 60 });
    expect(checkRateLimit({ key, limit: 5, windowSeconds: 60 }).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit({ key, limit: 5, windowSeconds: 60 }).ok).toBe(true);
  });

  it("memisahkan hitungan antar key", () => {
    for (let i = 0; i < 2; i += 1) checkRateLimit({ key: "a", limit: 2, windowSeconds: 60 });
    expect(checkRateLimit({ key: "b", limit: 2, windowSeconds: 60 }).ok).toBe(true);
  });
});

describe("getClientIp", () => {
  const makeRequest = (headers: Record<string, string>) => new Request("https://example.com/api", { headers });

  it("mengambil IP pertama dari x-forwarded-for", () => {
    expect(getClientIp(makeRequest({ "x-forwarded-for": "10.0.0.1, 10.0.0.2" }))).toBe("10.0.0.1");
  });

  it("fallback ke x-real-ip lalu unknown", () => {
    expect(getClientIp(makeRequest({ "x-real-ip": "10.0.0.9" }))).toBe("10.0.0.9");
    expect(getClientIp(makeRequest({}))).toBe("unknown");
  });
});
