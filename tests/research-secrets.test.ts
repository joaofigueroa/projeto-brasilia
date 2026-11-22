import { afterEach, describe, expect, it } from "vitest";
import { decryptResearchKey, encryptResearchKey } from "@/server/security/research-secrets";

const original = process.env.BETTER_AUTH_SECRET;
afterEach(() => {
  if (original === undefined) delete process.env.BETTER_AUTH_SECRET;
  else process.env.BETTER_AUTH_SECRET = original;
});
describe("research credential protection", () => {
  it("encrypts with a fresh nonce and authenticates the ciphertext", () => {
    process.env.BETTER_AUTH_SECRET = "local-test-only-secret-at-least-32-characters-long";
    const secret = "test-key-not-a-real-provider-credential";
    const first = encryptResearchKey(secret);
    const second = encryptResearchKey(secret);
    expect(first).not.toBe(second);
    expect(first).not.toContain(secret);
    expect(decryptResearchKey(first)).toBe(secret);
    const parts = first.split(".");
    parts[2] = Buffer.alloc(16).toString("base64");
    expect(() => decryptResearchKey(parts.join("."))).toThrow("Reconecte");
    process.env.BETTER_AUTH_SECRET = "a-different-local-test-only-secret-at-least-32-characters";
    expect(() => decryptResearchKey(first)).toThrow("Reconecte");
  });
  it("refuses to store credentials without a configured encryption secret", () => {
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => encryptResearchKey("test")).toThrow("proteção");
  });
});
