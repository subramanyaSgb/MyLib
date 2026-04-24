import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

function getKey(): Buffer {
  const raw = process.env.CREDS_KEY;
  if (!raw) throw new Error("CREDS_KEY env var missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("CREDS_KEY must decode to 32 bytes");
  return key;
}

/** Encrypt arbitrary JSON. Output: base64(iv|tag|ciphertext). */
export function encryptJSON(obj: unknown): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), "utf8");
  const ct = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decryptJSON<T = unknown>(blob: string): T {
  const key = getKey();
  const buf = Buffer.from(blob, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return JSON.parse(pt.toString("utf8")) as T;
}
