import { prisma } from "@/lib/db";
import {
  ConfigInputSchema,
  DEFAULT_CONFIG_INPUT,
  type ConfigInput,
} from "@/lib/config-schema";
import { buildCron, parseCron } from "@/lib/schedule";
import type { Config, Sections, Sources, Topic, Voice } from "@/lib/generator/types";
import type { UserConfig } from "@prisma/client";

// Convert a stored UserConfig row into the generator's Config shape. Accepts a
// structural subset so it also works with Inngest-serialized rows (where Date
// fields become strings).
type ConfigFields = Pick<
  UserConfig,
  "topics" | "sources" | "sections" | "voices" | "signalScanFrequency"
>;

export function toGeneratorConfig(row: ConfigFields): Config {
  return {
    topics: row.topics as unknown as Topic[],
    sources: row.sources as unknown as Sources,
    sections: row.sections as unknown as Sections,
    voices: row.voices as unknown as Voice[],
    signal_scan_frequency: row.signalScanFrequency as "weekly" | "daily",
  };
}

// Wizard form values for a user — existing config or seeded defaults.
export async function getWizardValues(userId: string): Promise<ConfigInput> {
  const row = await prisma.userConfig.findUnique({ where: { userId } });
  if (!row) return DEFAULT_CONFIG_INPUT;
  const { time, days } = parseCron(row.cron);
  return {
    topics: row.topics as unknown as ConfigInput["topics"],
    sources: row.sources as unknown as ConfigInput["sources"],
    sections: row.sections as unknown as ConfigInput["sections"],
    voices: row.voices as unknown as ConfigInput["voices"],
    signalScanFrequency: row.signalScanFrequency as "weekly" | "daily",
    time,
    timezone: row.timezone,
    days,
    mode: row.mode,
  };
}

// Validate + persist a wizard submission. Returns the saved row.
export async function saveUserConfig(userId: string, raw: unknown): Promise<UserConfig> {
  const input = ConfigInputSchema.parse(raw);
  const cron = buildCron(input.time, input.days);

  const data = {
    topics: input.topics,
    sources: input.sources,
    sections: input.sections,
    voices: input.voices,
    signalScanFrequency: input.signalScanFrequency,
    cron,
    timezone: input.timezone,
    mode: input.mode,
  };

  return prisma.userConfig.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
