"use client";
import {
  ChevronDown,
  CircleHelp,
  Download,
  FileText,
  History,
  MessageSquare,
  Paperclip,
  Send,
} from "lucide-react";
import { useId, useRef } from "react";
import { useProspectFollowup } from "@/hooks/use-prospect-followup";
import { timestampLabel } from "@/libs/presentation";
import {
  attachmentAccept,
  type CrmStage,
  crmStageDescriptions,
  crmStageLabels,
  crmStages,
  fileSizeLabel,
} from "@/libs/prospect-crm";
import type { ProspectCrm } from "@/types/prospect-crm";
import { AttachmentPreviewButton } from "./attachment-preview";
import { FormError } from "./feedback";
import { HistoryTimeline } from "./history-timeline";

const eventLabels = {
  created: "iniciou o acompanhamento",
  stage_changed: "alterou a etapa comercial",
  comment: "adicionou um comentário",
  attachment_added: "anexou um arquivo",
};
export function ProspectFollowup({
  projectId,
  prospectId,
  data,
}: {
  projectId: string;
  prospectId: string;
  data: ProspectCrm;
}) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const crm = useProspectFollowup(projectId, prospectId, data);
  return (
    <div className="prospect-crm">
      <header className="crm-stage-header">
        <div>
          <span className="section-caption">Acompanhamento comercial</span>
          <h2>Etapa atual</h2>
          <p>{crmStageDescriptions[data.stage]}</p>
        </div>
        <label className="crm-stage-picker" htmlFor={`${id}-stage`}>
          <span className="sr-only">Etapa comercial do cliente</span>
          <select
            id={`${id}-stage`}
            className="crm-stage-select"
            value={data.stage}
            disabled={!data.canManage || crm.pending}
            onChange={(event) => crm.changeStage(event.target.value as CrmStage)}
          >
            {crmStages.map((stage) => (
              <option key={stage} value={stage}>
                {crmStageLabels[stage]}
              </option>
            ))}
          </select>
          <ChevronDown size={16} aria-hidden="true" />
        </label>
      </header>
      {!data.canManage && (
        <p className="crm-favorite-hint">
          Favorite este cliente para alterar a etapa, comentar e anexar arquivos.
        </p>
      )}
      <FormError message={crm.error} />
      <div className="crm-workspace">
        <div className="crm-notes-column">
          <section className="crm-comment-section" aria-labelledby={`${id}-comment-title`}>
            <div className="crm-section-heading">
              <MessageSquare size={18} />
              <h3 id={`${id}-comment-title`}>Registrar comentário</h3>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                crm.comment();
              }}
            >
              <label htmlFor={`${id}-body`} className="sr-only">
                Comentário sobre o cliente
              </label>
              <textarea
                id={`${id}-body`}
                value={crm.body}
                onChange={(event) => crm.setBody(event.target.value)}
                maxLength={10000}
                rows={5}
                disabled={!data.canManage || crm.pending}
                placeholder="Registre contatos, próximos passos ou observações sobre o cliente."
                required
              />
              <div className="crm-composer-footer">
                <span>Visível para a equipe do projeto.</span>
                <button
                  className="button primary"
                  type="submit"
                  disabled={!data.canManage || crm.pending || !crm.body.trim()}
                >
                  <Send size={14} />
                  {crm.pending ? "Salvando…" : "Comentar"}
                </button>
              </div>
            </form>
          </section>
          <section className="crm-attachments-section" aria-labelledby={`${id}-attachments-title`}>
            <div className="crm-files-heading">
              <div className="crm-section-heading">
                <Paperclip size={18} />
                <h3 id={`${id}-attachments-title`}>Arquivos do cliente</h3>
              </div>
              <button
                className="button secondary"
                type="button"
                disabled={!data.canManage || !data.storageConfigured || crm.pending}
                onClick={() => fileInput.current?.click()}
              >
                <Paperclip size={14} />
                Anexar
              </button>
            </div>
            <input
              ref={fileInput}
              type="file"
              accept={attachmentAccept}
              hidden
              aria-label="Selecionar arquivo de até 20 MB"
              disabled={!data.canManage || !data.storageConfigured || crm.pending}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) crm.upload(file);
              }}
            />
            <p>Documentos e imagens · até 20 MB por arquivo.</p>
            {!data.storageConfigured && <p>O envio de arquivos ainda não está habilitado.</p>}
            {crm.uploadProgress && (
              <div className="crm-upload-progress" role="status">
                <span>
                  {crm.uploadProgress.name} ·{" "}
                  {crm.uploadProgress.percent === 100
                    ? "Confirmando arquivo…"
                    : `${crm.uploadProgress.percent}%`}
                </span>
                <progress
                  max={100}
                  value={crm.uploadProgress.percent}
                  aria-label="Progresso do envio"
                />
              </div>
            )}
            <ul className="crm-file-list">
              {crm.attachments.items.map((file) => (
                <li key={file.id}>
                  <FileText size={20} aria-hidden="true" />
                  <div>
                    <strong>{file.name}</strong>
                    <small>
                      {fileSizeLabel(file.size)} · {file.uploadedBy}
                      <br />
                      {timestampLabel(file.createdAt)}
                    </small>
                  </div>
                  <AttachmentPreviewButton
                    file={file}
                    scope={{ kind: "prospect", id: prospectId, projectId }}
                    disabled={crm.pending}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Baixar ${file.name}`}
                    disabled={crm.pending}
                    onClick={() => crm.download(file.id)}
                  >
                    <Download size={17} />
                  </button>
                </li>
              ))}
            </ul>
            {crm.attachments.total === 0 && (
              <div className="crm-attachments-empty">Nenhum arquivo anexado.</div>
            )}
            {crm.attachments.pages > 1 && (
              <nav className="crm-file-pagination" aria-label="Paginação de arquivos">
                <button
                  type="button"
                  className="text-button"
                  disabled={crm.pending || crm.attachments.page === 1}
                  onClick={() => crm.attachmentPage(crm.attachments.page - 1)}
                >
                  Anterior
                </button>
                <span>
                  {crm.attachments.page} de {crm.attachments.pages}
                </span>
                <button
                  type="button"
                  className="text-button"
                  disabled={crm.pending || crm.attachments.page === crm.attachments.pages}
                  onClick={() => crm.attachmentPage(crm.attachments.page + 1)}
                >
                  Próxima
                </button>
              </nav>
            )}
          </section>
        </div>
        <section className="crm-history-column" aria-labelledby={`${id}-history-title`}>
          <div className="history-intro">
            <History size={20} />
            <div>
              <h3 id={`${id}-history-title`}>Histórico do cliente</h3>
              <p>Comentários, arquivos e mudanças de etapa.</p>
            </div>
          </div>
          <HistoryTimeline
            fieldLabels={{ stage: "Etapa comercial" }}
            entries={crm.history.entries.map((entry) => ({
              ...entry,
              label: eventLabels[entry.kind],
            }))}
          />
          {!crm.history.entries.length && (
            <p className="crm-history-empty">O acompanhamento começa ao favoritar o cliente.</p>
          )}
          {crm.history.nextCursor && (
            <button
              type="button"
              className="button secondary"
              disabled={crm.pending}
              onClick={crm.loadHistory}
            >
              {crm.pending ? "Carregando…" : "Carregar eventos anteriores"}
            </button>
          )}
          <p className="history-footnote">
            <CircleHelp size={15} />O histórico é preservado e não pode ser editado.
          </p>
        </section>
      </div>
    </div>
  );
}
