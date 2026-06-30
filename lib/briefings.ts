import { prisma } from "@/lib/db";
import type { Briefing as BriefingData } from "@/lib/generator/types";

// Per-user briefing reads. Always scoped by userId — no cross-tenant access.

export async function getLatestBriefing(userId: string) {
  return prisma.briefing.findFirst({
    where: { userId },
    orderBy: { date: "desc" },
  });
}

export async function getBriefingByDate(userId: string, date: string) {
  return prisma.briefing.findUnique({
    where: { userId_date: { userId, date } },
  });
}

export interface ArchiveEntry {
  date: string;
  urgent: number;
  activeSectors: number;
  totalSectors: number;
  deepDiveTopic: string | null;
}

export async function listBriefings(userId: string): Promise<ArchiveEntry[]> {
  const rows = await prisma.briefing.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    select: { date: true, data: true },
  });
  return rows.map((r) => {
    const data = r.data as unknown as BriefingData;
    const stories = data.top_stories ?? [];
    const sectors = data.sectors ?? [];
    return {
      date: r.date,
      urgent: stories.filter((s) => s.priority === "urgent").length,
      activeSectors: sectors.filter((s) => s.has_news).length,
      totalSectors: sectors.length,
      deepDiveTopic: data.deep_dive?.topic ?? null,
    };
  });
}
