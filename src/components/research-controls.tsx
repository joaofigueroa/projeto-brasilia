"use client";
import { LoaderCircle, Pause, RefreshCw, ScanText, Settings2 } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useResearchActions } from "@/hooks/use-research-actions";
import type { IntelligenceData } from "@/types/intelligence";
import { ResearchAiConnection } from "./research-ai-connection";
export function ResearchControls({ data }: { data: IntelligenceData }) {
  const cityCode = data.territory.city ?? (data.territory.uf === "DF" ? "5300108" : null);
  const allowedCity = cityCode === "5300108" || cityCode === "5208707" ? cityCode : null;
  const initial = data.research?.live?.runs.find(
    (run) => run.kind === "census" && run.cityCode === allowedCity,
  );
  const [configuring, setConfiguring] = useState(false);
  const [connection, setConnection] = useState(
    data.research?.live?.ai ?? { configured: false, provider: null, model: null, version: 0 },
  );
  const actions = useResearchActions(data.project.id, allowedCity, initial);
  const run = actions.run;
  const pending = actions.working || actions.generating;
  return (
    <div className="research-controls">
      <div>
        <div>
          <span className="section-caption">Atualização por cidade</span>
          <strong>
            {allowedCity === "5300108"
              ? "Brasília"
              : allowedCity === "5208707"
                ? "Goiânia"
                : "Selecione Brasília ou Goiânia no mapa"}
          </strong>
        </div>
        {data.viewer.role === "admin" && (
          <div className="research-control-buttons">
            {actions.working ? (
              <button className="button secondary" type="button" onClick={actions.pause}>
                <Pause size={14} />
                Pausar
              </button>
            ) : (
              <button
                className="button secondary"
                type="button"
                disabled={!allowedCity || pending}
                onClick={actions.update}
              >
                <RefreshCw size={14} />
                {run && ["pending", "running"].includes(run.status)
                  ? "Retomar cadastro"
                  : "Atualizar cadastro"}
              </button>
            )}
            <button
              className="button primary"
              type="button"
              disabled={!allowedCity || pending}
              onClick={connection.configured ? actions.generate : () => setConfiguring(true)}
            >
              {actions.generating ? (
                <LoaderCircle className="spinner" size={14} />
              ) : (
                <ScanText size={14} />
              )}
              {actions.generating
                ? "Gerando análise…"
                : connection.configured
                  ? "Gerar nova análise"
                  : "Conectar IA"}
            </button>
            {connection.configured && (
              <button
                className="icon-button"
                type="button"
                aria-label="Configurar conexão de IA"
                disabled={pending}
                onClick={() => setConfiguring(true)}
              >
                <Settings2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>
      <details className="research-control-help">
        <summary>Como funciona a atualização</summary>
        <p>
          Cadastro: estabelecimentos ativos, com atividades automotivas principais ou secundárias. A
          especialização e a atuação em linha leve precisam de confirmação quando não há fonte
          comercial.
        </p>
        <p>
          A análise usa os créditos disponíveis do provedor de IA. Quando indisponíveis, a versão
          anterior é preservada.
        </p>
      </details>
      {run && (
        <div className="research-run-status">
          <span>
            {run.sourceMonth ? `Base ${run.sourceMonth} · ` : ""}
            {run.status === "completed"
              ? "Consulta cadastral concluída"
              : actions.working
                ? "Consultando cadastro"
                : "Atualização com progresso salvo"}
          </span>
          <span>
            {run.cursor.toLocaleString("pt-BR")}
            {run.total !== null ? ` / ${run.total.toLocaleString("pt-BR")}` : ""}
          </span>
          {run.total !== null && (
            <progress
              aria-label="Progresso da atualização cadastral"
              max={Math.max(1, run.total)}
              value={run.cursor}
            />
          )}
        </div>
      )}
      {actions.error && (
        <p className="form-error" role="alert">
          {actions.error}
        </p>
      )}
      {actions.notice && (
        <p role="status" className="research-action-notice">
          {actions.notice}
        </p>
      )}
      {data.viewer.role !== "admin" && (
        <small>Administradores podem atualizar o cadastro e gerar análises.</small>
      )}
      <AnimatePresence>
        {configuring && (
          <ResearchAiConnection
            projectId={data.project.id}
            status={connection}
            onSaved={setConnection}
            onClose={() => setConfiguring(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
