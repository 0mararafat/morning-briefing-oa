import { prisma } from "@/lib/db";

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

// Fixed-window rate limiter backed by Postgres. Not perfectly atomic under heavy
// concurrency, but more than adequate for the per-token / per-user ceilings whose
// job is to bound a leaked token or a runaway routine — not to gate a high-QPS
// public endpoint.
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  now: Date = new Date()
): Promise<RateLimitResult> {
  const windowMs = windowSec * 1000;
  const row = await prisma.rateLimit.findUnique({ where: { key } });

  // No row yet, or the window has elapsed → start a fresh window.
  if (!row || now.getTime() - row.windowStart.getTime() >= windowMs) {
    await prisma.rateLimit.upsert({
      where: { key },
      create: { key, windowStart: now, count: 1 },
      update: { windowStart: now, count: 1 },
    });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (row.count >= limit) {
    const retryAfterSec = Math.ceil(
      (row.windowStart.getTime() + windowMs - now.getTime()) / 1000
    );
    return { ok: false, remaining: 0, retryAfterSec: Math.max(retryAfterSec, 1) };
  }

  await prisma.rateLimit.update({
    where: { key },
    data: { count: { increment: 1 } },
  });
  return { ok: true, remaining: limit - row.count - 1, retryAfterSec: 0 };
}
