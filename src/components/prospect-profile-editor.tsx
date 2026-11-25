"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { wineProjectId } from "@/libs/commercial-research";
import { updateResearchedProfileAction } from "@/server/actions/commercial-research";
import type { ResearchProspect } from "@/types/commercial-research";
import { FormError } from "./feedback";
export function ProspectProfileEditor({
  prospect,
  projectId,
  onSaved,
  onCancel,
}: {
  prospect: ResearchProspect;
  projectId: string;
  onSaved: (profile: ResearchProspect) => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const wine = projectId === wineProjectId;
  const name = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    name.current?.focus();
  }, []);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prospect.databaseId) return;
    const form = new FormData(event.currentTarget);
    const text = (key: string) => String(form.get(key) ?? "");
    setError("");
    setPending(true);
    try {
      const result = await updateResearchedProfileAction({
        projectId,
        prospectId: prospect.databaseId,
        revision: prospect.revision,
        name: text("name"),
        summary: text("summary"),
        specialization: wine ? prospect.specialization : text("specialization"),
        brands: wine
          ? prospect.brands
          : text("brands")
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
        website: text("website"),
        phone: text("phone"),
        foundationYear: text("foundationYear") ? Number(text("foundationYear")) : null,
        sourceName: text("sourceName"),
        sourceUrl: text("sourceUrl"),
        sourceKind: text("sourceKind"),
        notes: text("notes"),
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onSaved(result.data);
        router.refresh();
      }
    } catch {
      setError("Não foi possível salvar o perfil agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="prospect-profile-editor" onSubmit={save}>
      <div className="research-profile bi-dialog-body">
        <p className="research-footnote">
          Atualize os dados comerciais com uma fonte. O cadastro de CNPJ continua vinculado à base
          consultada.
        </p>
        <label className="field">
          <span>Nome comercial</span>
          <input
            name="name"
            ref={name}
            required
            minLength={2}
            maxLength={180}
            defaultValue={prospect.name}
          />
        </label>
        <label className="field">
          <span>Descrição</span>
          <textarea
            name="summary"
            required
            minLength={2}
            maxLength={3000}
            rows={3}
            defaultValue={prospect.summary}
          />
        </label>
        {!wine && (
          <>
            <label className="field">
              <span>Perfil de atendimento</span>
              <select name="specialization" defaultValue={prospect.specialization}>
                <option value="unconfirmed">A confirmar</option>
                <option value="multibrand">Multimarcas</option>
                <option value="specialist">Especializada</option>
              </select>
            </label>
            <label className="field">
              <span>Montadoras atendidas (separadas por vírgula)</span>
              <input name="brands" maxLength={1000} defaultValue={prospect.brands.join(", ")} />
            </label>
          </>
        )}
        <div className="form-grid two">
          <label className="field">
            <span>Fundação declarada da marca</span>
            <input
              name="foundationYear"
              type="number"
              min={1800}
              max={new Date().getFullYear()}
              placeholder="Não confirmada"
              defaultValue={prospect.foundation?.year ?? ""}
            />
          </label>
          <label className="field">
            <span>Telefone comercial</span>
            <input name="phone" maxLength={80} defaultValue={prospect.phone} />
          </label>
        </div>
        <label className="field">
          <span>Site da empresa</span>
          <input
            name="website"
            type="url"
            maxLength={2000}
            defaultValue={prospect.website}
            placeholder="https://…"
          />
        </label>
        <h3>Fonte dos dados comerciais</h3>
        <label className="field">
          <span>Nome da fonte</span>
          <input name="sourceName" required minLength={2} maxLength={150} />
        </label>
        <label className="field">
          <span>Link da fonte</span>
          <input name="sourceUrl" type="url" required maxLength={2000} placeholder="https://…" />
        </label>
        <label className="field">
          <span>Tipo de fonte</span>
          <select name="sourceKind" defaultValue="company">
            <option value="company">Site da própria empresa</option>
            <option value="government">Publicação governamental</option>
            <option value="directory">Diretório de terceiros (sem confirmar especialização)</option>
          </select>
        </label>
        <label className="field">
          <span>Pendências e observações</span>
          <textarea name="notes" rows={3} maxLength={3000} />
        </label>
        <FormError message={error} />
      </div>
      <footer className="dialog-footer">
        <button className="button secondary" type="button" disabled={pending} onClick={onCancel}>
          Cancelar
        </button>
        <button className="button primary" type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Salvar perfil"}
        </button>
      </footer>
    </form>
  );
}
