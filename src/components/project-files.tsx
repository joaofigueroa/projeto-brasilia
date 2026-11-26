"use client";

import {
  ArrowUpRight,
  ChevronRight,
  Download,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  HardDrive,
  LayoutGrid,
  List,
  Pencil,
  Search,
  X,
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type DragEvent, useId, useRef, useState, useTransition } from "react";
import { useWorkspaceAttachments } from "@/hooks/use-workspace-attachments";
import { timestampLabel } from "@/libs/presentation";
import { projectFilePath } from "@/libs/project-file-path";
import { attachmentMime, fileSizeLabel } from "@/libs/prospect-crm";
import { moveProjectFilesAction } from "@/server/actions/workspace-attachments";
import type { getProjectFiles } from "@/server/services/projects";
import { AttachmentUpload } from "./attachment-upload";
import { FormError } from "./feedback";
import { Pagination } from "./pagination";
import { type MoveFile, ProjectFileDialog, type ProjectFileOperation } from "./project-file-dialog";

type Data = NonNullable<Awaited<ReturnType<typeof getProjectFiles>>>;
type ProjectFile = Data["files"]["items"][number];
type ProjectFolder = Data["folders"][number];
type Layout = "grid" | "list";
const fileDragType = "application/x-brasilia-project-files";

export function ProjectFiles({
  projectId,
  folder,
  folders,
  files,
  layout,
  search,
  storageConfigured,
}: {
  projectId: string;
  folder: Data["folder"];
  folders: Data["folders"];
  files: Data["files"];
  layout: Layout;
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
  const dragFiles = useRef<MoveFile[]>([]);
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

  function href(
    target: string | null,
    q = "",
    page = 1,
    size = pagination.pageSize,
    nextLayout = layout,
  ) {
    const params = new URLSearchParams();
    if (target) params.set("folder", target);
    if (q) params.set("q", q);
    if (page !== 1) params.set("page", String(page));
    if (size !== 20) params.set("size", String(size));
    if (nextLayout === "list") params.set("view", "list");
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
    const dragged = dragFiles.current;
    if (!dragged.length || !event.dataTransfer.types.includes(fileDragType)) return;
    event.preventDefault();
    setDropTarget(null);
    dragFiles.current = [];
    if (pending || dragged.every((entry) => entry.folderId === target)) return;
    setError("");
    setNotice(null);
    startTransition(async () => {
      try {
        const result = await moveProjectFilesAction({
          projectId,
          folderId: target,
          files: dragged.map((entry) => ({
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
          !dragFiles.current.some((file) => file.folderId !== target)
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

  function folderLink(entry: ProjectFolder) {
    return (
      <Link
        href={href(entry.id)}
        prefetch={false}
        className="project-file-name"
        {...folderDrop(entry.id)}
      >
        <Folder size={layout === "grid" ? 24 : 19} aria-hidden="true" />
        <span>{entry.name}</span>
        {layout === "list" && <ChevronRight size={15} aria-hidden="true" />}
      </Link>
    );
  }

  function renameFolder(entry: ProjectFolder) {
    return (
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
    );
  }

  function selectAllFiles() {
    return (
      <input
        type="checkbox"
        id={`${id}-select-all`}
        aria-label="Selecionar arquivos desta página"
        disabled={!items.length || pending}
        checked={items.length > 0 && picked.length === items.length}
        ref={(element) => {
          if (element) element.indeterminate = picked.length > 0 && picked.length < items.length;
        }}
        onChange={(event) =>
          setSelection({ view, ids: event.target.checked ? items.map((file) => file.id) : [] })
        }
      />
    );
  }

  function fileCheckbox(file: ProjectFile) {
    return (
      <input
        type="checkbox"
        aria-label={`Selecionar ${file.name}`}
        checked={selected.has(file.id)}
        disabled={pending}
        onChange={(event) => selectFile(file.id, event.target.checked)}
      />
    );
  }

  function fileName(file: ProjectFile) {
    const mime = attachmentMime(file.name, "");
    let Icon = FileText;
    if (layout === "grid") {
      if (mime?.startsWith("image/")) Icon = FileImage;
      else if (mime && /spreadsheet|excel|csv/.test(mime)) Icon = FileSpreadsheet;
    }
    return (
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
          dragFiles.current = selected.has(file.id) ? picked : [file];
        }}
        onDragEnd={() => {
          dragFiles.current = [];
          setDropTarget(null);
        }}
      >
        <Icon size={layout === "grid" ? 30 : 18} aria-hidden="true" />
        <span>
          {file.name}
          <small>{fileSizeLabel(file.size)}</small>
        </span>
      </button>
    );
  }

  function locationLink(target: string | null) {
    return (
      <Link className="project-file-location" href={href(target)} prefetch={false}>
        {projectFilePath(folderIndex, target)
          .map((part) => part.name)
          .join(" / ") || "Raiz do projeto"}
      </Link>
    );
  }

  function fileActions(file: ProjectFile) {
    return (
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
    );
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
            <nav className="project-file-views" aria-label="Visualização de arquivos">
              <Link
                href={href(folderId, search, pagination.page, pagination.pageSize, "grid")}
                scroll={false}
                aria-current={layout === "grid" ? "true" : undefined}
              >
                <LayoutGrid size={15} aria-hidden="true" /> Cards
              </Link>
              <Link
                href={href(folderId, search, pagination.page, pagination.pageSize, "list")}
                scroll={false}
                aria-current={layout === "list" ? "true" : undefined}
              >
                <List size={16} aria-hidden="true" /> Lista
              </Link>
            </nav>
          </div>
          {layout === "grid" ? (
            <div className="project-file-grid">
              {currentFolders.length > 0 && (
                <section aria-labelledby={`${id}-folders`}>
                  <h3 id={`${id}-folders`}>Pastas</h3>
                  <ul className="project-file-card-list">
                    {currentFolders.map((entry) => (
                      <li key={entry.id} className="project-folder-card">
                        <div className="project-folder-card-main">
                          {folderLink(entry)}
                          {search && locationLink(entry.parentId)}
                        </div>
                        {renameFolder(entry)}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {items.length > 0 && (
                <section aria-labelledby={`${id}-files`}>
                  <div className="project-file-grid-heading">
                    <h3 id={`${id}-files`}>Arquivos</h3>
                    <label htmlFor={`${id}-select-all`}>
                      {selectAllFiles()}
                      Selecionar nesta página
                    </label>
                  </div>
                  <ul className="project-file-card-list">
                    {items.map((file) => (
                      <li
                        key={file.id}
                        className="project-file-card"
                        data-selected={selected.has(file.id)}
                      >
                        <div className="project-file-card-bar">
                          {fileCheckbox(file)}
                          {fileActions(file)}
                        </div>
                        {fileName(file)}
                        {search && locationLink(file.folderId)}
                        <div className="project-file-card-meta" title={file.taskTitle ?? "Projeto"}>
                          <span>{file.taskTitle ?? "Projeto"}</span>
                          <time dateTime={new Date(file.createdAt).toISOString()}>
                            {timestampLabel(file.createdAt)}
                          </time>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          ) : (
            <table className="project-file-table">
              <thead>
                <tr>
                  <th scope="col">{selectAllFiles()}</th>
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
                    <td>{folderLink(entry)}</td>
                    <td className="project-file-meta">
                      {search
                        ? (folderIndex.get(entry.parentId ?? "")?.name ?? "Raiz do projeto")
                        : "Pasta"}
                    </td>
                    <td className="project-file-meta" />
                    <td>{renameFolder(entry)}</td>
                  </tr>
                ))}
                {items.map((file) => (
                  <tr key={file.id} data-selected={selected.has(file.id)}>
                    <td>{fileCheckbox(file)}</td>
                    <td>
                      {fileName(file)}
                      {search && locationLink(file.folderId)}
                    </td>
                    <td className="project-file-meta">{file.taskTitle ?? "Projeto"}</td>
                    <td className="project-file-meta">{timestampLabel(file.createdAt)}</td>
                    <td>{fileActions(file)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
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
