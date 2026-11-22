"use client";
import { ExternalLink, LoaderCircle, MapPin, Search } from "lucide-react";
import { useState } from "react";
import { googleMapsEmbedUrl, googleMapsSearchQuery } from "@/libs/google-business";
import type { ResearchProspect } from "@/types/commercial-research";

export function ProspectGoogleMap({ prospect }: { prospect: ResearchProspect }) {
  const initialQuery = googleMapsSearchQuery(prospect);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState(initialQuery);
  const [adjusting, setAdjusting] = useState(false);
  const externalUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  return (
    <section
      className="prospect-map"
      id={`google-maps-${prospect.databaseId ?? prospect.id}`}
      aria-label="Ficha no Google Maps"
    >
      <header className="prospect-map-page-heading">
        <MapPin size={17} aria-hidden="true" />
        <h2>Google Maps</h2>
        <span>Ficha do estabelecimento</span>
      </header>
      <div className="prospect-map-content">
        <div className="prospect-map-frame">
          {!loaded && (
            <div className="prospect-map-loading" role="status">
              <LoaderCircle size={17} className="spinner" aria-hidden="true" />
              Carregando Google Maps…
            </div>
          )}
          <iframe
            key={query}
            title={`Ficha de ${prospect.name} no Google Maps`}
            src={
              query === initialQuery && prospect.google?.embedUrl
                ? prospect.google.embedUrl
                : googleMapsEmbedUrl(query)
            }
            loading="eager"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            onLoad={() => setLoaded(true)}
          />
        </div>
        <p className="prospect-map-caption">
          Google Maps ·{" "}
          {prospect.google?.embedUrl ? "ficha vinculada" : "confira o endereço da ficha"}.
          Comentários completos abrem no Google.
        </p>
        <div className="prospect-map-tools">
          <button
            className="text-button"
            type="button"
            aria-expanded={adjusting}
            onClick={() => setAdjusting(!adjusting)}
          >
            {adjusting ? "Fechar busca" : "Refinar busca"}
          </button>
          <a href={externalUrl} target="_blank" rel="noreferrer">
            Abrir no Google <ExternalLink size={11} aria-hidden="true" />
          </a>
        </div>
        {adjusting && (
          <form
            className="prospect-map-search"
            onSubmit={(event) => {
              event.preventDefault();
              const next = String(new FormData(event.currentTarget).get("query") ?? "").trim();
              if (!next || next === query) return;
              setLoaded(false);
              setQuery(next);
            }}
          >
            <label className="field">
              <span>Nome e endereço para buscar no Google</span>
              <input name="query" defaultValue={query} required maxLength={500} />
            </label>
            <button className="icon-button" type="submit" aria-label="Buscar ficha no mapa">
              <Search size={16} />
            </button>
            <small>Confira o endereço da ficha. Esta busca não altera o cadastro da empresa.</small>
          </form>
        )}
      </div>
    </section>
  );
}
