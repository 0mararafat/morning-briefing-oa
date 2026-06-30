import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { dailyScheduler } from "@/inngest/functions/daily-scheduler";
import { generateUserBriefing } from "@/inngest/functions/generate-user-briefing";

// Generation can take several minutes. Requires a plan that allows extended
// function duration (Vercel Pro / Fluid Compute).
export const maxDuration = 300;
export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [dailyScheduler, generateUserBriefing],
});
