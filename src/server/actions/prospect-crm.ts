"use server";
import { revalidatePath } from "next/cache";
import {
  changeProspectStage,
  commentOnProspect,
  downloadProspectAttachment,
  finishProspectAttachment,
  getProspectAttachments,
  getProspectHistory,
  prepareProspectAttachment,
} from "@/server/services/prospect-crm";
import { actionResult } from "./result";

function refreshCrm() {
  revalidatePath("/inteligencia");
  revalidatePath("/clientes/[id]", "page");
}
export async function changeProspectStageAction(input: unknown) {
  return actionResult(async () => {
    const saved = await changeProspectStage(input);
    refreshCrm();
    return saved;
  });
}
export async function commentOnProspectAction(input: unknown) {
  return actionResult(async () => {
    const saved = await commentOnProspect(input);
    refreshCrm();
    return saved;
  });
}
export async function prospectHistoryAction(input: unknown) {
  return actionResult(() => getProspectHistory(input));
}
export async function prospectAttachmentsAction(input: unknown) {
  return actionResult(() => getProspectAttachments(input));
}
export async function prepareProspectAttachmentAction(input: unknown) {
  return actionResult(() => prepareProspectAttachment(input));
}
export async function finishProspectAttachmentAction(input: unknown) {
  return actionResult(async () => {
    const saved = await finishProspectAttachment(input);
    refreshCrm();
    return saved;
  });
}
export async function downloadProspectAttachmentAction(input: unknown) {
  return actionResult(() => downloadProspectAttachment(input));
}
