"use client";

import { ChevronRight, Folder, FolderPlus } from "lucide-react";
import { useId, useState, useTransition } from "react";
import { type ProjectFileFolder, projectFilePath } from "@/libs/project-file-path";
import {
  createProjectFileFolderAction,
  moveProjectFilesAction,
  renameProjectFileFolderAction,
} from "@/server/actions/workspace-attachments";
import { Dialog } from "./dialog";
import { FormError, SubmitButton } from "./feedback";

export type MoveFile = { id: string; name: string; folderId: string | null };
export type ProjectFileOperation =
  | { kind: "create"; parentId: string | null }
  | { kind: "rename"; folder: ProjectFileFolder }
  | { kind: "move"; files: MoveFile[]; initialFolderId: string | null };

export function ProjectFileDialog({
  projectId,
  operation,
  folders,
  onClose,
  onCreated,
  onSaved,
}: {
  projectId: string;
  operation: ProjectFileOperation;
  folders: ProjectFileFolder[];
  onClose: () => void;
  onCreated: (parentId: string | null) => void;
  onSaved: (message: string, destination?: string | null) => void;
}) {
  const fieldId = useId();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState(
    operation.kind === "move" ? operation.initialFolderId : null,
  );
  const [creatingDestination, setCreatingDestination] = useState(false);
  const [addedFolder, setAddedFolder] = useState<ProjectFileFolder | null>(null);
  const folderIndex = new Map(folders.map((folder) => [folder.id, folder]));
  if (addedFolder && !folderIndex.has(addedFolder.id)) folderIndex.set(addedFolder.id, addedFolder);
  const path = projectFilePath(folderIndex, destination);
  const subfolders = folders.filter((folder) => folder.parentId === destination);
  const moving = operation.kind === "move" && !creatingDestination;
  const sameLocation =
    operation.kind === "move" && operation.files.every((file) => file.folderId === destination);
  const title =
    operation.kind === "rename"
      ? "Renomear pasta"
      : operation.kind === "move"
        ? "Mover arquivos"
        : "Nova pasta";

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    setError("");
    startTransition(async () => {
      try {
        if (operation.kind === "create" || creatingDestination) {
          const parentId = operation.kind === "create" ? operation.parentId : destination;
          const result = await createProjectFileFolderAction({ projectId, parentId, name });
          if (!result.success) return setError(result.error);
          if (operation.kind === "create") return onCreated(parentId);
          setAddedFolder({ id: result.data.folderId, name, parentId });
          setDestination(result.data.folderId);
          setCreatingDestination(false);
        } else if (operation.kind === "rename") {
          const result = await renameProjectFileFolderAction({
            projectId,
            name,
            folderId: operation.folder.id,
            previousName: operation.folder.name,
          });
          if (!result.success) return setError(result.error);
          onSaved("Pasta renomeada.");
        } else {
          const result = await moveProjectFilesAction({
            projectId,
            folderId: destination,
            files: operation.files.map((file) => ({
              attachmentId: file.id,
              sourceFolderId: file.folderId,
            })),
          });
          if (!result.success) return setError(result.error);
          const count = result.data.count;
          onSaved(count === 1 ? "Arquivo movido." : `${count} arquivos movidos.`, destination);
        }
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  function navigate(folderId: string | null) {
    setDestination(folderId);
    setError("");
    requestAnimationFrame(() => document.getElementById(`${fieldId}-destination`)?.focus());
  }

  return (
    <Dialog
      title={title}
      variant="modal"
      initialFocus={
        operation.kind === "move" ? ".project-picker-path button" : 'input[name="name"]'
      }
      onClose={() => {
        if (!pending) onClose();
      }}
    >
      <form className="person-form project-file-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          {operation.kind === "move" && (
            <>
              <p className="project-file-target">
                {operation.files.length === 1
                  ? operation.files[0].name
                  : `${operation.files.length} arquivos selecionados`}
              </p>
              <nav className="project-picker-path" aria-label="Caminho de destino">
                <button
                  type="button"
                  id={destination === null ? `${fieldId}-destination` : undefined}
                  aria-current={destination === null ? "location" : undefined}
                  onClick={() => navigate(null)}
                >
                  Arquivos do projeto
                </button>
                {path.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    id={folder.id === destination ? `${fieldId}-destination` : undefined}
                    aria-current={folder.id === destination ? "location" : undefined}
                    onClick={() => navigate(folder.id)}
                  >
                    <ChevronRight size={14} aria-hidden="true" />
                    {folder.name}
                  </button>
                ))}
              </nav>
            </>
          )}
          {moving ? (
            <div className="project-picker">
              {subfolders.length ? (
                <ul aria-label="Pastas de destino">
                  {subfolders.map((folder) => (
                    <li key={folder.id}>
                      <button type="button" onClick={() => navigate(folder.id)}>
                        <Folder size={18} aria-hidden="true" />
                        <span>{folder.name}</span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Nenhuma subpasta neste local.</p>
              )}
            </div>
          ) : (
            <label className="field" htmlFor={fieldId}>
              <span>Nome da pasta</span>
              <input
                id={fieldId}
                name="name"
                autoComplete="off"
                maxLength={80}
                defaultValue={operation.kind === "rename" ? operation.folder.name : ""}
                required
              />
            </label>
          )}
        </fieldset>
        <FormError message={error} />
        <footer className="modal-footer project-picker-footer">
          {moving && (
            <button
              className="button secondary"
              type="button"
              disabled={pending}
              onClick={() => {
                setCreatingDestination(true);
                setError("");
                requestAnimationFrame(() => document.getElementById(fieldId)?.focus());
              }}
            >
              <FolderPlus size={16} aria-hidden="true" /> Nova pasta
            </button>
          )}
          <button
            className="button secondary"
            type="button"
            disabled={pending}
            onClick={() => {
              if (creatingDestination) {
                setCreatingDestination(false);
                setError("");
              } else onClose();
            }}
          >
            Cancelar
          </button>
          <SubmitButton pending={pending} disabled={moving && sameLocation}>
            {moving ? "Mover para cá" : operation.kind === "rename" ? "Salvar nome" : "Criar pasta"}
          </SubmitButton>
        </footer>
      </form>
    </Dialog>
  );
}
