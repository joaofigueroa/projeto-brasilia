"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { connectResearchAiAction } from "@/server/actions/commercial-research";
import { Dialog } from "./dialog";
import { FormError } from "./feedback";
export type ResearchAiStatus = {
  configured: boolean;
  provider: "gemini" | "gateway" | null;
  model: string | null;
  version: number;
};
export function ResearchAiConnection({
  projectId,
  status,
  onSaved,
  onClose,
}: {
  projectId: string;
  status: ResearchAiStatus;
  onSaved: (status: ResearchAiStatus) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setPending(true);
    try {
      const result = await connectResearchAiAction({
        projectId,
        version: status.version,
        apiKey: String(form.get("apiKey") ?? ""),
        model: String(form.get("model") ?? ""),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved(result.data);
      router.refresh();
      onClose();
    } catch {
      setError("Não foi possível conectar agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog title="Conectar IA" eyebrow="Análise comercial" variant="modal" onClose={onClose}>
      <form onSubmit={save} className="research-ai-form">
        <div className="bi-dialog-body">
          <p>
            Use uma chave do Gemini de um projeto no plano gratuito, sem faturamento. O Google
            aplica cotas; ao esgotá-las, a geração fica indisponível até a renovação.
          </p>
          <a
            className="research-source"
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
          >
            Criar ou consultar chave no Google AI Studio ↗
          </a>
          <p>
            As análises usam os cadastros e fontes públicas do projeto. A chave é protegida no
            servidor e não é exibida após salvar.
          </p>
          <label className="field">
            <span>Chave da API Gemini</span>
            <input
              name="apiKey"
              type="password"
              autoComplete="off"
              required
              minLength={20}
              maxLength={500}
              placeholder={
                status.configured ? "Informe uma nova chave para substituir" : "Cole a chave aqui"
              }
            />
          </label>
          <label className="field">
            <span>Modelo</span>
            <select
              name="model"
              defaultValue={
                status.provider === "gemini"
                  ? (status.model ?? "gemini-3.8-flash")
                  : "gemini-3.8-flash"
              }
            >
              <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
              <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash-Lite</option>
            </select>
          </label>
          <p className="research-footnote">
            A disponibilidade no plano gratuito depende da conta e da região.{" "}
            <a
              href="https://ai.google.dev/gemini-api/docs/pricing"
              target="_blank"
              rel="noreferrer"
            >
              Consultar condições e cotas do Google.
            </a>
          </p>
          <FormError message={error} />
        </div>
        <footer className="dialog-footer">
          <button type="button" className="button secondary" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button className="button primary" type="submit" disabled={pending}>
            {pending ? "Verificando…" : "Conectar"}
          </button>
        </footer>
      </form>
    </Dialog>
  );
}
