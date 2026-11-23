/**
 * Small in-memory sliding-window limiter. Per server instance, so it is a
 * first line of defence only; the database enforces the real limits inside
 * public.submit_lead(). Swap for Upstash/Vercel KV if traffic grows.
 */
export function createRateLimiter({ limit, windowMs, max = 10_000 }: { limit: number; windowMs: number; max?: number }) {
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): { ok: boolean; retryAfter: number } {
    const since = now - windowMs;
    const list = (hits.get(key) ?? []).filter((t) => t > since);
    if (list.length >= limit) {
      hits.set(key, list);
      return { ok: false, retryAfter: Math.ceil((list[0] + windowMs - now) / 1000) };
    }
    list.push(now);
    hits.set(key, list);
    if (hits.size > max) {
      // Drop the oldest keys so memory stays bounded under a flood of distinct IPs.
      for (const k of hits.keys()) {
        hits.delete(k);
        if (hits.size <= max / 2) break;
      }
    }
    return { ok: true, retryAfter: 0 };
  };
}
