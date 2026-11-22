"use client";
import { ArrowLeft, MapPin, Minus, MousePointer2, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useRef, useState } from "react";
import statePaths from "@/data/brazil-map.json";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { useMapViewport } from "@/hooks/use-map-viewport";
import { periodLabel } from "@/libs/analysis-period";
import { compactNumber, formatNumber } from "@/libs/intelligence-presentation";
import type { IntelligenceData } from "@/types/intelligence";
import { StateFlag } from "./state-flag";
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
  const viewport = useMapViewport();
  const { zoom } = viewport;
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
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
  const activeFlag = municipal
    ? data.states.find((state) => state.code === data.territory.uf)
    : active;
  const selectedShape = features.find((shape) => shape.code === selected);
  const hoveredShape = features.find((shape) => shape.code === hovered);
  const maximum = Math.max(1, ...features.map((shape) => statistics.get(shape.code)?.[layer] ?? 0));
  const period = periodLabel(data.years);
  const fleetDescription =
    data.years.length > 1
      ? `automóveis · média anual · ${period}`
      : `automóveis registrados · dez/${period}`;
  function select(code: string) {
    if (controller.navigating) return;
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
      aria-busy={controller.navigating}
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
          disabled={controller.navigating}
          aria-pressed={data.mapView === "states"}
          onClick={() => {
            setHovered(null);
            viewport.reset();
            controller.navigate({ map: "states" });
          }}
        >
          Estados
        </button>
        <button
          type="button"
          disabled={controller.navigating}
          aria-pressed={data.mapView === "municipalities"}
          onClick={() => {
            setHovered(null);
            viewport.reset();
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
      {
        <div className="bi-map-local-toolbar">
          <button
            type="button"
            className="text-button"
            disabled={controller.navigating}
            onClick={() => {
              setHovered(null);
              viewport.reset();
              if (municipal) controller.navigate({ map: "states" });
            }}
          >
            <ArrowLeft size={13} />
            {municipal ? "Ver estados" : "Centralizar mapa"}
          </button>
          <div>
            <button
              type="button"
              className="icon-button"
              aria-label="Reduzir zoom do mapa"
              disabled={zoom === 1}
              onClick={() => viewport.changeZoom(zoom - 1)}
            >
              <Minus size={15} />
            </button>
            <span>{zoom}×</span>
            <button
              type="button"
              className="icon-button"
              aria-label="Ampliar zoom do mapa"
              disabled={zoom === 6}
              onClick={() => viewport.changeZoom(zoom + 1, selectedShape?.center)}
            >
              <Plus size={15} />
            </button>
          </div>
        </div>
      }
      <div className="bi-map-canvas">
        <svg
          viewBox={viewport.viewBox}
          {...viewport.handlers}
          onPointerMove={(event) => {
            viewport.handlers.onPointerMove(event);
            if (event.pointerType === "mouse")
              setPointer({
                x: Math.min(event.clientX + 14, window.innerWidth - 230),
                y: Math.max(8, event.clientY - 60),
              });
          }}
          onPointerLeave={() => {
            setPointer(null);
            setHovered(null);
          }}
          aria-labelledby={id}
          className={`bi-brazil-map ${municipal ? "is-municipal" : ""} ${zoom > 1 ? "is-zoomed" : ""} ${viewport.dragging ? "is-dragging" : ""}`}
        >
          <title id={id}>
            {municipal
              ? "Selecione um município. Use as setas para percorrer e Enter para selecionar."
              : "Selecione uma unidade da federação para analisar o território."}
          </title>
          <defs>
            <pattern id={`${id}-pattern`} patternUnits="userSpaceOnUse" width="7" height="7">
              <rect width="7" height="7" fill="#f3f6f2" />
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
                aria-disabled={controller.navigating}
                onKeyDown={(event) => arrow(event, index)}
                onClick={(event) => {
                  event.preventDefault();
                  select(shape.code);
                }}
                onPointerEnter={() => setHovered(shape.code)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(shape.code)}
                onBlur={() => setHovered(null)}
                className={`bi-map-state ${value == null ? "is-missing" : ""} ${shape.code === selected ? "is-selected" : ""} ${shape.code === hovered ? "is-hovered" : ""} ${!municipal && !data.territory.uf && data.states.find((s) => s.code === shape.code)?.region === data.territory.region ? "is-regional" : ""}`}
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
                    onPointerEnter={() => setHovered("DF")}
                    onPointerLeave={() => setHovered(null)}
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
        {pointer && hoveredShape && !viewport.dragging && (
          <div
            className="bi-map-tooltip"
            role="tooltip"
            style={{ left: pointer.x, top: pointer.y }}
          >
            {!municipal && <StateFlag code={hoveredShape.code} name={hoveredShape.name} />}
            <strong>{hoveredShape.name}</strong>
            <span>{title(hoveredShape).slice(hoveredShape.name.length + 2)}</span>
          </div>
        )}
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
            {activeFlag && <StateFlag code={activeFlag.code} name={activeFlag.name} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {municipal && data.territory.city && !selectedShape && (
        <p className="bi-map-level-hint">
          A malha disponível ainda não contém o município selecionado. O painel mantém os dados do
          código IBGE informado.
        </p>
      )}
      {layer === "fleet" && data.states.every((state) => state.fleet === null) && (
        <p className="bi-map-level-hint">
          Sem cobertura de automóveis para todos os anos selecionados. As áreas hachuradas continuam
          clicáveis. A base do mapa cobre 2022–2024; ajuste os anos ou escolha População 2022.
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
            ? "Clique para selecionar. Com zoom, arraste com mouse ou toque para mover o mapa. Use as setas e Enter para percorrer os municípios."
            : "Passe o mouse ou use Tab para identificar. Clique ou pressione Enter para selecionar. Com zoom, arraste com mouse ou toque."}
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
