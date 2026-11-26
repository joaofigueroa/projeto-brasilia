"use client";
import { CircleHelp, Download, Eye, History } from "lucide-react";
import { useState, useTransition } from "react";
import { useWorkspaceAttachments } from "@/hooks/use-workspace-attachments";
import { fileSizeLabel } from "@/libs/prospect-crm";
import { getOlderTaskHistoryAction } from "@/server/actions/workspace-attachments";
import type { BoardData, Task, TaskHistory } from "@/types/domain";
import { AttachmentPreviewButton, canPreviewAttachment } from "./attachment-preview";
import { AttachmentUpload } from "./attachment-upload";
import { FormError } from "./feedback";
import { HistoryTimeline } from "./history-timeline";

const labels = {
  created: "criou a tarefa",
  updated: "editou a tarefa",
  moved: "movimentou a tarefa",
  deleted: "excluiu a tarefa",
  attachment_added: "anexou um arquivo",
};
const fieldLabels = {
  title: "Título",
  description: "Descrição",
  status: "Status",
  priority: "Prioridade",
  projectId: "Projeto",
  assigneeIds: "Responsáveis",
  administratorId: "Administração do card",
  weekStart: "Semana",
  dueDate: "Prazo",
  availability: "Disponibilidade",
};

export function TaskHistoryPanel({ data, task }: { data: BoardData; task: Task }) {
  const up = useWorkspaceAttachments({ kind: "task", id: task.id });
  const [older, setOlder] = useState<TaskHistory[]>([]);
  const [hasMore, setHasMore] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const entries = [
    ...new Map([...data.history, ...older].map((entry) => [entry.id, entry])).values(),
  ];

  function loadOlder() {
    const last = entries.at(-1);
    if (!last) return;
    setError("");
    startTransition(async () => {
      try {
        const result = await getOlderTaskHistoryAction({
          taskId: task.id,
          cursor: { id: last.id, createdAt: last.createdAt },
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        setOlder((previous) => [...previous, ...result.data.entries]);
        setHasMore(result.data.hasMore);
      } catch {
        setError("Não foi possível consultar o histórico. Tente novamente.");
      }
    });
  }

  return (
    <>
      <div className="history-intro">
        <History size={20} aria-hidden="true" />
        <div>
          <h3>Histórico da tarefa</h3>
          <p>Consulte alterações e anexos por data.</p>
        </div>
      </div>
      <AttachmentUpload
        enabled={task.canMove}
        storageConfigured={data.taskStorageConfigured}
        up={up}
      />
      <HistoryTimeline
        fieldLabels={fieldLabels}
        entries={entries.map((entry) => {
          const { attachment } = entry;
          const previewable = attachment && canPreviewAttachment(attachment);
          return {
            ...entry,
            label: labels[entry.kind],
            extra: attachment && (
              <div className="history-attachment-actions">
                {previewable && (
                  <AttachmentPreviewButton
                    file={attachment}
                    scope={{ kind: "task", id: task.id }}
                    disabled={up.pending}
                    className="history-attachment"
                  >
                    <Eye size={15} aria-hidden="true" />
                    <span>{attachment.name}</span>
                    <small>{fileSizeLabel(attachment.size)}</small>
                  </AttachmentPreviewButton>
                )}
                <button
                  className={previewable ? "icon-button" : "history-attachment"}
                  type="button"
                  title="Baixar arquivo"
                  aria-label={`Baixar ${attachment.name}`}
                  disabled={up.pending}
                  onClick={() => up.download(attachment.id)}
                >
                  <Download size={15} aria-hidden="true" />
                  {!previewable && (
                    <>
                      <span>{attachment.name}</span>
                      <small>{fileSizeLabel(attachment.size)}</small>
                    </>
                  )}
                </button>
              </div>
            ),
          };
        })}
      />
      {(hasMore ?? data.hasOlderHistory) && (
        <button type="button" className="button secondary" disabled={pending} onClick={loadOlder}>
          {pending ? "Carregando…" : "Ver registros anteriores"}
        </button>
      )}
      <FormError message={error} />
      <p className="history-footnote">
        <CircleHelp size={15} />O histórico é preservado e não pode ser editado.
      </p>
    </>
  );
}
