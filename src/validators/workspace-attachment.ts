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
  q: z.string().trim().max(120).catch(""),
  page: z.coerce.number().int().min(1).max(100000).catch(1),
  size: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .catch(20),
});
export const createFileFolderSchema = z.object({
  projectId: idSchema,
  parentId: idSchema.nullable().default(null),
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
export const renameFileFolderSchema = createFileFolderSchema.omit({ parentId: true }).extend({
  folderId: idSchema,
  previousName: createFileFolderSchema.shape.name,
});
const fileSelection = z.object({ attachmentId: idSchema, sourceFolderId: idSchema.nullable() });
export const moveProjectFilesSchema = z
  .object({
    projectId: idSchema,
    folderId: idSchema.nullable(),
    files: z
      .array(fileSelection)
      .min(1)
      .max(50)
      .refine(
        (files) => new Set(files.map((file) => file.attachmentId)).size === files.length,
        "A seleção contém arquivos repetidos.",
      ),
  })
  .refine(
    ({ files, folderId }) => files.some((file) => file.sourceFolderId !== folderId),
    "Escolha outra pasta.",
  );
export const moveProjectFileSchema = z
  .object({
    ...fileSelection.shape,
    projectId: idSchema,
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
