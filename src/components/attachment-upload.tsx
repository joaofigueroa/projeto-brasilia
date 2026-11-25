"use client";
import { Paperclip } from "lucide-react";
import { useRef } from "react";
import { attachmentAccept } from "@/libs/prospect-crm";

export function AttachmentUpload({
  enabled,
  storageConfigured,
  up,
}: {
  enabled: boolean;
  storageConfigured: boolean;
  up: {
    upload: (files: File[]) => void;
    pending: boolean;
    progress: { name: string; percent: number; current: number; total: number } | null;
    errors: string[];
    notice: string;
  };
}) {
  const input = useRef<HTMLInputElement>(null);
  const { progress } = up;
  return (
    <div className="workspace-attachment-upload">
      {enabled && (
        <>
          <div className="workspace-attachment-controls">
            <button
              className="button secondary"
              type="button"
              disabled={!storageConfigured || up.pending}
              onClick={() => input.current?.click()}
            >
              <Paperclip size={15} />
              Anexar arquivos
            </button>
            <span>
              {storageConfigured
                ? "Documentos e imagens · até 20 MB por arquivo"
                : "Envio de arquivos indisponível."}
            </span>
          </div>
          <input
            ref={input}
            type="file"
            multiple
            accept={attachmentAccept}
            hidden
            aria-label="Selecionar arquivos de até 20 MB"
            disabled={!storageConfigured || up.pending}
            onChange={(event) => {
              const files = Array.from(event.target.files ?? []);
              event.target.value = "";
              up.upload(files);
            }}
          />
        </>
      )}
      {progress && (
        <div className="crm-upload-progress" role="status">
          <span>
            {progress.current}/{progress.total} · {progress.name} ·{" "}
            {progress.percent === 100 ? "Confirmando…" : `${progress.percent}%`}
          </span>
          <progress max={100} value={progress.percent} aria-label="Progresso do envio" />
        </div>
      )}
      {up.notice && (
        <p role="status" className="workspace-attachment-success">
          {up.notice}
        </p>
      )}
      {up.errors.length > 0 && (
        <ul className="workspace-attachment-errors" role="alert">
          {[...new Set(up.errors)].map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
