"use client";
import { ChevronRight, Download, FileText, Folder, FolderInput, FolderPlus } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { useWorkspaceAttachments } from "@/hooks/use-workspace-attachments";
import { timestampLabel } from "@/libs/presentation";
import { fileSizeLabel } from "@/libs/prospect-crm";
import type { getProjectFiles } from "@/server/services/projects";
import { AttachmentUpload } from "./attachment-upload";
import { Pagination } from "./pagination";
import { ProjectFileDialog, type ProjectFileOperation } from "./project-file-dialog";

type Data = NonNullable<Awaited<ReturnType<typeof getProjectFiles>>>;

export function ProjectFiles({
  projectId,
  folder,
  folders,
  files,
  storageConfigured,
}: {
  projectId: string;
  folder: Data["folder"];
  folders: Data["folders"];
  files: Data["files"];
  storageConfigured: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [navigating, startTransition] = useTransition();
  const [operation, setOperation] = useState<ProjectFileOperation | null>(null);
  const [notice, setNotice] = useState("");
  const up = useWorkspaceAttachments({ kind: "project", id: projectId }, folder?.id ?? null);
  const { pagination, items } = files;
  function listHref(folderId: string | null, page = 1, size = pagination.pageSize) {
    const params = new URLSearchParams();
    if (folderId) params.set("folder", folderId);
    if (page !== 1) params.set("page", String(page));
    if (size !== 20) params.set("size", String(size));
    const query = params.toString();
    return `/projetos/${projectId}${query ? `?${query}` : ""}`;
  }
  function navigate(page: number, size: number) {
    startTransition(() =>
      router.replace(listHref(folder?.id ?? null, page, size), { scroll: false }),
    );
  }
  return (
    <section className="project-file-panel" aria-labelledby={id}>
      {folder && (
        <Link className="project-file-back" href={listHref(null)} onClick={() => setNotice("")}>
          Arquivos do projeto <ChevronRight size={14} aria-hidden="true" />
        </Link>
      )}
      <header className="project-files-header">
        <h2 id={id} tabIndex={-1}>
          {folder?.name ?? "Arquivos do projeto"}
        </h2>
        {!folder && (
          <button
            className="button secondary"
            type="button"
            onClick={() => {
              setNotice("");
              setOperation({ kind: "create" });
            }}
          >
            <FolderPlus size={15} aria-hidden="true" /> Nova pasta
          </button>
        )}
      </header>
      {!folder && folders.length > 0 && (
        <ul className="project-folder-list" aria-label="Pastas do projeto">
          {folders.map((item) => (
            <li key={item.id}>
              <Link href={listHref(item.id)} prefetch={false} onClick={() => setNotice("")}>
                <Folder size={17} aria-hidden="true" />
                <span>{item.name}</span>
                <ChevronRight size={14} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!folder && folders.length > 0 && (
        <h3 className="project-file-group-title">Arquivos sem pasta</h3>
      )}
      <AttachmentUpload enabled storageConfigured={storageConfigured} up={up} />
      <p className="workspace-attachment-success project-file-notice" role="status">
        {notice}
      </p>
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
                {folders.length > 0 && (
                  <button
                    className="button secondary project-file-move"
                    type="button"
                    aria-label={`Mover ${file.name}`}
                    onClick={() => {
                      setNotice("");
                      setOperation({ kind: "move", file });
                    }}
                  >
                    <FolderInput size={15} aria-hidden="true" /> Mover
                  </button>
                )}
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
        <p className="project-files-empty">
          {folder
            ? "Nenhum arquivo nesta pasta."
            : folders.length
              ? "Nenhum arquivo sem pasta."
              : "Nenhum arquivo neste projeto."}
        </p>
      )}
      <AnimatePresence>
        {operation && (
          <ProjectFileDialog
            key={operation.kind === "create" ? "create" : operation.file.id}
            projectId={projectId}
            operation={operation}
            folders={folders}
            sourceFolderId={folder?.id ?? null}
            onClose={() => setOperation(null)}
            onCreated={(folderId) => {
              setOperation(null);
              setNotice("Pasta criada.");
              router.push(listHref(folderId));
            }}
            onMoved={() => {
              setOperation(null);
              setNotice("Arquivo movido.");
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
