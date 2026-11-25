import { z } from "zod";
import { crmStages } from "@/libs/prospect-crm";
import { attachmentSchema } from "./attachment";
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
export const crmAttachmentSchema = attachmentSchema.safeExtend(crmScopeSchema.shape);
export const crmAttachmentIdSchema = crmScopeSchema.extend({ attachmentId: z.uuid() });
export const crmAttachmentPageSchema = crmScopeSchema.extend({
  page: z.number().int().min(1).max(100000).default(1),
});
