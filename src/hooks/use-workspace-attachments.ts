import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { downloadSignedFile, uploadSignedFile } from "@/libs/file-transfer";
import {
  downloadWorkspaceAttachmentAction,
  finishWorkspaceAttachmentAction,
  prepareWorkspaceAttachmentAction,
} from "@/server/actions/workspace-attachments";
import type { AttachmentScope } from "@/types/domain";

export function useWorkspaceAttachments(scope: AttachmentScope) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [progress, setProgress] = useState<{
    name: string;
    percent: number;
    current: number;
    total: number;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");

  function upload(files: File[]) {
    if (!files.length || pending) return;
    setErrors([]);
    setNotice("");
    startTransition(async () => {
      const failed: string[] = [];
      let uploaded = 0;
      for (const [index, file] of files.entries()) {
        const item = { name: file.name, current: index + 1, total: files.length };
        setProgress({ ...item, percent: 0 });
        try {
          const grant = await prepareWorkspaceAttachmentAction({
            scope,
            name: file.name,
            size: file.size,
            contentType: file.type,
          });
          if (!grant.success) {
            failed.push(`${file.name} · ${grant.error}`);
            continue;
          }
          await uploadSignedFile(grant.data, file, (percent) => setProgress({ ...item, percent }));
          const saved = await finishWorkspaceAttachmentAction({
            scope,
            attachmentId: grant.data.attachmentId,
          });
          if (saved.success) uploaded++;
          else failed.push(`${file.name} · ${saved.error}`);
        } catch {
          failed.push(`${file.name} · Falha no envio. Selecione o arquivo novamente.`);
        }
      }
      setProgress(null);
      setErrors(failed);
      if (uploaded) {
        setNotice(uploaded === 1 ? "1 arquivo anexado." : `${uploaded} arquivos anexados.`);
        router.refresh();
      }
    });
  }

  function download(attachmentId: string) {
    setErrors([]);
    startTransition(async () => {
      try {
        const result = await downloadWorkspaceAttachmentAction({ scope, attachmentId });
        if (result.success) downloadSignedFile(result.data);
        else setErrors([result.error]);
      } catch {
        setErrors(["Não foi possível baixar o arquivo. Tente novamente."]);
      }
    });
  }

  return { upload, download, pending, progress, errors, notice };
}
