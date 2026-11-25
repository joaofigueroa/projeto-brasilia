import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { downloadSignedFile, uploadSignedFile } from "@/libs/file-transfer";
import { attachmentMime, type CrmStage, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import {
  changeProspectStageAction,
  commentOnProspectAction,
  downloadProspectAttachmentAction,
  finishProspectAttachmentAction,
  prepareProspectAttachmentAction,
  prospectAttachmentsAction,
  prospectHistoryAction,
} from "@/server/actions/prospect-crm";
import type { ProspectCrm } from "@/types/prospect-crm";
export function useProspectFollowup(projectId: string, prospectId: string, data: ProspectCrm) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [history, setHistory] = useState(data.history);
  const [attachments, setAttachments] = useState(data.attachments);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; percent: number } | null>(
    null,
  );
  const scope = { projectId, prospectId };
  function run(work: () => Promise<void>) {
    setError("");
    startTransition(async () => {
      try {
        await work();
      } catch {
        setError("Não foi possível concluir. Confira sua conexão e tente novamente.");
      }
    });
  }
  function changeStage(stage: CrmStage) {
    run(async () => {
      const result = await changeProspectStageAction({ ...scope, stage, version: data.version });
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }
  function comment() {
    run(async () => {
      const result = await commentOnProspectAction({ ...scope, body });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }
  function loadHistory() {
    if (!history.nextCursor) return;
    run(async () => {
      const result = await prospectHistoryAction({ ...scope, cursor: history.nextCursor });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setHistory((previous) => ({
        entries: [
          ...previous.entries,
          ...result.data.entries.filter(
            (entry) => !previous.entries.some((item) => item.id === entry.id),
          ),
        ],
        nextCursor: result.data.nextCursor,
      }));
    });
  }
  function attachmentPage(page: number) {
    run(async () => {
      const result = await prospectAttachmentsAction({ ...scope, page });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setAttachments(result.data);
    });
  }
  function upload(file: File) {
    if (file.size > MAX_ATTACHMENT_BYTES || file.size === 0) {
      setError("Selecione um arquivo de até 20 MB.");
      return;
    }
    if (!attachmentMime(file.name, file.type)) {
      setError("Formato não permitido. Use um documento, planilha ou imagem compatível.");
      return;
    }
    run(async () => {
      setUploadProgress({ name: file.name, percent: 0 });
      try {
        const prepared = await prepareProspectAttachmentAction({
          ...scope,
          name: file.name,
          contentType: file.type,
          size: file.size,
        });
        if (!prepared.success) {
          setError(prepared.error);
          return;
        }
        await uploadSignedFile(prepared.data, file, (percent) =>
          setUploadProgress({ name: file.name, percent }),
        );
        const saved = await finishProspectAttachmentAction({
          ...scope,
          attachmentId: prepared.data.attachmentId,
        });
        if (!saved.success) {
          setError(saved.error);
          return;
        }
        router.refresh();
      } finally {
        setUploadProgress(null);
      }
    });
  }
  function download(attachmentId: string) {
    run(async () => {
      const result = await downloadProspectAttachmentAction({ ...scope, attachmentId });
      if (!result.success) {
        setError(result.error);
        return;
      }
      downloadSignedFile(result.data);
    });
  }
  return {
    pending,
    error,
    body,
    setBody,
    history,
    attachments,
    changeStage,
    comment,
    loadHistory,
    attachmentPage,
    upload,
    download,
    uploadProgress,
  };
}
