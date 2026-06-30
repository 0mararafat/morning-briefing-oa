import { DateTime } from "luxon";
import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { isDueThisHour } from "@/lib/schedule";
import { formatToday } from "@/lib/generator/date";

// Runs hourly. For each enabled API-key user whose cron matches this hour in
// their timezone, fan out a per-user generation event.
export const dailyScheduler = inngest.createFunction(
  { id: "daily-scheduler" },
  { cron: "0 * * * *" },
  async ({ step }) => {
    const now = DateTime.now();

    const configs = await step.run("find-due-users", async () => {
      const rows = await prisma.userConfig.findMany({
        where: { enabled: true, mode: "API_KEY" },
        select: { userId: true, cron: true, timezone: true },
      });
      return rows.filter((c) => isDueThisHour(c.cron, c.timezone, now));
    });

    if (configs.length === 0) return { due: 0 };

    await step.sendEvent(
      "fan-out",
      configs.map((c) => ({
        name: "app/briefing.requested" as const,
        data: { userId: c.userId, date: formatToday(c.timezone, now).iso },
      }))
    );

    return { due: configs.length };
  }
);
