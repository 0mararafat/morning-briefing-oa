import { describe, it, expect, beforeAll } from "vitest";
import { randomBytes } from "node:crypto";

// Set a master key before importing the module under test.
beforeAll(() => {
  process.env.APP_ENCRYPTION_KEY = randomBytes(32).toString("base64");
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a value", async () => {
    const { encrypt, decrypt } = await import("../lib/crypto");
    const secret = "sk-ant-abc123-XYZ_supersecret";
    const c = encrypt(secret);
    expect(c.ct).not.toContain(secret);
    expect(decrypt(c)).toBe(secret);
  });

  it("produces a unique IV per encryption", async () => {
    const { encrypt } = await import("../lib/crypto");
    const a = encrypt("same");
    const b = encrypt("same");
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("fails to decrypt a tampered ciphertext", async () => {
    const { encrypt, decrypt } = await import("../lib/crypto");
    const c = encrypt("hello");
    const badCt = Buffer.from("00000000", "hex").toString("base64");
    expect(() => decrypt({ ...c, ct: badCt })).toThrow();
  });
});
