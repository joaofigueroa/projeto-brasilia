"use client";
import { Download, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useTransition } from "react";
import { useWorkspaceAttachments } from "@/hooks/use-workspace-attachments";
import { timestampLabel } from "@/libs/presentation";
import { fileSizeLabel } from "@/libs/prospect-crm";
import type { getProjectFiles } from "@/server/services/projects";
import { AttachmentUpload } from "./attachment-upload";
import { Pagination } from "./pagination";

export function ProjectFiles({
  projectId,
  files,
  storageConfigured,
}: {
  projectId: string;
  files: NonNullable<Awaited<ReturnType<typeof getProjectFiles>>>["files"];
  storageConfigured: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const up = useWorkspaceAttachments({ kind: "project", id: projectId });
  const { pagination, items } = files;
  function navigate(page: number, size: number) {
    startTransition(() =>
      router.replace(`/projetos/${projectId}?page=${page}&size=${size}`, { scroll: false }),
    );
  }
  return (
    <section className="project-file-panel" aria-labelledby={id}>
      <h2 id={id} tabIndex={-1}>
        Arquivos do projeto
      </h2>
      <AttachmentUpload enabled storageConfigured={storageConfigured} up={up} />
      {items.length ? (
        <>
          <ul className="crm-file-list">
            {items.map((file) => (
              <li key={file.id}>
                <FileText size={20} aria-hidden="true" />
                <div>
                  <strong>{file.name}</strong>
                  <small>
                    {file.taskTitle ? `Tarefa · ${file.taskTitle}` : "Projeto"} ·{" "}
                    {fileSizeLabel(file.size)} · {timestampLabel(file.createdAt)}
                  </small>
                </div>
                <button
                  type="button"
                  className="icon-button"
                  aria-label={`Baixar ${file.name}`}
                  title={`Baixar ${file.name}`}
                  disabled={up.pending}
                  onClick={() => up.download(file.id)}
                >
                  <Download size={17} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
          <Pagination
            {...pagination}
            targetId={id}
            label="arquivos do projeto"
            pending={navigating}
            onPageChange={(page) => navigate(page, pagination.pageSize)}
            onPageSizeChange={(size) => navigate(1, size)}
          />
        </>
      ) : (
        <p className="project-files-empty">Nenhum arquivo neste projeto.</p>
      )}
    </section>
  );
}
