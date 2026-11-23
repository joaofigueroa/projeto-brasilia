import { z } from "zod";
import { attachmentMime, crmStages, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
export const crmScopeSchema = z.object({ projectId: z.uuid(), prospectId: z.uuid() });
export const crmHistorySchema = crmScopeSchema.extend({
  cursor: z
    .object({ createdAt: z.iso.datetime({ offset: true }), id: z.uuid() })
    .nullable()
    .default(null),
});
export const crmStageSchema = crmScopeSchema.extend({
  stage: z.enum(crmStages),
  version: z.number().int().positive(),
});
export const crmCommentSchema = crmScopeSchema.extend({
  body: z.string().trim().min(1, "Escreva um comentário.").max(10000),
});
export const crmAttachmentSchema = crmScopeSchema
  .extend({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine(
        (s) =>
          !Array.from(s).some(
            (c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 || c === "/" || c === "\\",
          ),
        "Nome de arquivo inválido.",
      ),
    contentType: z.string().max(150),
    size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "O limite é de 20 MB por arquivo."),
  })
  .superRefine((value, ctx) => {
    if (!attachmentMime(value.name, value.contentType))
      ctx.addIssue({
        code: "custom",
        message: "Formato de arquivo não permitido.",
        path: ["name"],
      });
  });
export const crmAttachmentIdSchema = crmScopeSchema.extend({ attachmentId: z.uuid() });
export const crmAttachmentPageSchema = crmScopeSchema.extend({
  page: z.number().int().min(1).max(100000).default(1),
});
