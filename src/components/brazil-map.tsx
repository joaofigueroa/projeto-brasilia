"use client";
import { MapPin, MousePointer2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import paths from "@/data/brazil-map.json";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { compactNumber, formatNumber } from "@/libs/intelligence-presentation";
import type { IntelligenceData } from "@/types/intelligence";
export function BrazilMap({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [layer, setLayer] = useState<"population" | "fleet">(
    data.project.slug === "pecas-automotivas" ? "fleet" : "population",
  );
  const tooltipId = useId();
  const active = data.states.find((s) => s.code === (hovered ?? data.territory.uf));
  const max = Math.max(1, ...data.states.map((s) => s[layer] ?? 0));
  function select(code: string) {
    setHovered(code);
    controller.navigate({ uf: code, region: null, city: null });
  }
  return (
    <section className="bi-map-card" aria-label="Mapa interativo do Brasil">
      <div className="bi-map-heading">
        <div>
          <span className="bi-kicker">TERRITÓRIO</span>
          <h2>Brasil</h2>
        </div>
        <span className="bi-map-count">27 UFs</span>
      </div>
      <div className="bi-map-layers" role="group" aria-label="Indicador do mapa">
        <button
          type="button"
          aria-pressed={layer === "population"}
          onClick={() => setLayer("population")}
        >
          População <small>2022</small>
        </button>
        <button type="button" aria-pressed={layer === "fleet"} onClick={() => setLayer("fleet")}>
          Frota <small>{data.year}</small>
        </button>
      </div>
      <div className="bi-map-canvas">
        <svg viewBox="0 0 580 560" aria-labelledby={tooltipId} className="bi-brazil-map">
          <title id={tooltipId}>
            Selecione uma unidade da federação para analisar o território.
          </title>
          <defs>
            <pattern id={`${tooltipId}-pattern`} patternUnits="userSpaceOnUse" width="7" height="7">
              <path d="M0 7L7 0" stroke="#c9d4ce" strokeWidth="1" />
            </pattern>
          </defs>
          {paths.map((shape) => {
            const state = data.states.find((s) => s.code === shape.code);
            if (!state || state.code === "DF") return null;
            const selected = state.code === data.territory.uf;
            const highlighted = state.code === hovered;
            const regional = !data.territory.uf && state.region === data.territory.region;
            const number = state[layer];
            const color =
              number === null
                ? `url(#${tooltipId}-pattern)`
                : `hsl(148 18% ${91 - Math.sqrt(number / max) * 30}%)`;
            const label = `${state.name} (${state.code})${number === null ? ", dado não disponível" : `, ${formatNumber(number)} ${layer === "population" ? "habitantes em 2022" : `veículos em dezembro de ${data.year}`}`}`;
            return (
              <a
                key={state.code}
                href={`?project=${data.project.id}&uf=${state.code}&year=${data.year}&tab=${data.tab.id}`}
                aria-label={`Selecionar ${label}`}
                aria-current={selected ? "true" : undefined}
                onClick={(event) => {
                  event.preventDefault();
                  select(state.code);
                }}
                onMouseEnter={() => setHovered(state.code)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(state.code)}
                onBlur={() => setHovered(null)}
                className={`bi-map-state ${selected ? "is-selected" : ""} ${highlighted ? "is-hovered" : ""} ${regional ? "is-regional" : ""}`}
              >
                <title>{label}</title>
                <path d={shape.path} fill={color} fillRule="evenodd" />
              </a>
            );
          })}
          {paths
            .filter((s) => s.code !== "DF")
            .map((shape) => (
              <text
                key={shape.code}
                x={shape.center[0]}
                y={shape.center[1]}
                className={`bi-state-label ${data.territory.uf === shape.code ? "is-selected" : ""}`}
              >
                {shape.code}
              </text>
            ))}
          {paths
            .filter((s) => s.code === "DF")
            .map((shape) => (
              <g key="DF">
                <path
                  d={`M${shape.center[0] + 6},${shape.center[1] - 5}l22,-20h19`}
                  className="bi-df-leader"
                />
                <text x={shape.center[0] + 39} y={shape.center[1] - 32} className="bi-state-label">
                  DF
                </text>
                <a
                  href={`?project=${data.project.id}&uf=DF&year=${data.year}&tab=${data.tab.id}`}
                  aria-label="Selecionar Distrito Federal, área ampliada"
                  onClick={(e) => {
                    e.preventDefault();
                    select("DF");
                  }}
                  onMouseEnter={() => setHovered("DF")}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered("DF")}
                  onBlur={() => setHovered(null)}
                  className={`bi-df-target ${data.territory.uf === "DF" ? "is-selected" : ""}`}
                >
                  <title>Distrito Federal · área de clique ampliada</title>
                  <circle className="bi-df-hit" cx={shape.center[0]} cy={shape.center[1]} r="17" />
                  <circle cx={shape.center[0]} cy={shape.center[1]} r="6" />
                </a>
              </g>
            ))}
        </svg>
        <AnimatePresence mode="wait">
          <motion.div
            key={active?.code ?? "all"}
            className="bi-map-callout"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
          >
            <MapPin size={16} />
            <div>
              <strong>{active?.name ?? data.territory.label}</strong>
              <span>
                {active
                  ? active[layer] === null
                    ? "Sem dado para o período"
                    : `${compactNumber(active[layer] ?? 0)} ${layer === "population" ? "habitantes · Censo 2022" : `veículos · dez/${data.year}`}`
                  : "Selecione uma UF no mapa"}
              </span>
            </div>
            {active && <span className="bi-map-uf">{active.code}</span>}
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="bi-map-legend">
        <span>Menor</span>
        <i />
        <span>Maior</span>
        <span className="bi-map-missing">Hachura: sem dado</span>
      </div>
      <div className="bi-map-help">
        <MousePointer2 size={14} />
        <span>
          Passe o mouse ou use Tab para identificar. Clique ou pressione Enter para selecionar.
        </span>
      </div>
      <div className="bi-map-attribution">
        Limites:{" "}
        <a
          href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3"
          target="_blank"
          rel="noreferrer"
        >
          IBGE
        </a>{" "}
        · indicadores: IBGE e Senatran
      </div>
    </section>
  );
}
