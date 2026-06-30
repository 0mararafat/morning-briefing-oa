import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stand-in for the RateLimit table so the limiter can be exercised
// without a database.
interface Row {
  key: string;
  windowStart: Date;
  count: number;
}
const store = new Map<string, Row>();

vi.mock("@/lib/db", () => ({
  prisma: {
    rateLimit: {
      // Return a detached snapshot, like Prisma — not the live stored object.
      findUnique: async ({ where: { key } }: { where: { key: string } }) => {
        const r = store.get(key);
        return r ? { ...r } : null;
      },
      upsert: async ({
        where: { key },
        create,
        update,
      }: {
        where: { key: string };
        create: Row;
        update: Partial<Row>;
      }) => {
        const existing = store.get(key);
        if (existing) Object.assign(existing, update);
        else store.set(key, { ...create });
      },
      update: async ({
        where: { key },
        data,
      }: {
        where: { key: string };
        data: { count?: { increment: number } };
      }) => {
        const row = store.get(key)!;
        if (data.count?.increment) row.count += data.count.increment;
      },
    },
  },
}));

import { checkRateLimit } from "@/lib/rate-limit";

const t0 = new Date("2026-06-30T00:00:00.000Z");

describe("checkRateLimit", () => {
  beforeEach(() => store.clear());

  it("allows requests up to the limit, then blocks", async () => {
    const r1 = await checkRateLimit("k", 3, 60, t0);
    const r2 = await checkRateLimit("k", 3, 60, t0);
    const r3 = await checkRateLimit("k", 3, 60, t0);
    const r4 = await checkRateLimit("k", 3, 60, t0);

    expect([r1.ok, r2.ok, r3.ok]).toEqual([true, true, true]);
    expect([r1.remaining, r2.remaining, r3.remaining]).toEqual([2, 1, 0]);
    expect(r4.ok).toBe(false);
    expect(r4.retryAfterSec).toBeGreaterThan(0);
    expect(r4.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("resets once the window has elapsed", async () => {
    await checkRateLimit("k", 1, 60, t0);
    const blocked = await checkRateLimit("k", 1, 60, new Date(t0.getTime() + 30_000));
    expect(blocked.ok).toBe(false);

    const afterWindow = await checkRateLimit("k", 1, 60, new Date(t0.getTime() + 61_000));
    expect(afterWindow.ok).toBe(true);
  });

  it("isolates separate keys", async () => {
    await checkRateLimit("a", 1, 60, t0);
    const other = await checkRateLimit("b", 1, 60, t0);
    expect(other.ok).toBe(true);
  });
});
