import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// AES-256-GCM for users' Anthropic API keys at rest. Master key in
// APP_ENCRYPTION_KEY (32 random bytes, base64) — never stored in the DB.

export interface Ciphertext {
  ct: string; // base64
  iv: string; // base64
  tag: string; // base64
}

function masterKey(): Buffer {
  const b64 = process.env.APP_ENCRYPTION_KEY;
  if (!b64) throw new Error("APP_ENCRYPTION_KEY is not set");
  const key = Buffer.from(b64, "base64");
  if (key.length !== 32) {
    throw new Error("APP_ENCRYPTION_KEY must decode to 32 bytes (use: openssl rand -base64 32)");
  }
  return key;
}

export function encrypt(plaintext: string): Ciphertext {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    ct: enc.toString("base64"),
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

export function decrypt(c: Ciphertext): string {
  const decipher = createDecipheriv("aes-256-gcm", masterKey(), Buffer.from(c.iv, "base64"));
  decipher.setAuthTag(Buffer.from(c.tag, "base64"));
  const dec = Buffer.concat([decipher.update(Buffer.from(c.ct, "base64")), decipher.final()]);
  return dec.toString("utf8");
}
