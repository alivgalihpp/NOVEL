// Rate limit in-memory (single instance). Untuk multi-instance pakai Redis (lihat README).
// Batas via env agar bisa diuji: AUTH_LIMIT_PER_MINUTE (default 30), GLOBAL_LIMIT_PER_MINUTE (default 300).
const hits = new Map<string, number[]>();

export function rateLimitCheck(key: string, windowMs: number, max: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return true;
  }
  arr.push(now);
  hits.set(key, arr);
  return false;
}

export function clientIp(
  server: unknown,
  request: Request,
  headers: Record<string, string | undefined>,
): string {
  try {
    const s = server as {
      requestIP?: (req: Request) => { address?: string } | null;
    } | null;
    const addr = s?.requestIP?.(request)?.address;
    if (addr) return addr;
  } catch {
    // abaikan, pakai header
  }
  const fwd = headers["x-forwarded-for"] ?? headers["X-Forwarded-For"];
  return fwd?.split(",")[0]?.trim() || "unknown";
}

export function securityHeaders(): Record<string, string> {
  return {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "no-referrer",
  };
}
