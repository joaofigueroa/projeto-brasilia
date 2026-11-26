"use client";

import {
  ArrowUpRight,
  ChevronRight,
  Download,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, useId, useState, useTransition } from "react";
import { useWorkspaceAttachments } from "@/hooks/use-workspace-attachments";
import { timestampLabel } from "@/libs/presentation";
import { projectFilePath } from "@/libs/project-file-path";
import { fileSizeLabel } from "@/libs/prospect-crm";
import { moveProjectFilesAction } from "@/server/actions/workspace-attachments";
import type { getProjectFiles } from "@/server/services/projects";
import { AttachmentUpload } from "./attachment-upload";
import { FormError } from "./feedback";
import { Pagination } from "./pagination";
import { type MoveFile, ProjectFileDialog, type ProjectFileOperation } from "./project-file-dialog";

type Data = NonNullable<Awaited<ReturnType<typeof getProjectFiles>>>;
const fileDragType = "application/x-brasilia-project-files";

export function ProjectFiles({
  projectId,
  folder,
  folders,
  files,
  search,
  storageConfigured,
}: {
  projectId: string;
  folder: Data["folder"];
  folders: Data["folders"];
  files: Data["files"];
  search: Data["search"];
  storageConfigured: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [operation, setOperation] = useState<ProjectFileOperation | null>(null);
  const [notice, setNotice] = useState<{ message: string; destination?: string | null } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [selection, setSelection] = useState<{ view: string; ids: string[] } | null>(null);
  const [dragFiles, setDragFiles] = useState<MoveFile[]>([]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const folderId = folder?.id ?? null;
  const up = useWorkspaceAttachments({ kind: "project", id: projectId }, folderId);
  const { pagination, items } = files;
  const view = JSON.stringify([folderId, search, pagination.page, pagination.pageSize]);
  const selected = new Set(selection?.view === view ? selection.ids : []);
  const picked = items.filter((file) => selected.has(file.id));
  const folderIndex = new Map(folders.map((item) => [item.id, item]));
  const folderPath = projectFilePath(folderIndex, folderId);
  const currentFolders = search
    ? folders.filter((entry) =>
        entry.name.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")),
      )
    : folders.filter((entry) => entry.parentId === folderId);

  function href(target: string | null, q = "", page = 1, size = pagination.pageSize) {
    const params = new URLSearchParams();
    if (target) params.set("folder", target);
    if (q) params.set("q", q);
    if (page !== 1) params.set("page", String(page));
    if (size !== 20) params.set("size", String(size));
    return `/projetos/${projectId}${params.size ? `?${params}` : ""}`;
  }

  function openMove(filesToMove: MoveFile[]) {
    setNotice(null);
    setError("");
    setOperation({ kind: "move", files: filesToMove, initialFolderId: folderId });
  }

  function selectFile(fileId: string, checked: boolean) {
    setSelection({
      view,
      ids: checked ? [...selected, fileId] : [...selected].filter((id) => id !== fileId),
    });
  }

  function dropFiles(event: DragEvent, target: string | null) {
    if (!dragFiles.length || !event.dataTransfer.types.includes(fileDragType)) return;
    event.preventDefault();
    setDropTarget(null);
    setDragFiles([]);
    if (pending || dragFiles.every((entry) => entry.folderId === target)) return;
    setError("");
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await moveProjectFilesAction({
          projectId,
          folderId: target,
          files: dragFiles.map((entry) => ({
            attachmentId: entry.id,
            sourceFolderId: entry.folderId,
          })),
        });
        if (!result.success) return setError(result.error);
        setSelection(null);
        const count = result.data.count;
        setNotice({
          message: count === 1 ? "Arquivo movido." : `${count} arquivos movidos.`,
          destination: target,
        });
      } catch {
        setError("Não foi possível mover os arquivos. Tente novamente.");
      }
    });
  }

  function folderDrop(target: string | null) {
    const key = target ?? "root";
    return {
      "data-drop": dropTarget === key,
      onDragOver: (event: DragEvent<HTMLAnchorElement>) => {
        if (
          pending ||
          !event.dataTransfer.types.includes(fileDragType) ||
          !dragFiles.some((file) => file.folderId !== target)
        )
          return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setDropTarget(key);
      },
      onDragLeave: (event: DragEvent<HTMLAnchorElement>) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          setDropTarget(null);
      },
      onDrop: (event: DragEvent<HTMLAnchorElement>) => dropFiles(event, target),
    };
  }

  return (
    <section className="project-file-panel" aria-labelledby={id} aria-busy={pending}>
      <div className="project-files-header">
        <h2 id={id} tabIndex={-1}>
          <HardDrive size={20} aria-hidden="true" /> Arquivos
        </h2>
        <form
          className="project-file-search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const q = String(new FormData(event.currentTarget).get("q") ?? "").trim();
            startTransition(() => router.push(href(folderId, q), { scroll: false }));
          }}
        >
          <input
            key={search}
            name="q"
            aria-label="Buscar arquivos e pastas"
            placeholder="Buscar neste projeto"
            defaultValue={search}
            maxLength={120}
          />
          <button className="icon-button" type="submit" aria-label="Buscar">
            <Search size={17} />
          </button>
          {search && (
            <Link className="icon-button" href={href(folderId)} aria-label="Limpar busca">
              <X size={16} />
            </Link>
          )}
        </form>
      </div>
      <div className="project-file-toolbar">
        <nav className="project-picker-path" aria-label="Localização atual">
          <Link
            href={href(null)}
            {...folderDrop(null)}
            aria-current={!folderId && !search ? "page" : undefined}
          >
            Arquivos do projeto
          </Link>
          {folderPath.map((part) => (
            <Link
              key={part.id}
              href={href(part.id)}
              {...folderDrop(part.id)}
              aria-current={part.id === folderId && !search ? "page" : undefined}
            >
              <ChevronRight size={14} aria-hidden="true" />
              {part.name}
            </Link>
          ))}
        </nav>
        <button
          className="button secondary"
          type="button"
          disabled={pending}
          onClick={() => {
            setNotice(null);
            setOperation({ kind: "create", parentId: folderId });
          }}
        >
          <FolderPlus size={16} aria-hidden="true" /> Nova pasta
        </button>
      </div>
      <AttachmentUpload enabled storageConfigured={storageConfigured} up={up} />
      <div className="project-file-status" role="status">
        {notice?.message}
        {notice?.destination !== undefined && (
          <Link href={href(notice.destination)} scroll={false}>
            Abrir destino <ArrowUpRight size={13} />
          </Link>
        )}
      </div>
      <FormError message={error} />

      <div className="project-file-body">
        <aside className="project-file-sidebar">
          <nav aria-label="Navegar pelas pastas">
            <Link
              className="project-folder-shortcut"
              href={href(null)}
              aria-current={!folderId && !search ? "page" : undefined}
              {...folderDrop(null)}
            >
              <FolderOpen size={17} aria-hidden="true" /> Raiz do projeto
            </Link>
            {folders
              .filter((entry) => entry.parentId === null)
              .map((entry) => (
                <Link
                  key={entry.id}
                  className="project-folder-shortcut"
                  href={href(entry.id)}
                  prefetch={false}
                  aria-current={entry.id === folderId && !search ? "page" : undefined}
                  {...folderDrop(entry.id)}
                >
                  <Folder size={16} aria-hidden="true" />
                  <span>{entry.name}</span>
                </Link>
              ))}
          </nav>
        </aside>
        <div className="project-file-content">
          <div className="project-file-selection">
            {picked.length ? (
              <>
                <span>
                  {picked.length === 1
                    ? "1 arquivo selecionado"
                    : `${picked.length} arquivos selecionados`}
                </span>
                <button
                  className="button secondary"
                  disabled={pending}
                  type="button"
                  onClick={() => openMove(picked)}
                >
                  <FolderInput size={16} aria-hidden="true" /> Mover seleção
                </button>
                <button
                  className="icon-button"
                  type="button"
                  aria-label="Limpar seleção"
                  onClick={() => setSelection(null)}
                >
                  <X size={17} />
                </button>
              </>
            ) : (
              <span>
                {search ? `Resultados para “${search}”` : (folder?.name ?? "Conteúdo do projeto")}
              </span>
            )}
          </div>
          <table className="project-file-table">
            <thead>
              <tr>
                <th scope="col">
                  <input
                    type="checkbox"
                    aria-label="Selecionar arquivos desta página"
                    disabled={!items.length || pending}
                    checked={items.length > 0 && picked.length === items.length}
                    ref={(element) => {
                      if (element)
                        element.indeterminate = picked.length > 0 && picked.length < items.length;
                    }}
                    onChange={(event) =>
                      setSelection({
                        view,
                        ids: event.target.checked ? items.map((file) => file.id) : [],
                      })
                    }
                  />
                </th>
                <th scope="col">Nome</th>
                <th scope="col" className="project-file-meta">
                  Origem
                </th>
                <th scope="col" className="project-file-meta">
                  Adicionado
                </th>
                <th scope="col">
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {currentFolders.map((entry) => (
                <tr key={entry.id} className="project-folder-row">
                  <td />
                  <td>
                    <Link
                      href={href(entry.id)}
                      prefetch={false}
                      className="project-file-name"
                      {...folderDrop(entry.id)}
                    >
                      <Folder size={19} aria-hidden="true" />
                      <span>{entry.name}</span>
                      <ChevronRight size={15} aria-hidden="true" />
                    </Link>
                  </td>
                  <td className="project-file-meta">
                    {search
                      ? (folderIndex.get(entry.parentId ?? "")?.name ?? "Raiz do projeto")
                      : "Pasta"}
                  </td>
                  <td className="project-file-meta" />
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      title="Renomear pasta"
                      aria-label={`Renomear ${entry.name}`}
                      disabled={pending}
                      onClick={() => {
                        setNotice(null);
                        setOperation({ kind: "rename", folder: entry });
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {items.map((file) => (
                <tr key={file.id} data-selected={selected.has(file.id)}>
                  <td>
                    <input
                      type="checkbox"
                      aria-label={`Selecionar ${file.name}`}
                      checked={selected.has(file.id)}
                      disabled={pending}
                      onChange={(event) => selectFile(file.id, event.target.checked)}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="project-file-name"
                      aria-pressed={selected.has(file.id)}
                      disabled={pending}
                      onClick={() => selectFile(file.id, !selected.has(file.id))}
                      draggable={!pending}
                      onDragStart={(event) => {
                        event.dataTransfer.setData(fileDragType, "files");
                        event.dataTransfer.effectAllowed = "move";
                        setDragFiles(selected.has(file.id) ? picked : [file]);
                      }}
                      onDragEnd={() => {
                        setDragFiles([]);
                        setDropTarget(null);
                      }}
                    >
                      <FileText size={18} aria-hidden="true" />
                      <span>
                        {file.name}
                        <small>{fileSizeLabel(file.size)}</small>
                      </span>
                    </button>
                    {search && (
                      <Link className="project-file-location" href={href(file.folderId)}>
                        {projectFilePath(folderIndex, file.folderId)
                          .map((part) => part.name)
                          .join(" / ") || "Raiz do projeto"}
                      </Link>
                    )}
                  </td>
                  <td className="project-file-meta">{file.taskTitle ?? "Projeto"}</td>
                  <td className="project-file-meta">{timestampLabel(file.createdAt)}</td>
                  <td>
                    <div className="project-file-actions">
                      <button
                        type="button"
                        className="icon-button"
                        title="Mover para outra pasta"
                        aria-label={`Mover ${file.name}`}
                        disabled={pending}
                        onClick={() => openMove([file])}
                      >
                        <FolderInput size={16} />
                      </button>
                      <button
                        type="button"
                        className="icon-button"
                        title="Baixar"
                        aria-label={`Baixar ${file.name}`}
                        disabled={up.pending}
                        onClick={() => up.download(file.id)}
                      >
                        <Download size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && !currentFolders.length && (
            <p className="project-files-empty">
              {search ? "Nenhum arquivo ou pasta encontrado." : "Esta pasta está vazia."}
            </p>
          )}
          {items.length > 0 && (
            <Pagination
              {...pagination}
              targetId={id}
              label="arquivos do projeto"
              pending={pending}
              onPageChange={(page) =>
                startTransition(() =>
                  router.replace(href(folderId, search, page), { scroll: false }),
                )
              }
              onPageSizeChange={(size) =>
                startTransition(() =>
                  router.replace(href(folderId, search, 1, size), { scroll: false }),
                )
              }
            />
          )}
        </div>
      </div>
      <AnimatePresence>
        {operation && (
          <ProjectFileDialog
            projectId={projectId}
            operation={operation}
            folders={folders}
            onClose={() => setOperation(null)}
            onCreated={() => {
              setOperation(null);
              setNotice({ message: "Pasta criada." });
            }}
            onSaved={(message, destination) => {
              setOperation(null);
              setSelection(null);
              setNotice({ message, destination });
            }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
