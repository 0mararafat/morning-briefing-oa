import { randomBytes, createHash } from "node:crypto";
import { prisma } from "@/lib/db";

// Ingest tokens for Claude-routine mode. The raw token is shown to the user
// once; only its sha256 hash is stored.

export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Create or replace a user's ingest token; returns the raw token (show once).
export async function issueIngestToken(userId: string): Promise<string> {
  const raw = generateToken();
  const tokenHash = hashToken(raw);
  await prisma.ingestToken.upsert({
    where: { userId },
    create: { userId, tokenHash },
    update: { tokenHash, lastUsed: null },
  });
  return raw;
}

// Resolve a bearer token to a userId (and stamp lastUsed), or null.
export async function resolveIngestToken(raw: string): Promise<string | null> {
  const tokenHash = hashToken(raw);
  const row = await prisma.ingestToken.findUnique({ where: { tokenHash } });
  if (!row) return null;
  await prisma.ingestToken.update({
    where: { id: row.id },
    data: { lastUsed: new Date() },
  });
  return row.userId;
}
