import { ArrowRight, ExternalLink } from "lucide-react";
import { useId } from "react";
import { periodLabel } from "@/libs/analysis-period";
import { formatNumber } from "@/libs/intelligence-presentation";
import type { RegistrationReport } from "@/types/intelligence";

export function CarRegistrationSummary({
  report,
  territory,
  years,
  detailed = false,
  onViewModels,
}: {
  report: RegistrationReport;
  territory: string;
  years: number[];
  detailed?: boolean;
  onViewModels?: () => void;
}) {
  const id = useId();
  const covered = report.series.filter((row) => row.value !== null).length;
  return (
    <section
      className={`car-registration-summary ${detailed ? "is-detailed" : ""}`}
      aria-labelledby={id}
    >
      <div className="car-registration-heading">
        <div>
          <h3 id={id}>Emplacamentos de automóveis</h3>
          <p>
            {territory} · {periodLabel(years)}
            {years.length > 1 ? " · soma dos anos" : ""}
          </p>
        </div>
        <strong className="car-registration-total">
          {report.total === null ? "Sem dado" : formatNumber(report.total)}
          {report.total !== null && !report.complete && (
            <small>
              Parcial · {covered}/{years.length} anos
            </small>
          )}
        </strong>
      </div>
      {!report.supportedTerritory ? (
        <p className="car-registration-note">
          Total municipal ainda não carregado. A série de 2016–2025 cobre as 27 UFs; os valores
          estaduais não são atribuídos aos municípios.
        </p>
      ) : report.missingYears.length > 0 ? (
        <p className="car-registration-note">
          Sem dados publicados nesta base para {report.missingYears.join(", ")}. Esses anos não
          entram no total nem na média.
        </p>
      ) : null}
      {detailed && (
        <>
          <div className="bi-model-table-scroll">
            <table className="bi-model-table car-registration-series">
              <caption className="sr-only">
                Emplacamentos anuais de automóveis em {territory}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Ano</th>
                  <th scope="col">Emplacamentos</th>
                </tr>
              </thead>
              <tbody>
                {report.series.map((row) => (
                  <tr key={row.year}>
                    <th scope="row">{row.year}</th>
                    <td>{row.value === null ? "Sem dado" : formatNumber(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {years.length > 1 && report.average !== null && (
            <p className="car-registration-note">
              Média anual:{" "}
              <strong>
                {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(
                  report.average,
                )}
              </strong>{" "}
              automóveis · {covered} {covered === 1 ? "ano disponível" : "anos disponíveis"}.
            </p>
          )}
          {report.total !== null && (
            <p className="car-registration-note">
              Total do território publicado pela fonte, independente dos rankings parciais por
              modelo. Inclui apenas automóveis.
            </p>
          )}
        </>
      )}
      <div className="car-registration-footer">
        <a
          href={`${report.source.url}#page=${report.source.pdfPage}`}
          target="_blank"
          rel="noreferrer"
        >
          {report.source.name} <ExternalLink size={12} />
        </a>
        {onViewModels && (
          <button type="button" className="text-button" onClick={onViewModels}>
            Ver emplacamentos <ArrowRight size={13} />
          </button>
        )}
      </div>
    </section>
  );
}
