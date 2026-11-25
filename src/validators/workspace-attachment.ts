import { z } from "zod";
import { idSchema } from "@/validators";
import { attachmentSchema } from "./attachment";

export const attachmentScopeSchema = z.object({
  kind: z.enum(["task", "project"]),
  id: idSchema,
});
export const workspaceAttachmentInputSchema = attachmentSchema.safeExtend({
  scope: attachmentScopeSchema,
});
export const workspaceAttachmentIdSchema = z.object({
  scope: attachmentScopeSchema,
  attachmentId: idSchema,
});
export const taskHistoryCursorSchema = z.object({
  taskId: idSchema,
  cursor: z.object({ id: idSchema, createdAt: z.iso.datetime({ offset: true }) }),
});
