import "server-only";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import { businessError } from "@/server/security/business-error";

export function neonStorageConfigured() {
  return Boolean(
    process.env.NEON_STORAGE_ENDPOINT &&
      process.env.NEON_STORAGE_REGION &&
      process.env.NEON_STORAGE_ACCESS_KEY_ID &&
      process.env.NEON_STORAGE_SECRET_ACCESS_KEY &&
      process.env.NEON_STORAGE_BUCKET,
  );
}
export function neonStorage() {
  if (!neonStorageConfigured())
    throw businessError("O armazenamento de arquivos ainda não está configurado.");
  const endpoint = new URL(process.env.NEON_STORAGE_ENDPOINT ?? "");
  if (
    endpoint.protocol !== "https:" ||
    !/\.storage\.[a-z0-9.-]+\.neon\.tech$/.test(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password
  )
    throw new Error("Invalid Neon Object Storage endpoint");
  return {
    bucket: process.env.NEON_STORAGE_BUCKET ?? "",
    client: new S3Client({
      endpoint: endpoint.origin,
      region: process.env.NEON_STORAGE_REGION,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.NEON_STORAGE_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.NEON_STORAGE_SECRET_ACCESS_KEY ?? "",
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }),
  };
}
export async function neonUploadForm(path: string, contentType: string, size: number, id: string) {
  if (size <= 0 || size > MAX_ATTACHMENT_BYTES)
    throw businessError("O limite é de 20 MB por arquivo.");
  const { client, bucket } = neonStorage();
  return createPresignedPost(client, {
    Bucket: bucket,
    Key: path,
    Expires: 300,
    Fields: {
      "Content-Type": contentType,
      "x-amz-meta-attachmentid": id,
      success_action_status: "204",
    },
    Conditions: [
      ["content-length-range", size, size],
      ["eq", "$Content-Type", contentType],
      ["eq", "$x-amz-meta-attachmentid", id],
      ["eq", "$success_action_status", "204"],
    ],
  });
}
export async function neonFileMetadata(bucket: string, path: string) {
  const storage = neonStorage();
  if (storage.bucket !== bucket)
    throw businessError("Este arquivo pertence a outro armazenamento.");
  return storage.client.send(new HeadObjectCommand({ Bucket: bucket, Key: path }));
}
export async function neonCopyFile(bucket: string, from: string, to: string, etag: string) {
  const storage = neonStorage();
  if (storage.bucket !== bucket)
    throw businessError("Este arquivo pertence a outro armazenamento.");
  await storage.client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: to,
      CopySource: `${bucket}/${from.split("/").map(encodeURIComponent).join("/")}`,
      CopySourceIfMatch: etag,
    }),
  );
}
export async function neonRemovePendingFile(bucket: string, path: string) {
  const storage = neonStorage();
  if (storage.bucket !== bucket)
    throw businessError("Este arquivo pertence a outro armazenamento.");
  await storage.client.send(new DeleteObjectCommand({ Bucket: bucket, Key: path }));
}
export async function neonDownloadUrl(bucket: string, path: string, name: string) {
  const storage = neonStorage();
  if (storage.bucket !== bucket)
    throw businessError("Este arquivo pertence a outro armazenamento.");
  const fallback = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return getSignedUrl(
    storage.client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: path,
      ResponseContentDisposition: `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      ResponseContentType: "application/octet-stream",
      ResponseCacheControl: "private, no-store",
    }),
    { expiresIn: 60 },
  );
}
