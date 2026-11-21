"use client";
import { CarFront, ExternalLink, Info, Search } from "lucide-react";
import { useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { periodLabel } from "@/libs/analysis-period";
import { formatNumber } from "@/libs/intelligence-presentation";
import type { IntelligenceData } from "@/types/intelligence";
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
  return (
    <>
      <div className="bi-panel-intro">
        <h3>Modelos de automóveis</h3>
        <p>Compare quantidades por modelo e ano no território selecionado.</p>
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
      </div>
      <div className="bi-model-period">
        <span>
          <CarFront size={16} />
          Automóveis · {data.territory.label}
        </span>
        <strong>{period}</strong>
      </div>
      {report.officialAvailable ? (
        <p className="bi-data-note">
          <Info size={15} />
          <span>
            Fenabrave: ranking dos 50 automóveis mais emplacados em cada ano, no Brasil. Publicações
            carregadas: 2022–2024. A soma inclui apenas os anos selecionados. “—” indica ausência no
            ranking disponível, com consolidação parcial.
          </span>
        </p>
      ) : (
        <p className="bi-data-note">
          <Info size={15} />
          <span>
            {report.measure === "sales"
              ? "Vendas informadas usam os registros cadastrados com fonte, marca, modelo e classificação Automóvel."
              : "Os boletins carregados da Fenabrave têm abrangência nacional. Para este recorte, os modelos usam registros locais cadastrados ou importados com fonte."}
          </span>
        </p>
      )}
      {data.records.length === 500 && (
        <p className="bi-data-note">
          O recorte atingiu o limite de 500 registros locais. Restrinja os anos ou o território para
          consolidar o conjunto completo.
        </p>
      )}
      {report.rows.length > 0 ? (
        <>
          <div className="bi-record-filters">
            <label className="search-box">
              <Search size={16} />
              <input
                aria-label="Buscar modelo de automóvel"
                placeholder="Buscar modelo, ex.: Nivus"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
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
          </div>
          <p className="bi-record-count">{filtered.length} linhas por modelo, fonte e território</p>
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
                {filtered.map((row) => (
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
                          value.ambiguous
                            ? "Há mais de um registro para a mesma fonte, modelo, território e ano. Confira os registros antes de consolidar."
                            : value.value === null
                              ? "Sem valor no ranking ou na fonte disponível."
                              : undefined
                        }
                      >
                        {value.value === null
                          ? value.ambiguous
                            ? "Revisar"
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
                report.rows.flatMap((row) => row.sources).map((source) => [source.url, source]),
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
          <h3>Sem dados de modelos neste recorte</h3>
          <p>
            Cadastre ou importe quantidades por marca, modelo e ano, com fonte e classificação
            Automóvel.
          </p>
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
        </div>
      )}
      {data.viewer.role === "admin" && report.excluded > 0 && (
        <p className="bi-inline-note">
          {report.excluded} registros sem classificação de automóvel, sem marca/modelo ou de outro
          indicador foram ocultados desta visualização.
        </p>
      )}
      <details className="bi-local-model-records">
        <summary>Registros locais de automóveis ({report.recordIds.length})</summary>
        {records}
      </details>
    </>
  );
}
