// withRetry — port of _retry() in morning_dashboard_v4.py.
// Runs fn up to retries+1 times with exponential back-off. Rate-limit errors
// (HTTP 429) wait 65*(attempt+1)s; other errors wait 30*(attempt+1)s.

export const MAX_RETRIES = 3;

function isRateLimit(err: unknown): boolean {
  const e = err as { status?: number; name?: string } | undefined;
  return e?.status === 429 || e?.name === "RateLimitError";
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(
  fn: (attempt: number) => Promise<T>,
  label: string,
  retries: number = MAX_RETRIES,
  sleep: (ms: number) => Promise<void> = defaultSleep
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      if (isRateLimit(err)) {
        const wait = 65 * (attempt + 1);
        console.log(`  Rate limited. Waiting ${wait}s...`);
        if (attempt < retries) {
          await sleep(wait * 1000);
        } else {
          throw err;
        }
      } else {
        const wait = 30 * (attempt + 1);
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ${label} error (attempt ${attempt + 1}/${retries + 1}): ${msg}`);
        if (attempt < retries) {
          await sleep(wait * 1000);
        } else {
          throw err;
        }
      }
    }
  }
  // Unreachable — the loop either returns or throws.
  throw new Error(`${label}: retry exhausted`);
}
