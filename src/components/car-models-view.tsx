"use client";
import { CarFront, ExternalLink, Info, Search } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { usePagination } from "@/hooks/use-pagination";
import { periodLabel } from "@/libs/analysis-period";
import { formatNumber } from "@/libs/intelligence-presentation";
import type { IntelligenceData } from "@/types/intelligence";
import { CarModelTerritories } from "./car-model-territories";
import { Pagination } from "./pagination";
export function CarModelsView({
  data,
  controller,
  records,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
  records: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [make, setMake] = useState("");
  const [aggregate, setAggregate] = useState<"sum" | "average">("sum");
  const [coverageOpen, setCoverageOpen] = useState(false);
  const coverageId = useId();
  const report = data.models;
  const period = periodLabel(data.years);
  const makes = [...new Set(report.rows.map((row) => row.make))].sort();
  const filtered = report.rows.filter(
    (row) =>
      (!make || row.make === make) &&
      `${row.make} ${row.model}`
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const pagination = usePagination(filtered, `${query}-${make}`);
  function showCoverage() {
    setCoverageOpen(true);
    requestAnimationFrame(() => {
      document.getElementById(coverageId)?.scrollIntoView({
        block: "start",
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  }
  return (
    <>
      <div className="bi-panel-intro">
        <h3 id={`${coverageId}-results`} tabIndex={-1}>
          Modelos de automóveis
        </h3>
      </div>
      <div className="bi-model-controls">
        <label>
          Indicador
          <select
            aria-label="Indicador de modelos"
            value={report.measure}
            onChange={(e) => controller.navigate({ metric: e.target.value })}
          >
            <option value="registrations">Emplacamentos</option>
            <option value="sales">Vendas informadas</option>
          </select>
        </label>
        {data.years.length > 1 && (
          <label>
            Consolidar período
            <select
              aria-label="Consolidação de modelos"
              value={aggregate}
              onChange={(e) => setAggregate(e.target.value as "sum" | "average")}
            >
              <option value="sum">Soma dos anos</option>
              <option value="average">Média anual</option>
            </select>
          </label>
        )}
        {report.rows.length > 0 && (
          <>
            <label className="model-search-field">
              Modelo
              <span className="search-box">
                <Search size={15} />
                <input
                  aria-label="Buscar modelo de automóvel"
                  placeholder="Buscar modelo…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </span>
            </label>
            <label>
              Marca
              <select
                aria-label="Filtrar marca de automóvel"
                value={make}
                onChange={(e) => setMake(e.target.value)}
              >
                <option value="">Todas as marcas</option>
                {makes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <p className="bi-data-note">
        <Info size={15} />
        <span>{report.coverage.notes[0]}</span>
      </p>
      {data.records.length === 500 && (
        <p className="bi-data-note">
          O recorte atingiu o limite de 500 registros locais. Restrinja os anos ou o território para
          consolidar o conjunto completo.
        </p>
      )}
      {report.rows.length > 0 ? (
        <>
          <p className="bi-record-count">
            {filtered.length} {filtered.length === 1 ? "linha" : "linhas"} por modelo, fonte e
            território
          </p>
          <div className="bi-model-table-scroll">
            <table className="bi-model-table">
              <caption>
                {report.measure === "sales" ? "Vendas informadas" : "Emplacamentos"} de automóveis
                por modelo · {period} · {data.territory.label}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Marca / modelo</th>
                  {data.years.map((year) => (
                    <th scope="col" key={year}>
                      {year}
                    </th>
                  ))}
                  {data.years.length > 1 && (
                    <th scope="col">{aggregate === "sum" ? "Total do período" : "Média anual"}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pagination.items.map((row) => (
                  <tr key={row.key}>
                    <th scope="row">
                      <strong>
                        {row.make} / {row.model}
                      </strong>
                      <small>
                        {row.territoryLabel} · {row.sourceName} · {row.unit}
                        {row.category ? ` · ${row.category}` : ""}
                      </small>
                    </th>
                    {row.values.map((value) => (
                      <td
                        key={value.year}
                        title={
                          value.issue ||
                          (value.ambiguous
                            ? "Há mais de um registro para a mesma fonte, modelo, território e ano. Confira os registros antes de consolidar."
                            : value.value === null
                              ? "Sem valor no ranking ou na fonte disponível."
                              : undefined)
                        }
                      >
                        {value.value === null
                          ? value.issue || value.ambiguous
                            ? "Revisar fonte"
                            : "—"
                          : formatNumber(value.value)}
                      </td>
                    ))}
                    {data.years.length > 1 && (
                      <td className="bi-model-consolidated">
                        <strong>
                          {row.total === null
                            ? "—"
                            : new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
                                aggregate === "sum" ? row.total : (row.average ?? 0),
                              )}
                        </strong>
                        {!row.complete && (
                          <small>
                            Parcial · {row.values.filter((v) => v.value !== null).length}/
                            {data.years.length} anos
                          </small>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            label="modelos de automóveis"
            targetId={`${coverageId}-results`}
            {...pagination}
          />
          {!filtered.length && (
            <p className="bi-inline-note">Nenhum modelo corresponde ao filtro.</p>
          )}
          <p className="bi-inline-note">
            Cada linha conserva sua fonte e seu nível geográfico. Totais estaduais e municipais são
            apresentados em linhas distintas. A média usa os anos com valor disponível; lacunas
            ficam identificadas.
          </p>
          <div className="bi-model-sources">
            {[
              ...new Map(
                [...report.rows.flatMap((row) => row.sources), ...report.coverage.sources].map(
                  (source) => [source.url, source],
                ),
              ).values(),
            ].map((source) => (
              <a
                className="bi-source-link"
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
              >
                {source.name}
                <ExternalLink size={12} />
              </a>
            ))}
          </div>
        </>
      ) : (
        <div className="bi-empty">
          <CarFront size={26} />
          <h3>
            {report.coverage.scopeIncluded
              ? "Sem publicação verificada neste recorte"
              : "Município fora desta etapa"}
          </h3>
          <p>
            {report.coverage.scopeIncluded
              ? "Não há quantidades por modelo carregadas para este território e os anos selecionados. Consulte a cobertura por UF e capital. Sem publicação não significa nenhuma venda."
              : "A lista de modelos contempla UFs e capitais nesta etapa. As demais cidades serão incluídas conforme sua definição."}
          </p>
          {!report.coverage.scopeIncluded && data.territory.uf && (
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                controller.navigate({
                  uf: data.territory.uf,
                  city: null,
                  region: null,
                  map: "states",
                })
              }
            >
              Consultar a unidade federativa
            </button>
          )}
          <button type="button" className="button secondary" onClick={showCoverage}>
            Ver cobertura de UFs e capitais
          </button>
          {data.territory.level !== "country" && (
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                controller.navigate({
                  region: "BR",
                  uf: null,
                  city: null,
                  metric: "registrations",
                  map: "states",
                })
              }
            >
              Ver referência nacional por modelo
            </button>
          )}
          {!report.coverage.availableYears.length && report.measure === "registrations" && (
            <button
              type="button"
              className="button secondary"
              onClick={() =>
                controller.navigate({ uf: "DF", city: null, region: null, map: "states" })
              }
            >
              Ver publicação do Distrito Federal
            </button>
          )}
        </div>
      )}
      {data.viewer.role === "admin" && report.excluded > 0 && (
        <p className="bi-inline-note">
          {report.excluded} registros sem classificação de automóvel, sem marca/modelo ou de outro
          indicador foram ocultados desta visualização.
        </p>
      )}
      <div className="bi-model-coverage">
        <button
          className="bi-model-coverage-trigger"
          type="button"
          aria-expanded={coverageOpen}
          aria-controls={coverageOpen ? coverageId : undefined}
          onClick={() => setCoverageOpen(!coverageOpen)}
        >
          Fontes e cobertura por território e ano
        </button>
        <AnimatePresence initial={false}>
          {coverageOpen && (
            <motion.div
              id={coverageId}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div className="bi-model-coverage-body">
                <p>
                  Anos com publicação neste recorte e indicador:{" "}
                  <strong>
                    {report.coverage.availableYears.length
                      ? periodLabel(report.coverage.availableYears)
                      : "nenhum"}
                  </strong>
                  .
                </p>
                {report.coverage.missingYears.length > 0 && (
                  <p>
                    Anos selecionados sem publicação carregada:{" "}
                    {periodLabel(report.coverage.missingYears)}. Sem dado não significa zero.
                  </p>
                )}
                {report.coverage.notes.slice(1).map((note) => (
                  <p key={note}>{note}</p>
                ))}
                <p>
                  A soma usa apenas os anos selecionados. A média considera os anos com valor;
                  lacunas ficam identificadas como parciais.
                </p>
                <p>
                  Brasil: 2022–2025 (Fenabrave nacional). Distrito Federal e Brasília: 2022–2025
                  (Sincodiv-DF). Mato Grosso: 2024 (Fenabrave-MT). Os demais territórios ainda
                  dependem de séries locais verificáveis.
                </p>
                <CarModelTerritories
                  coverage={report.coverage}
                  years={data.years}
                  territory={data.territory}
                  controller={controller}
                />
                <div className="bi-model-sources">
                  {report.coverage.sources.map((source) => (
                    <a
                      className="bi-source-link"
                      key={source.url}
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {source.name}
                      <ExternalLink size={12} />
                    </a>
                  ))}
                  <a
                    className="bi-source-link"
                    href="https://dados.transportes.gov.br/dataset/registro-nacional-de-veiculos-automotores-renavam"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Senatran · base aberta de frota
                    <ExternalLink size={12} />
                  </a>
                  <a
                    className="bi-source-link"
                    href="https://www.gov.br/pt-br/servicos/contratar-arquivos-estatisticos-denatran"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Serpro · acesso aos arquivos estatísticos
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <details className="bi-local-model-records">
        <summary>Registros locais de automóveis ({report.recordIds.length})</summary>
        {records}
      </details>
    </>
  );
}
