import "server-only";
import { v7 } from "uuid";
import { attachmentMime, crmStageLabels, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import {
  neonCopyFile,
  neonDownloadUrl,
  neonFileMetadata,
  neonRemovePendingFile,
  neonStorage,
  neonStorageConfigured,
  neonUploadForm,
} from "@/server/integrations/neon-storage";
import * as repository from "@/server/repositories/prospect-crm";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import type { ProspectCrm } from "@/types/prospect-crm";
import {
  crmAttachmentIdSchema,
  crmAttachmentPageSchema,
  crmAttachmentSchema,
  crmCommentSchema,
  crmHistorySchema,
  crmScopeSchema,
  crmStageSchema,
} from "@/validators/prospect-crm";

async function authorize(input: repository.CrmScope, write = false) {
  const viewer = await requireViewer();
  const context = await repository.crmContext(input, viewer.id);
  if (!context) throw businessError("Cliente não encontrado neste projeto.");
  if (write && (!context.canManage || !context.version))
    throw businessError("Favorite este cliente para registrar seu acompanhamento.");
  return { viewer, context };
}
export async function getProspectCrm(raw: unknown): Promise<ProspectCrm> {
  const input = crmScopeSchema.parse(raw);
  const { context } = await authorize(input);
  const [history, attachments] = await Promise.all([
    repository.crmHistory(input.prospectId, null),
    repository.crmAttachments(input.prospectId, 1),
  ]);
  return {
    ...context,
    storageConfigured: neonStorageConfigured(),
    history,
    attachments,
  };
}
export async function changeProspectStage(raw: unknown) {
  const input = crmStageSchema.parse(raw);
  const { viewer, context } = await authorize(input, true);
  if (context.version !== input.version)
    throw businessError(
      "A etapa foi alterada por outra pessoa. Atualize a página antes de salvar.",
    );
  if (context.stage === input.stage) return { version: context.version };
  const saved = await repository.setCrmStage({
    ...input,
    actorId: viewer.id,
    beforeLabel: crmStageLabels[context.stage],
    afterLabel: crmStageLabels[input.stage],
  });
  if (!saved)
    throw businessError("A etapa ou seus favoritos mudaram. Atualize a página antes de salvar.");
  return saved;
}
export async function commentOnProspect(raw: unknown) {
  const input = crmCommentSchema.parse(raw);
  const { viewer } = await authorize(input, true);
  const saved = await repository.insertCrmComment({ ...input, actorId: viewer.id });
  if (!saved)
    throw businessError("Não foi possível salvar. Confirme se o cliente continua favoritado.");
  return saved;
}
export async function getProspectHistory(raw: unknown) {
  const input = crmHistorySchema.parse(raw);
  await authorize(input);
  return repository.crmHistory(input.prospectId, input.cursor);
}
export async function getProspectAttachments(raw: unknown) {
  const input = crmAttachmentPageSchema.parse(raw);
  await authorize(input);
  return repository.crmAttachments(input.prospectId, input.page);
}

export async function prepareProspectAttachment(raw: unknown) {
  const input = crmAttachmentSchema.parse(raw);
  const { viewer } = await authorize(input, true);
  const { bucket } = neonStorage();
  const id = v7();
  const path = `pending/${input.projectId}/${input.prospectId}/${id}`;
  const contentType = attachmentMime(input.name, input.contentType);
  if (!contentType) throw businessError("Formato de arquivo não permitido.");
  const form = await neonUploadForm(path, contentType, input.size, id);
  const saved = await repository.reserveCrmAttachment({
    ...input,
    id,
    actorId: viewer.id,
    contentType,
    storageProvider: "neon",
    storageBucket: bucket,
    storagePath: path,
  });
  if (!saved) throw businessError("Não foi possível iniciar o anexo. Confirme seus favoritos.");
  return { attachmentId: id, url: form.url, fields: form.fields };
}
export async function finishProspectAttachment(raw: unknown) {
  const input = crmAttachmentIdSchema.parse(raw);
  const { viewer } = await authorize(input, true);
  const file = await repository.findCrmAttachment(input);
  if (!file || file.uploadedBy !== viewer.id || file.storageProvider !== "neon")
    throw businessError("Anexo não encontrado.");
  if (file.status === "ready") return { id: file.id };
  if (file.status !== "pending" || new Date(file.expiresAt).getTime() < Date.now())
    throw businessError("Este envio expirou. Selecione o arquivo novamente.");
  const metadata = await neonFileMetadata(file.storageBucket, file.storagePath);
  if (
    !metadata.ETag ||
    metadata.ContentLength !== file.size ||
    file.size > MAX_ATTACHMENT_BYTES ||
    metadata.ContentType !== file.contentType ||
    metadata.Metadata?.attachmentid !== file.id
  )
    throw businessError("O arquivo enviado não corresponde ao anexo autorizado.");
  const finalPath = `clients/${input.projectId}/${input.prospectId}/${file.id}/${v7()}`;
  await neonCopyFile(file.storageBucket, file.storagePath, finalPath, metadata.ETag);
  let completed: Awaited<ReturnType<typeof repository.completeCrmAttachment>>;
  try {
    const copied = await neonFileMetadata(file.storageBucket, finalPath);
    if (copied.ContentLength !== file.size || copied.ETag !== metadata.ETag)
      throw businessError("Não foi possível validar o arquivo. Tente enviá-lo novamente.");
    completed = await repository.completeCrmAttachment({
      ...input,
      actorId: viewer.id,
      finalPath,
    });
    if (!completed) throw businessError("O anexo mudou durante o envio. Atualize a página.");
  } catch (error) {
    await neonRemovePendingFile(file.storageBucket, finalPath).catch(() => {});
    throw error;
  }
  // A fresh final key prevents reuse of the browser's upload grant from replacing a ready file.
  await neonRemovePendingFile(file.storageBucket, file.storagePath).catch(() => {});
  return completed;
}
export async function downloadProspectAttachment(raw: unknown) {
  const input = crmAttachmentIdSchema.parse(raw);
  await authorize(input);
  const file = await repository.findCrmAttachment(input);
  if (!file || file.status !== "ready" || file.storageProvider !== "neon")
    throw businessError("Arquivo não encontrado.");
  return {
    url: await neonDownloadUrl(file.storageBucket, file.storagePath, file.name),
    name: file.name,
  };
}
