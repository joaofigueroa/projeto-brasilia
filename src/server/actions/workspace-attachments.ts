"use server";

import { revalidatePath } from "next/cache";
import {
  downloadWorkspaceAttachment,
  finishWorkspaceAttachment,
  getOlderTaskHistory,
  prepareWorkspaceAttachment,
} from "@/server/services/workspace-attachments";
import { actionResult } from "./result";

export async function prepareWorkspaceAttachmentAction(input: unknown) {
  return actionResult(() => prepareWorkspaceAttachment(input));
}
export async function finishWorkspaceAttachmentAction(input: unknown) {
  return actionResult(async () => {
    const result = await finishWorkspaceAttachment(input);
    revalidatePath("/tarefas");
    revalidatePath("/projetos/[id]", "page");
    return result;
  });
}
export async function downloadWorkspaceAttachmentAction(input: unknown) {
  return actionResult(() => downloadWorkspaceAttachment(input));
}
export async function getOlderTaskHistoryAction(input: unknown) {
  return actionResult(() => getOlderTaskHistory(input));
}
