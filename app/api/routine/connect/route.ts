import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toGeneratorConfig } from "@/lib/config";
import { getGeneratorState } from "@/lib/state";
import { issueIngestToken } from "@/lib/tokens";
import { buildRoutinePrompt } from "@/lib/routine-prompt";
import { DEFAULT_CONFIG_INPUT } from "@/lib/config-schema";
import type { Config } from "@/lib/generator/types";

// POST → (re)issue an ingest token and return the ready-to-paste routine prompt
// + ingest URL. The raw token is returned ONCE here and only its hash is stored.
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const cfgRow = await prisma.userConfig.findUnique({ where: { userId } });
  const cfg: Config = cfgRow
    ? toGeneratorConfig(cfgRow)
    : {
        topics: DEFAULT_CONFIG_INPUT.topics,
        sources: DEFAULT_CONFIG_INPUT.sources,
        sections: DEFAULT_CONFIG_INPUT.sections,
        voices: DEFAULT_CONFIG_INPUT.voices,
        signal_scan_frequency: DEFAULT_CONFIG_INPUT.signalScanFrequency,
      };

  const state = await getGeneratorState(userId);
  const token = await issueIngestToken(userId);
  const ingestUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/ingest`;
  const prompt = buildRoutinePrompt({
    cfg,
    history: state.wildcardHistory,
    ingestUrl,
    token,
    timezone: cfgRow?.timezone ?? "Europe/London",
  });

  return NextResponse.json({ token, ingestUrl, prompt });
}
