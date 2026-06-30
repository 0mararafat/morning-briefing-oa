import { prisma } from "@/lib/db";

// Records the outcome of an API-mode generation run on the user's config row so
// the dashboard can surface a failed/stalled job. `updateMany` is used so a
// missing config row is a harmless no-op rather than a throw.

export async function recordRunSuccess(userId: string, at: Date = new Date()): Promise<void> {
  await prisma.userConfig.updateMany({
    where: { userId },
    data: { lastRunAt: at, lastRunStatus: "ok", lastRunError: null },
  });
}

export async function recordRunFailure(
  userId: string,
  error: string,
  at: Date = new Date()
): Promise<void> {
  await prisma.userConfig.updateMany({
    where: { userId },
    data: { lastRunAt: at, lastRunStatus: "error", lastRunError: error.slice(0, 500) },
  });
}
