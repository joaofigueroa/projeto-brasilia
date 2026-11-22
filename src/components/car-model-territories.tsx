"use client";
import { useId } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { usePagination } from "@/hooks/use-pagination";
import type { CarModelCoverage, Territory } from "@/types/intelligence";
import { Pagination } from "./pagination";
import { StateFlag } from "./state-flag";

export function CarModelTerritories({
  coverage,
  years,
  territory,
  controller,
}: {
  coverage: CarModelCoverage;
  years: number[];
  territory: Territory;
  controller: IntelligenceController;
}) {
  const id = useId();
  const pagination = usePagination(coverage.targets, years.join(","), 10);
  const statesWithData = coverage.targets.filter((target) =>
    target.stateYears.some((year) => years.includes(year)),
  ).length;
  const capitalsWithData = coverage.targets.filter((target) =>
    target.capitalYears.some((year) => years.includes(year)),
  ).length;
  function select(uf: string, city: string | null) {
    controller.navigate({ region: null, uf, city, map: city ? "municipalities" : "states" });
  }
  function yearCells(available: number[]) {
    return (
      <span className="vehicle-coverage-years">
        {years.map((year) => (
          <span key={year} className={available.includes(year) ? "available" : "missing"}>
            {year}
            <span>{available.includes(year) ? "Publicação" : "Sem publicação"}</span>
          </span>
        ))}
      </span>
    );
  }
  return (
    <section className="vehicle-territories" aria-labelledby={id}>
      <h4 id={id} tabIndex={-1}>
        Cobertura das publicações
      </h4>
      <p>
        No período selecionado: <strong>{statesWithData} de 27 UFs</strong> e{" "}
        <strong>{capitalsWithData} de 27 capitais</strong> com publicação por modelo carregada. A
        cobertura de todos os territórios ainda está incompleta.
      </p>
      <p>
        Esta etapa inclui UFs e capitais. Os anos abaixo seguem o filtro da análise. Uma publicação
        pode conter apenas um ranking parcial; registros manuais não estão nesta contagem.
      </p>
      <div className="bi-model-table-scroll">
        <table className="bi-model-table vehicle-territories-table">
          <caption className="sr-only">
            Publicações de modelos de automóveis por UF, capital e ano selecionado
          </caption>
          <thead>
            <tr>
              <th scope="col">Unidade federativa</th>
              <th scope="col">Capital</th>
            </tr>
          </thead>
          <tbody>
            {pagination.items.map((target) => (
              <tr key={target.uf}>
                <td>
                  <button
                    type="button"
                    className="vehicle-territory-link"
                    aria-label={`Consultar veículos em ${target.stateName}`}
                    aria-current={
                      territory.uf === target.uf && !territory.city ? "location" : undefined
                    }
                    onClick={() => select(target.uf, null)}
                  >
                    <StateFlag code={target.uf} name={target.stateName} />
                    {target.stateName}
                  </button>
                  {yearCells(target.stateYears)}
                </td>
                <td>
                  <button
                    type="button"
                    className="vehicle-territory-link"
                    aria-label={`Consultar veículos em ${target.capitalName}`}
                    aria-current={territory.city === target.capitalCode ? "location" : undefined}
                    onClick={() => select(target.uf, target.capitalCode)}
                  >
                    {target.capitalName}
                  </button>
                  {yearCells(target.capitalYears)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination label="cobertura de UFs e capitais" targetId={id} {...pagination} />
      <p>
        Brasília (IBGE 5300108) representa todo o Distrito Federal. As demais capitais têm recortes
        próprios e não herdam os números da UF.
      </p>
    </section>
  );
}
