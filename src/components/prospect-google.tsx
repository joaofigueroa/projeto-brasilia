"use client";
import { ExternalLink, Plus, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { v7 } from "uuid";
import { researchDate } from "@/libs/commercial-research";
import { googleMapsProfileUrl, normalizeGoogleMapsEmbedInput } from "@/libs/google-business";
import { saveProspectGoogleNoteAction } from "@/server/actions/commercial-research";
import type { ResearchProspect } from "@/types/commercial-research";
import { FormError } from "./feedback";

export function ProspectGoogleSummary({ prospect }: { prospect: ResearchProspect }) {
  return (
    <div className="prospect-google-summary">
      <div>
        <Star size={12} aria-hidden="true" />
        {prospect.google?.rating != null ? (
          <span>
            <strong>
              {prospect.google.rating.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}
            </strong>{" "}
            / 5
            {prospect.google.reviewCount != null
              ? ` · ${prospect.google.reviewCount.toLocaleString("pt-BR")} avaliações`
              : ""}
            <small>Google · registro manual de {researchDate(prospect.google.checkedAt)}</small>
          </span>
        ) : (
          <span>
            Google Maps<small>Nota ainda não registrada</small>
          </span>
        )}
      </div>
      <a href={googleMapsProfileUrl(prospect)} target="_blank" rel="noreferrer">
        Consultar
        <ExternalLink size={11} aria-hidden="true" />
      </a>
    </div>
  );
}
export function ProspectGoogle({
  prospect,
  projectId,
  canManage,
}: {
  prospect: ResearchProspect;
  projectId: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const embedHelpId = useId();
  const [note, setNote] = useState(prospect.google);
  const [editing, setEditing] = useState(false);
  const [reviews, setReviews] = useState(
    (note?.reviews ?? []).map((review) => ({ ...review, draftKey: review.id ?? v7() })),
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prospect.databaseId) return;
    const form = new FormData(event.currentTarget);
    const number = (key: string) =>
      String(form.get(key) ?? "").trim() ? Number(form.get(key)) : null;
    const fields = {
      rating: number("rating"),
      reviewCount: number("reviewCount"),
      checkedAt: String(form.get("checkedAt") ?? ""),
      mapsUrl: String(form.get("mapsUrl") ?? ""),
      embedUrl: normalizeGoogleMapsEmbedInput(String(form.get("embedUrl") ?? "")),
      reviews: reviews.map((review, index) => ({
        id: review.draftKey,
        author: String(form.get(`author-${index}`) ?? ""),
        text: String(form.get(`text-${index}`) ?? ""),
        rating: Number(form.get(`stars-${index}`)),
        publishedAt: String(form.get(`date-${index}`) ?? ""),
        url: String(form.get(`url-${index}`) ?? ""),
      })),
    };
    setError("");
    setPending(true);
    try {
      const result = await saveProspectGoogleNoteAction({
        projectId,
        prospectId: prospect.databaseId,
        version: note?.version ?? 0,
        fields,
      });
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNote({ ...fields, version: (note?.version ?? 0) + 1 });
      setEditing(false);
      setNotice("Consulta do Google registrada.");
      router.refresh();
    } catch {
      setError("Não foi possível salvar agora. Tente novamente.");
    } finally {
      setPending(false);
    }
  }
  return (
    <section className="research-profile-section prospect-google-section">
      <div className="research-section-heading">
        <h3>
          <Star size={16} />
          Consultas registradas
        </h3>
        {canManage && prospect.databaseId && !editing && (
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setEditing(true);
              setReviews(
                (note?.reviews ?? []).map((review) => ({
                  ...review,
                  draftKey: review.id ?? v7(),
                })),
              );
              setError("");
            }}
          >
            {note ? "Editar registro" : "Registrar consulta"}
          </button>
        )}
      </div>
      <ProspectGoogleSummary prospect={{ ...prospect, google: note }} />
      <p>
        Notas e trechos registrados nesta seção são manuais, com data de consulta. Não são
        sincronizados com a ficha incorporada.
      </p>
      {!editing &&
        note?.reviews.map((review) => (
          <article className="google-review" key={review.id ?? `${review.author}-${review.text}`}>
            <header>
              <strong>{review.author}</strong>
              <span>{review.rating} / 5</span>
            </header>
            <small>
              {review.publishedAt || "Data da avaliação não informada"} · transcrição manual
            </small>
            <p>{review.text}</p>
            <a
              className="research-source"
              href={review.url || note.mapsUrl || googleMapsProfileUrl(prospect)}
              target="_blank"
              rel="noreferrer"
            >
              Ver fonte no Google
              <ExternalLink size={12} />
            </a>
          </article>
        ))}
      {!editing && !note?.reviews.length && (
        <p className="research-footnote">Nenhum trecho de avaliação foi registrado.</p>
      )}
      {editing && (
        <form className="google-note-editor" onSubmit={save}>
          <div className="form-grid two">
            <label className="field">
              <span>Nota observada (1 a 5)</span>
              <input
                name="rating"
                type="number"
                min="1"
                max="5"
                step="0.1"
                defaultValue={note?.rating ?? ""}
              />
            </label>
            <label className="field">
              <span>Quantidade de avaliações</span>
              <input
                name="reviewCount"
                type="number"
                min="0"
                step="1"
                defaultValue={note?.reviewCount ?? ""}
              />
            </label>
          </div>
          <label className="field">
            <span>Data da consulta</span>
            <input
              name="checkedAt"
              type="date"
              required
              defaultValue={note?.checkedAt ?? new Date().toISOString().slice(0, 10)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <label className="field">
            <span>Link da ficha no Google Maps</span>
            <input
              name="mapsUrl"
              type="url"
              maxLength={2000}
              defaultValue={note?.mapsUrl ?? ""}
              placeholder="https://www.google.com/maps/…"
            />
          </label>
          <label className="field">
            <span>Ficha exata (opcional)</span>
            <textarea
              name="embedUrl"
              aria-label="Ficha exata (opcional)"
              aria-describedby={embedHelpId}
              rows={3}
              maxLength={8000}
              defaultValue={note?.embedUrl ?? ""}
              placeholder="Cole o código copiado do Google Maps"
            />
            <small id={embedHelpId}>
              No Google Maps, use Compartilhar → Incorporar um mapa → Copiar HTML. Cole aqui para
              fixar a ficha correta. Sem esse vínculo, a consulta usa nome e endereço.
            </small>
          </label>
          {reviews.map((review, index) => (
            <fieldset className="google-review-editor" key={review.draftKey}>
              <legend>Avaliação {index + 1}</legend>
              <label className="field">
                <span>Autor</span>
                <input
                  name={`author-${index}`}
                  required
                  maxLength={150}
                  defaultValue={review.author}
                />
              </label>
              <div className="form-grid two">
                <label className="field">
                  <span>Estrelas</span>
                  <select name={`stars-${index}`} defaultValue={review.rating}>
                    {[1, 2, 3, 4, 5].map((stars) => (
                      <option key={stars} value={stars}>
                        {stars}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Data exibida pelo Google</span>
                  <input name={`date-${index}`} maxLength={60} defaultValue={review.publishedAt} />
                </label>
              </div>
              <label className="field">
                <span>Trecho da avaliação</span>
                <textarea
                  name={`text-${index}`}
                  required
                  maxLength={1000}
                  rows={3}
                  defaultValue={review.text}
                />
              </label>
              <label className="field">
                <span>Link da avaliação</span>
                <input
                  name={`url-${index}`}
                  type="url"
                  maxLength={2000}
                  defaultValue={review.url}
                />
              </label>
              <button
                className="text-button"
                type="button"
                onClick={() => setReviews(reviews.filter((_, i) => i !== index))}
              >
                <Trash2 size={13} />
                Remover avaliação {index + 1}
              </button>
            </fieldset>
          ))}
          {reviews.length < 5 && (
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setReviews([
                  ...reviews,
                  { draftKey: v7(), author: "", text: "", rating: 5, publishedAt: "", url: "" },
                ])
              }
            >
              <Plus size={13} />
              Adicionar transcrição
            </button>
          )}
          <FormError message={error} />
          <div className="google-note-actions">
            <button
              className="button secondary"
              type="button"
              disabled={pending}
              onClick={() => setEditing(false)}
            >
              Cancelar
            </button>
            <button className="button primary" type="submit" disabled={pending}>
              {pending ? "Salvando…" : "Salvar consulta"}
            </button>
          </div>
        </form>
      )}
      {notice && (
        <p role="status" className="research-action-notice">
          {notice}
        </p>
      )}
    </section>
  );
}
