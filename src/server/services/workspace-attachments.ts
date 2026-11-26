import "server-only";
import { v7 } from "uuid";
import { attachmentMime, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import {
  neonCopyFile,
  neonDownloadUrl,
  neonFileMetadata,
  neonRemovePendingFile,
  neonStorage,
  neonUploadForm,
} from "@/server/integrations/neon-storage";
import { findTask, listTaskHistory, taskHistoryPageSize } from "@/server/repositories/tasks";
import {
  completeWorkspaceAttachment,
  findWorkspaceAttachment,
  reserveWorkspaceAttachment,
} from "@/server/repositories/workspace-attachments";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import type { AttachmentScope } from "@/types/domain";
import {
  taskHistoryCursorSchema,
  workspaceAttachmentIdSchema,
  workspaceAttachmentInputSchema,
} from "@/validators/workspace-attachment";
import { taskPermissions } from "./task-permissions";

async function authorize(scope: AttachmentScope, write = false) {
  const viewer = await requireViewer();
  if (scope.kind === "project") {
    if (viewer.role !== "admin")
      throw businessError("Somente administradores podem acessar os arquivos do projeto.");
  } else {
    const task = await findTask(scope.id);
    if (!task) throw businessError("Tarefa não encontrada.");
    if (write && !taskPermissions(viewer, task).canMove)
      throw businessError("Somente responsáveis e administradores podem anexar arquivos.");
  }
  return viewer;
}

export async function prepareWorkspaceAttachment(raw: unknown) {
  const input = workspaceAttachmentInputSchema.parse(raw);
  const viewer = await authorize(input.scope, true);
  const { bucket } = neonStorage();
  const id = v7();
  const path = `pending/workspace/${input.scope.kind}/${input.scope.id}/${id}`;
  const contentType = attachmentMime(input.name, input.contentType);
  if (!contentType) throw businessError("Formato de arquivo não permitido.");
  const form = await neonUploadForm(path, contentType, input.size, id);
  const saved = await reserveWorkspaceAttachment({
    ...input,
    id,
    contentType,
    actorId: viewer.id,
    storageBucket: bucket,
    storagePath: path,
  });
  if (!saved)
    throw businessError(
      input.folderId
        ? "A pasta selecionada não está disponível para este projeto."
        : "Não foi possível iniciar o envio. Confira seu acesso.",
    );
  return { attachmentId: id, url: form.url, fields: form.fields };
}

export async function finishWorkspaceAttachment(raw: unknown) {
  const { scope, attachmentId } = workspaceAttachmentIdSchema.parse(raw);
  const viewer = await authorize(scope, true);
  const file = await findWorkspaceAttachment(scope, attachmentId);
  if (!file || file.uploadedBy !== viewer.id) throw businessError("Anexo não encontrado.");
  if (file.status === "ready") return { id: file.id };
  if (new Date(file.expiresAt).getTime() <= Date.now())
    throw businessError("Este envio expirou. Selecione o arquivo novamente.");
  const { storageBucket: bucket, storagePath: temporaryPath } = file;
  const metadata = await neonFileMetadata(bucket, temporaryPath);
  if (
    !metadata.ETag ||
    metadata.ContentLength !== file.size ||
    file.size > MAX_ATTACHMENT_BYTES ||
    metadata.ContentType !== file.contentType ||
    metadata.Metadata?.attachmentid !== file.id
  )
    throw businessError("O arquivo enviado não corresponde ao anexo autorizado.");
  const path = `workspace/${scope.kind}/${scope.id}/${file.id}/${v7()}`;
  await neonCopyFile(bucket, temporaryPath, path, metadata.ETag);
  try {
    const copied = await neonFileMetadata(bucket, path);
    if (copied.ContentLength !== file.size || copied.ETag !== metadata.ETag)
      throw businessError("Não foi possível validar o arquivo. Tente enviá-lo novamente.");
  } catch (error) {
    await neonRemovePendingFile(bucket, path).catch(() => {});
    throw error;
  }
  // Preserve the private object if the database response is lost after committing its reference.
  const saved = await completeWorkspaceAttachment({
    scope,
    attachmentId,
    path,
    actorId: viewer.id,
  });
  if (!saved) {
    await neonRemovePendingFile(bucket, path).catch(() => {});
    const completed = await findWorkspaceAttachment(scope, attachmentId);
    if (completed?.status === "ready") return { id: completed.id };
    throw businessError("Não foi possível confirmar o arquivo. Atualize a página.");
  }
  await neonRemovePendingFile(bucket, temporaryPath).catch(() => {});
  return saved;
}

export async function downloadWorkspaceAttachment(raw: unknown) {
  const { scope, attachmentId } = workspaceAttachmentIdSchema.parse(raw);
  await authorize(scope);
  const file = await findWorkspaceAttachment(scope, attachmentId);
  if (!file || file.status !== "ready") throw businessError("Arquivo não encontrado.");
  return {
    name: file.name,
    contentType: file.contentType,
    url: await neonDownloadUrl(file.storageBucket, file.storagePath, file.name),
  };
}

export async function getOlderTaskHistory(raw: unknown) {
  const { taskId, cursor } = taskHistoryCursorSchema.parse(raw);
  await authorize({ kind: "task", id: taskId });
  const entries = await listTaskHistory(taskId, cursor);
  return { entries, hasMore: entries.length === taskHistoryPageSize };
}
