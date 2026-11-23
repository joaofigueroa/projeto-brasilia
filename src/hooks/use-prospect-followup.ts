import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
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
        await new Promise<void>((resolve, reject) => {
          const form = new FormData();
          for (const [name, value] of Object.entries(prepared.data.fields))
            form.append(name, value);
          form.append("file", file);
          const request = new XMLHttpRequest();
          request.open("POST", prepared.data.url);
          request.timeout = 180000;
          request.upload.onprogress = (event) => {
            if (event.lengthComputable)
              setUploadProgress({
                name: file.name,
                percent: Math.min(100, Math.round((event.loaded / event.total) * 100)),
              });
          };
          request.onload = () =>
            request.status >= 200 && request.status < 300
              ? resolve()
              : reject(new Error("Upload failed"));
          request.onerror = request.ontimeout = () => reject(new Error("Upload interrupted"));
          request.send(form);
        });
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
      const link = document.createElement("a");
      link.href = result.data.url;
      link.download = result.data.name;
      link.rel = "noopener noreferrer";
      link.click();
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
