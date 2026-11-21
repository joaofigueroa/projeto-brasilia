"use client";
import { ArrowLeft, MapPin, Minus, MousePointer2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import statePaths from "@/data/brazil-map.json";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { periodLabel } from "@/libs/analysis-period";
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
  const [zoom, setZoom] = useState(1);
  const links = useRef<Record<string, HTMLAnchorElement | null>>({});
  const id = useId();
  const municipal = data.mapView === "municipalities" && Boolean(data.municipalMap);
  const selected = municipal ? data.territory.city : data.territory.uf;
  const features = municipal
    ? (data.municipalMap?.features ?? [])
    : statePaths.map((shape) => ({
        ...shape,
        name: data.states.find((s) => s.code === shape.code)?.name ?? shape.code,
      }));
  const statistics = new Map(
    (municipal ? data.cities : data.states).map((item) => [item.code, item]),
  );
  const active = features.find((shape) => shape.code === (hovered ?? selected));
  const activeStats = active ? statistics.get(active.code) : undefined;
  const selectedShape = features.find((shape) => shape.code === selected);
  const hoveredShape = features.find((shape) => shape.code === hovered);
  const maximum = Math.max(1, ...features.map((shape) => statistics.get(shape.code)?.[layer] ?? 0));
  const period = periodLabel(data.years);
  const fleetDescription =
    data.years.length > 1
      ? `automóveis · média anual · ${period}`
      : `automóveis registrados · dez/${period}`;
  const center = municipal && zoom > 1 ? (selectedShape?.center ?? [290, 280]) : [290, 280];
  const width = 580 / zoom,
    height = 560 / zoom;
  const left = Math.max(0, Math.min(580 - width, center[0] - width / 2)),
    top = Math.max(0, Math.min(560 - height, center[1] - height / 2));
  function select(code: string) {
    setHovered(code);
    controller.navigate(
      municipal ? { city: code, map: "municipalities" } : { uf: code, region: null, city: null },
    );
  }
  function arrow(event: React.KeyboardEvent<HTMLAnchorElement>, index: number) {
    if (
      !municipal ||
      !["ArrowRight", "ArrowLeft", "ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)
    )
      return;
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? features.length - 1
          : (index +
              (event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 1) +
              features.length) %
            features.length;
    links.current[features[next].code]?.focus();
  }
  const title = (shape: (typeof features)[number]) => {
    const value = statistics.get(shape.code)?.[layer];
    return `${shape.name}${value === null || value === undefined ? ", sem dado para o período completo" : `, ${formatNumber(value)} ${layer === "population" ? "habitantes · Censo 2022" : fleetDescription}`}`;
  };
  return (
    <section
      className="bi-map-card"
      aria-label={municipal ? "Mapa interativo de municípios" : "Mapa interativo do Brasil"}
    >
      <div className="bi-map-heading">
        <div>
          <span className="bi-kicker">TERRITÓRIO</span>
          <h2>
            {municipal ? data.states.find((s) => s.code === data.territory.uf)?.name : "Brasil"}
          </h2>
        </div>
        <span className="bi-map-count">
          {municipal
            ? `${features.length} ${data.territory.uf === "DF" ? "recorte" : "municípios"}`
            : "27 UFs"}
        </span>
      </div>
      <div className="bi-map-levels" role="group" aria-label="Nível geográfico do mapa">
        <button
          type="button"
          aria-pressed={data.mapView === "states"}
          onClick={() => {
            setHovered(null);
            setZoom(1);
            controller.navigate({ map: "states" });
          }}
        >
          Estados
        </button>
        <button
          type="button"
          aria-pressed={data.mapView === "municipalities"}
          onClick={() => {
            setHovered(null);
            setZoom(1);
            controller.navigate({ map: "municipalities" });
          }}
        >
          Municípios
        </button>
      </div>
      {data.mapView === "municipalities" && !municipal && (
        <p className="bi-map-level-hint">Selecione uma UF para abrir seus municípios.</p>
      )}
      <div className="bi-map-layers" role="group" aria-label="Indicador do mapa">
        <button
          type="button"
          aria-pressed={layer === "population"}
          onClick={() => setLayer("population")}
        >
          População <small>2022</small>
        </button>
        <button type="button" aria-pressed={layer === "fleet"} onClick={() => setLayer("fleet")}>
          Automóveis <small>{period}</small>
        </button>
      </div>
      {municipal && (
        <div className="bi-map-local-toolbar">
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setHovered(null);
              setZoom(1);
              controller.navigate({ map: "states" });
            }}
          >
            <ArrowLeft size={13} />
            Ver estados
          </button>
          <div>
            <button
              type="button"
              className="icon-button"
              aria-label="Reduzir mapa municipal"
              disabled={zoom === 1}
              onClick={() => setZoom(Math.max(1, zoom - 1))}
            >
              <Minus size={15} />
            </button>
            <span>{zoom}×</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Ampliar mapa municipal"
              disabled={zoom === 4}
              onClick={() => setZoom(Math.min(4, zoom + 1))}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      )}
      <div className="bi-map-canvas">
        <svg
          viewBox={`${left} ${top} ${width} ${height}`}
          aria-labelledby={id}
          className={`bi-brazil-map ${municipal ? "is-municipal" : ""}`}
        >
          <title id={id}>
            {municipal
              ? "Selecione um município. Use as setas para percorrer e Enter para selecionar."
              : "Selecione uma unidade da federação para analisar o território."}
          </title>
          <defs>
            <pattern id={`${id}-pattern`} patternUnits="userSpaceOnUse" width="7" height="7">
              <path d="M0 7L7 0" stroke="#c9d4ce" strokeWidth="1" />
            </pattern>
          </defs>
          {features.map((shape, index) => {
            const value = statistics.get(shape.code)?.[layer];
            const color =
              value === null || value === undefined
                ? `url(#${id}-pattern)`
                : `hsl(148 18% ${91 - Math.sqrt(value / maximum) * 30}%)`;
            const params = new URLSearchParams({
              project: data.project.id,
              uf: municipal ? (data.territory.uf ?? "") : shape.code,
              years: data.years.join(","),
              tab: data.tab.id,
              map: data.mapView,
              metric: data.metric,
            });
            if (municipal) params.set("city", shape.code);
            return (
              <a
                ref={(node) => {
                  links.current[shape.code] = node;
                }}
                key={shape.code}
                href={`?${params}`}
                tabIndex={municipal ? (shape.code === (selected ?? features[0]?.code) ? 0 : -1) : 0}
                aria-label={`Selecionar ${municipal ? "município " : ""}${title(shape)}`}
                aria-current={shape.code === selected ? "true" : undefined}
                onKeyDown={(event) => arrow(event, index)}
                onClick={(event) => {
                  event.preventDefault();
                  select(shape.code);
                }}
                onMouseEnter={() => setHovered(shape.code)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(shape.code)}
                onBlur={() => setHovered(null)}
                className={`bi-map-state ${shape.code === selected ? "is-selected" : ""} ${shape.code === hovered ? "is-hovered" : ""} ${!municipal && !data.territory.uf && data.states.find((s) => s.code === shape.code)?.region === data.territory.region ? "is-regional" : ""}`}
              >
                <title>{title(shape)}</title>
                <path d={shape.path} fill={color} fillRule="evenodd" />
              </a>
            );
          })}
          {!municipal &&
            features
              .filter((shape) => shape.code !== "DF")
              .map((shape) => (
                <text
                  key={shape.code}
                  x={shape.center[0]}
                  y={shape.center[1]}
                  className={`bi-state-label ${shape.code === selected ? "is-selected" : ""}`}
                >
                  {shape.code}
                </text>
              ))}
          {/* Boundary overlays are painted last, above every neighbouring polygon. */}
          <g className="bi-map-outline-layer">
            {selectedShape && (
              <path className="bi-map-outline selected-outline" d={selectedShape.path} />
            )}{" "}
            {hoveredShape && (
              <path className="bi-map-outline hovered-outline" d={hoveredShape.path} />
            )}
          </g>
          {!municipal &&
            statePaths
              .filter((shape) => shape.code === "DF")
              .map((shape) => (
                <g key="DF">
                  <path
                    d={`M${shape.center[0] + 6},${shape.center[1] - 5}l22,-20h19`}
                    className="bi-df-leader"
                  />
                  <text
                    x={shape.center[0] + 39}
                    y={shape.center[1] - 32}
                    className="bi-state-label"
                  >
                    DF
                  </text>
                  <a
                    href={`?project=${data.project.id}&uf=DF&years=${data.years.join(",")}`}
                    tabIndex={-1}
                    aria-label="Selecionar Distrito Federal, área ampliada"
                    onClick={(event) => {
                      event.preventDefault();
                      select("DF");
                    }}
                    onMouseEnter={() => setHovered("DF")}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered("DF")}
                    onBlur={() => setHovered(null)}
                    className={`bi-df-target ${selected === "DF" ? "is-selected" : ""}`}
                  >
                    <title>Distrito Federal · área de clique ampliada</title>
                    <circle
                      className="bi-df-hit"
                      cx={shape.center[0]}
                      cy={shape.center[1]}
                      r="17"
                    />
                    <circle cx={shape.center[0]} cy={shape.center[1]} r="6" />
                  </a>
                </g>
              ))}
        </svg>
        <AnimatePresence mode="wait">
          <motion.div
            key={active?.code ?? data.territory.label}
            className="bi-map-callout"
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -3 }}
          >
            <MapPin size={16} />
            <div>
              <strong>{active?.name ?? data.territory.label}</strong>
              <span>
                {activeStats?.[layer] === null
                  ? "Sem dado para o período completo"
                  : activeStats
                    ? `${compactNumber(activeStats[layer] ?? 0)} ${layer === "population" ? "habitantes · Censo 2022" : fleetDescription}`
                    : municipal
                      ? "Selecione um município"
                      : "Selecione uma UF no mapa"}
              </span>
            </div>
            {active && !municipal && <span className="bi-map-uf">{active.code}</span>}
          </motion.div>
        </AnimatePresence>
      </div>
      {municipal && data.territory.city && !selectedShape && (
        <p className="bi-map-level-hint">
          A malha disponível ainda não contém o município selecionado. O painel mantém os dados do
          código IBGE informado.
        </p>
      )}
      <div className="bi-map-legend">
        <span>Menor</span>
        <i />
        <span>Maior</span>
        <span className="bi-map-missing">Hachura: sem dado</span>
      </div>
      <div className="bi-map-help">
        <MousePointer2 size={14} />
        <span>
          {municipal
            ? "Clique em um município ou use o filtro. No mapa, use as setas e Enter. Amplie após selecionar para centralizar o recorte."
            : "Passe o mouse ou use Tab para identificar. Clique ou pressione Enter para selecionar."}
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
        · {data.territory.uf === "DF" && municipal ? "DF: recorte de Brasília · " : ""}indicadores:
        IBGE e Senatran
      </div>
    </section>
  );
}
