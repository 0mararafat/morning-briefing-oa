import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/db";
import { toGeneratorConfig } from "@/lib/config";
import { getGeneratorState, saveGeneratorState } from "@/lib/state";
import { getApiKey } from "@/lib/secrets";
import { recordRunSuccess, recordRunFailure } from "@/lib/runs";
import { formatToday } from "@/lib/generator/date";
import { makeClient } from "@/lib/generator/anthropic";
import { runBriefing } from "@/lib/generator/orchestrate";

// Per-user generation job. Concurrency-capped + retried by Inngest; the
// generator's own withRetry handles per-call hiccups.
//
// NOTE: the heavy work runs in a single durable step today. A future
// refinement is to split it into one step.run per LLM call (main/deep-dive/
// signal/patterns) so each invocation stays well under Vercel's maxDuration.
export const generateUserBriefing = inngest.createFunction(
  {
    id: "generate-user-briefing",
    concurrency: { limit: 5 },
    retries: 3,
    // Runs once all retries are exhausted — stamp the failure on the user's
    // config so the dashboard can surface "last generation failed".
    onFailure: async ({ event }) => {
      const original = (event.data as { event?: { data?: { userId?: string } } }).event;
      const userId = original?.data?.userId;
      const message =
        (event.data as { error?: { message?: string } }).error?.message ?? "Generation failed";
      if (userId) await recordRunFailure(userId, message);
    },
  },
  { event: "app/briefing.requested" },
  async ({ event, step }) => {
    const { userId, force = false } = event.data as {
      userId: string;
      force?: boolean;
    };

    const cfgRow = await step.run("load-config", () =>
      prisma.userConfig.findUnique({ where: { userId } })
    );
    if (!cfgRow) return { skipped: "no-config" };

    const config = toGeneratorConfig(cfgRow);
    const today = formatToday(cfgRow.timezone);

    const existing = await step.run("check-exists", () =>
      prisma.briefing.findUnique({
        where: { userId_date: { userId, date: today.iso } },
        select: { id: true },
      })
    );
    if (existing && !force) return { skipped: "exists", date: today.iso };

    const state = await step.run("load-state", () => getGeneratorState(userId));

    // Decrypt the key INSIDE this step so the plaintext never becomes a
    // journaled step output.
    const result = await step.run("generate", async () => {
      const apiKey = await getApiKey(userId);
      if (!apiKey) throw new Error("No Anthropic API key configured for user");
      const client = makeClient(apiKey);
      return runBriefing({ config, state, anthropic: client, today, force });
    });

    await step.run("persist", async () => {
      await prisma.briefing.upsert({
        where: { userId_date: { userId, date: today.iso } },
        create: {
          userId,
          date: today.iso,
          data: result.data as unknown as object,
          html: result.html,
          source: "API_KEY",
        },
        update: {
          data: result.data as unknown as object,
          html: result.html,
          source: "API_KEY",
        },
      });
      await saveGeneratorState(userId, result.newState);
    });

    await step.run("record-success", () => recordRunSuccess(userId));

    return { ok: true, date: today.iso };
  }
);
