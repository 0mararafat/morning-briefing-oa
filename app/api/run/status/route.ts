import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getLatestBriefing } from "@/lib/briefings";

// Lightweight status poll for the "Run now" loading screen. Lets the client jump
// to the dashboard as soon as a run finishes instead of always waiting 5 minutes.
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [config, latest] = await Promise.all([
    prisma.userConfig.findUnique({
      where: { userId: session.user.id },
      select: { lastRunAt: true, lastRunStatus: true, lastRunError: true },
    }),
    getLatestBriefing(session.user.id),
  ]);

  return NextResponse.json({
    lastRunAt: config?.lastRunAt ?? null,
    lastRunStatus: config?.lastRunStatus ?? null,
    lastRunError: config?.lastRunError ?? null,
    latestBriefingDate: latest?.date ?? null,
  });
}
