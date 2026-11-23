import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import {
  neonStorage,
  neonStorageConfigured,
  neonUploadForm,
} from "@/server/integrations/neon-storage";

afterEach(() => vi.unstubAllEnvs());
function configure() {
  vi.stubEnv("NEON_STORAGE_ENDPOINT", "https://br-test.storage.c-2.us-east-1.aws.neon.tech");
  vi.stubEnv("NEON_STORAGE_REGION", "us-east-1");
  vi.stubEnv("NEON_STORAGE_ACCESS_KEY_ID", "test-only-storage-access-id");
  vi.stubEnv("NEON_STORAGE_SECRET_ACCESS_KEY", "test-only-storage-signing-secret");
  vi.stubEnv("NEON_STORAGE_BUCKET", "test-private-bucket");
}
describe("Neon direct upload policies", () => {
  it("signs an exact key, MIME, object ID and byte count without a network request", async () => {
    configure();
    const form = await neonUploadForm(
      "pending/project/client/id",
      "application/pdf",
      MAX_ATTACHMENT_BYTES,
      "test-file-id",
    );
    const policy = JSON.parse(Buffer.from(form.fields.Policy, "base64").toString());
    expect(policy.conditions).toContainEqual([
      "content-length-range",
      MAX_ATTACHMENT_BYTES,
      MAX_ATTACHMENT_BYTES,
    ]);
    expect(policy.conditions).toContainEqual(["eq", "$Content-Type", "application/pdf"]);
    expect(policy.conditions).toContainEqual(["eq", "$x-amz-meta-attachmentid", "test-file-id"]);
    expect(form.fields.key).toBe("pending/project/client/id");
    expect(new Date(policy.expiration).getTime() - Date.now()).toBeLessThanOrEqual(300000);
    expect(form.url).toMatch(/^https:\/\/br-test\.storage\./);
    await expect(
      neonUploadForm("p", "application/pdf", MAX_ATTACHMENT_BYTES + 1, "id"),
    ).rejects.toThrow("20 MB");
    expect(neonStorageConfigured()).toBe(true);
  });
  it("rejects credential forwarding to a non-Neon endpoint", () => {
    configure();
    vi.stubEnv("NEON_STORAGE_ENDPOINT", "https://example.com");
    expect(() => neonStorage()).toThrow("Invalid Neon");
    vi.stubEnv("NEON_STORAGE_SECRET_ACCESS_KEY", "");
    expect(neonStorageConfigured()).toBe(false);
  });
});
