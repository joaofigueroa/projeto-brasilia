import { z } from "zod";
import { idSchema } from "@/validators";
import { attachmentSchema } from "./attachment";

export const attachmentScopeSchema = z.object({
  kind: z.enum(["task", "project"]),
  id: idSchema,
});
export const workspaceAttachmentInputSchema = attachmentSchema
  .safeExtend({
    scope: attachmentScopeSchema,
    folderId: idSchema.nullable().default(null),
  })
  .refine((input) => input.scope.kind === "project" || input.folderId === null, {
    message: "Selecione a pasta na aba Arquivos do projeto.",
    path: ["folderId"],
  });
export const projectFileListSchema = z.object({
  id: idSchema,
  folderId: idSchema.nullable().catch(null),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  size: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(20),
});
export const createFileFolderSchema = z.object({
  projectId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, "Informe o nome da pasta.")
    .max(80, "Use até 80 caracteres.")
    .refine(
      (name) => !/[\\/\p{Cc}]/u.test(name),
      "Use um nome sem barras ou caracteres de controle.",
    ),
});
export const moveProjectFileSchema = z
  .object({
    projectId: idSchema,
    attachmentId: idSchema,
    sourceFolderId: idSchema.nullable(),
    folderId: idSchema.nullable(),
  })
  .refine((input) => input.sourceFolderId !== input.folderId, {
    message: "Escolha outra pasta.",
    path: ["folderId"],
  });
export const workspaceAttachmentIdSchema = z.object({
  scope: attachmentScopeSchema,
  attachmentId: idSchema,
});
export const taskHistoryCursorSchema = z.object({
  taskId: idSchema,
  cursor: z.object({ id: idSchema, createdAt: z.iso.datetime({ offset: true }) }),
});
