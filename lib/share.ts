import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

// Optional public share links for a briefing. Off by default: a briefing is only
// reachable at /share/<token> once the owner explicitly enables it, and the link
// dies the moment they disable it (token nulled).

export function generateShareToken(): string {
  return randomBytes(16).toString("base64url");
}

// Enable sharing for one of the user's briefings; returns the (stable) token, or
// null if they don't own a briefing for that date.
export async function enableShare(userId: string, date: string): Promise<string | null> {
  const existing = await prisma.briefing.findUnique({
    where: { userId_date: { userId, date } },
    select: { shareToken: true },
  });
  if (!existing) return null;
  if (existing.shareToken) return existing.shareToken;

  const token = generateShareToken();
  await prisma.briefing.update({
    where: { userId_date: { userId, date } },
    data: { shareToken: token },
  });
  return token;
}

// Revoke the share link (scoped by userId so one user can't disable another's).
export async function disableShare(userId: string, date: string): Promise<void> {
  await prisma.briefing.updateMany({
    where: { userId, date },
    data: { shareToken: null },
  });
}

// Public lookup by share token — no userId scope (that's the point of a share).
export async function getSharedBriefing(token: string) {
  if (!token) return null;
  return prisma.briefing.findUnique({ where: { shareToken: token } });
}
