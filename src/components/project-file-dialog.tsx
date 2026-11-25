"use client";
import { useId, useState, useTransition } from "react";
import {
  createProjectFileFolderAction,
  moveProjectFileAction,
} from "@/server/actions/workspace-attachments";
import { Dialog } from "./dialog";
import { FormError, SubmitButton } from "./feedback";

export type ProjectFileOperation =
  | { kind: "create" }
  | { kind: "move"; file: { id: string; name: string } };

export function ProjectFileDialog({
  projectId,
  operation,
  folders,
  sourceFolderId,
  onClose,
  onCreated,
  onMoved,
}: {
  projectId: string;
  operation: ProjectFileOperation;
  folders: { id: string; name: string }[];
  sourceFolderId: string | null;
  onClose: () => void;
  onCreated: (folderId: string) => void;
  onMoved: () => void;
}) {
  const fieldId = useId();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const creating = operation.kind === "create";
  function close() {
    if (!pending) onClose();
  }
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        if (operation.kind === "create") {
          const result = await createProjectFileFolderAction({ projectId, name: form.get("name") });
          if (result.success) onCreated(result.data.folderId);
          else setError(result.error);
          return;
        }
        const folder = form.get("folder");
        const result = await moveProjectFileAction({
          projectId,
          attachmentId: operation.file.id,
          sourceFolderId,
          folderId: folder === "root" ? null : folder,
        });
        if (result.success) onMoved();
        else setError(result.error);
      } catch {
        setError("Não foi possível salvar. Tente novamente.");
      }
    });
  }

  return (
    <Dialog
      title={creating ? "Nova pasta" : "Mover arquivo"}
      onClose={close}
      variant="modal"
      initialFocus={creating ? "input" : "select"}
    >
      <form className="person-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          {operation.kind === "move" && (
            <p className="project-file-target">{operation.file.name}</p>
          )}
          <label className="field" htmlFor={fieldId}>
            <span>{creating ? "Nome da pasta" : "Destino"}</span>
            {creating ? (
              <input
                id={fieldId}
                name="name"
                type="text"
                autoComplete="off"
                maxLength={80}
                required
              />
            ) : (
              <div className="select-wrap">
                <select id={fieldId} name="folder" defaultValue="" required>
                  <option value="" disabled>
                    Escolha uma pasta
                  </option>
                  {sourceFolderId !== null && (
                    <option value="root">Arquivos do projeto (raiz)</option>
                  )}
                  {folders
                    .filter((folder) => folder.id !== sourceFolderId)
                    .map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                </select>
              </div>
            )}
          </label>
        </fieldset>
        <FormError message={error} />
        <footer className="modal-footer">
          <button className="button secondary" type="button" onClick={close} disabled={pending}>
            Cancelar
          </button>
          <SubmitButton pending={pending}>
            {creating ? "Criar pasta" : "Mover arquivo"}
          </SubmitButton>
        </footer>
      </form>
    </Dialog>
  );
}
