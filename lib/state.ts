import { prisma } from "@/lib/db";
import type { GeneratorState, SignalCache, WildcardEntry } from "@/lib/generator/types";

// Read the per-user generator state (wildcard history + signal cache).
export async function getGeneratorState(userId: string): Promise<GeneratorState> {
  const row = await prisma.userState.findUnique({ where: { userId } });
  if (!row) return { wildcardHistory: [], signalCache: null };
  return {
    wildcardHistory: (row.wildcardHistory as unknown as WildcardEntry[]) ?? [],
    signalCache: (row.signalCache as unknown as SignalCache | null) ?? null,
  };
}

// Persist the per-user generator state.
export async function saveGeneratorState(
  userId: string,
  state: GeneratorState
): Promise<void> {
  const data = {
    wildcardHistory: state.wildcardHistory as unknown as object,
    signalCache: (state.signalCache as unknown as object) ?? undefined,
  };
  await prisma.userState.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });
}
