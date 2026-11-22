import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { businessError } from "./business-error";

function key() {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32)
    throw businessError("Configure a proteção de credenciais do servidor antes de conectar a IA.");
  return Buffer.from(hkdfSync("sha256", secret, "brasilia-research-v1", "gemini-api-key", 32));
}
export function encryptResearchKey(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}
export function decryptResearchKey(value: string) {
  try {
    const [version, rawIv, rawTag, rawData] = value.split(".");
    if (version !== "v1" || !rawIv || !rawTag || !rawData)
      throw new Error("Invalid encrypted credential.");
    const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(rawIv, "base64"));
    decipher.setAuthTag(Buffer.from(rawTag, "base64"));
    return Buffer.concat([
      decipher.update(Buffer.from(rawData, "base64")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    throw businessError("Reconecte a chave de IA nas configurações deste projeto.");
  }
}
