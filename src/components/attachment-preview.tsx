"use client";

import { Download, Eye } from "lucide-react";
import dynamic from "next/dynamic";
import { type ReactNode, useEffect, useState } from "react";
import { attachmentMime, attachmentPreviewKind, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";
import { downloadProspectAttachmentAction } from "@/server/actions/prospect-crm";
import { downloadWorkspaceAttachmentAction } from "@/server/actions/workspace-attachments";
import type { AttachmentScope } from "@/types/domain";
import { Dialog } from "./dialog";

const PdfPreview = dynamic(() => import("./pdf-preview").then((module) => module.PdfPreview), {
  ssr: false,
  loading: () => (
    <p className="attachment-preview-status" role="status">
      Carregando PDF…
    </p>
  ),
});

type Scope = AttachmentScope | { kind: "prospect"; id: string; projectId: string };
type PreviewFile = { id: string; name: string };
type Preview = { blob: Blob; url: string; name: string; kind: "image" | "pdf" };

export function canPreviewAttachment(file: PreviewFile) {
  return attachmentPreviewKind(attachmentMime(file.name, "")) !== null;
}

export function AttachmentPreviewButton({
  file,
  scope,
  disabled,
  className = "icon-button",
  children,
}: {
  file: PreviewFile;
  scope: Scope;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (!canPreviewAttachment(file)) return null;
  return (
    <>
      <button
        type="button"
        className={className}
        title="Visualizar arquivo"
        aria-label={`Visualizar ${file.name}`}
        aria-haspopup="dialog"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        {children ?? <Eye size={17} aria-hidden="true" />}
      </button>
      {open && <AttachmentPreview file={file} scope={scope} onClose={() => setOpen(false)} />}
    </>
  );
}

function AttachmentPreview({
  file,
  scope,
  onClose,
}: {
  file: PreviewFile;
  scope: Scope;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const { kind, id } = scope;
  const projectId = scope.kind === "prospect" ? scope.projectId : "";
  const attachmentId = file.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Retrying requests a fresh signed URL.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let objectUrl: string | undefined;

    async function load() {
      try {
        const result =
          kind === "prospect"
            ? await downloadProspectAttachmentAction({ projectId, prospectId: id, attachmentId })
            : await downloadWorkspaceAttachmentAction({ scope: { kind, id }, attachmentId });
        if (signal.aborted) return;
        if (!result.success) return setError(result.error);
        const { name, contentType, url } = result.data;
        const previewKind = attachmentPreviewKind(contentType);
        if (!previewKind) return setError("Este formato está disponível para download.");
        const response = await fetch(url, {
          credentials: "omit",
          referrerPolicy: "no-referrer",
          cache: "no-store",
          signal,
        });
        if (!response.ok) throw new Error("File request failed");
        const data = await response.blob();
        if (signal.aborted) return;
        if (!data.size || data.size > MAX_ATTACHMENT_BYTES) throw new Error("Invalid file size");
        const blob = new Blob([data], { type: contentType });
        objectUrl = URL.createObjectURL(blob);
        setPreview({ blob, url: objectUrl, name, kind: previewKind });
      } catch {
        if (!signal.aborted) setError("Não foi possível carregar o arquivo.");
      }
    }

    void load();
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [kind, id, projectId, attachmentId, attempt]);

  return (
    <Dialog
      title={file.name}
      eyebrow="Visualização de arquivo"
      variant="modal"
      panelClassName="attachment-preview-panel"
      initialFocus=".dialog-header button"
      onClose={onClose}
    >
      <div className="attachment-preview-body">
        {error ? (
          <div className="attachment-preview-status">
            <p role="alert">{error}</p>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setError("");
                setPreview(null);
                setAttempt((previous) => previous + 1);
              }}
            >
              Tentar novamente
            </button>
          </div>
        ) : preview?.kind === "image" ? (
          <div className="attachment-preview-image">
            <img
              src={preview.url}
              alt={preview.name}
              onError={() => setError("Não foi possível exibir a imagem.")}
            />
          </div>
        ) : preview?.kind === "pdf" ? (
          <PdfPreview blob={preview.blob} />
        ) : (
          <p className="attachment-preview-status" role="status">
            Carregando arquivo…
          </p>
        )}
      </div>
      {preview && (
        <footer className="attachment-preview-footer">
          <a className="button secondary" href={preview.url} download={preview.name}>
            <Download size={16} aria-hidden="true" /> Baixar arquivo
          </a>
        </footer>
      )}
    </Dialog>
  );
}
