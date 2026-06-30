import { prisma } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/crypto";

// Store/retrieve a user's Anthropic API key (encrypted at rest). The plaintext
// key only ever exists transiently inside server actions / the generation job.

export async function saveApiKey(userId: string, rawKey: string): Promise<string> {
  const { ct, iv, tag } = encrypt(rawKey);
  const keyLast4 = rawKey.slice(-4);
  await prisma.userSecret.upsert({
    where: { userId },
    create: { userId, anthropicKeyCt: ct, anthropicKeyIv: iv, anthropicKeyTag: tag, keyLast4 },
    update: { anthropicKeyCt: ct, anthropicKeyIv: iv, anthropicKeyTag: tag, keyLast4 },
  });
  return keyLast4;
}

export async function getApiKey(userId: string): Promise<string | null> {
  const row = await prisma.userSecret.findUnique({ where: { userId } });
  if (!row?.anthropicKeyCt || !row.anthropicKeyIv || !row.anthropicKeyTag) return null;
  return decrypt({ ct: row.anthropicKeyCt, iv: row.anthropicKeyIv, tag: row.anthropicKeyTag });
}

export async function getKeyInfo(userId: string): Promise<{ hasKey: boolean; last4: string | null }> {
  const row = await prisma.userSecret.findUnique({ where: { userId } });
  return { hasKey: !!row?.anthropicKeyCt, last4: row?.keyLast4 ?? null };
}

export async function deleteApiKey(userId: string): Promise<void> {
  await prisma.userSecret
    .update({
      where: { userId },
      data: { anthropicKeyCt: null, anthropicKeyIv: null, anthropicKeyTag: null, keyLast4: null },
    })
    .catch(() => {});
}
