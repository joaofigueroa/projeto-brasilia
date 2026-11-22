import "server-only";
import { getPublishedCarModels } from "@/server/integrations/published-car-models";
import type {
  CarModelReport,
  CarModelRow,
  IntelligenceRecord,
  Territory,
} from "@/types/intelligence";

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
export function isCarModelRecord(record: IntelligenceRecord) {
  return (
    ["automovel", "automoveis", "carro", "carros", "car"].includes(
      normalize(record.details.vehicleType ?? ""),
    ) &&
    Boolean(record.details.make?.trim() && record.details.model?.trim()) &&
    (record.metric === "sales" || record.metric === "registrations") &&
    record.value !== null
  );
}
export function getCarModelReport(
  records: IntelligenceRecord[],
  territory: Territory,
  years: number[],
  measure: "sales" | "registrations",
): CarModelReport {
  const eligible = records.filter(
    (record) =>
      isCarModelRecord(record) && record.metric === measure && years.includes(record.year),
  );
  const published = getPublishedCarModels(territory, years, measure);
  const grouped = new Map<
    string,
    { row: CarModelRow; observations: Map<number, { value: number | null; issue?: string }[]> }
  >();
  function add(input: {
    make: string;
    model: string;
    category: string;
    region: string | null;
    uf: string | null;
    city: string | null;
    territoryLabel: string;
    year: number;
    value: number | null;
    issue?: string;
    unit: string;
    sourceName: string;
    sourceUrl: string;
  }) {
    const key = JSON.stringify([
      input.region,
      input.uf,
      input.city,
      normalize(input.make),
      normalize(input.model),
      input.category,
      input.unit,
      input.sourceName,
    ]);
    let item = grouped.get(key);
    if (!item) {
      item = {
        row: {
          key,
          make: input.make,
          model: input.model,
          category: input.category,
          territoryLabel: input.territoryLabel,
          sourceName: input.sourceName,
          unit: input.unit,
          values: [],
          total: null,
          average: null,
          complete: false,
          sources: [],
        },
        observations: new Map(),
      };
      grouped.set(key, item);
    }
    const values = item.observations.get(input.year) ?? [];
    values.push({ value: input.value, issue: input.issue });
    item.observations.set(input.year, values);
    if (input.sourceUrl && !item.row.sources.some((s) => s.url === input.sourceUrl))
      item.row.sources.push({
        name: input.sourceUrl.includes("fenabrave.org.br")
          ? `${input.sourceName} · ${input.year}`
          : input.sourceName,
        url: input.sourceUrl,
      });
  }
  for (const record of eligible)
    add({
      make: record.details.make,
      model: record.details.model,
      category: record.category,
      region: record.regionCode,
      uf: record.stateCode,
      city: record.municipalityCode,
      territoryLabel: record.territoryLabel,
      year: record.year,
      value: record.value ?? 0,
      unit: record.unit,
      sourceName: record.sourceName,
      sourceUrl: record.sourceUrl,
    });
  for (const data of published.publications) {
    for (const row of data.rows)
      add({
        ...row,
        category: "Automóveis",
        region: data.uf ? territory.region : null,
        uf: data.uf,
        city: null,
        territoryLabel: data.uf === "DF" ? "Distrito Federal · área integral" : "Brasil",
        year: data.year,
        unit: "automóveis",
        sourceName: data.sourceName,
        sourceUrl: data.sourceUrl,
      });
  }
  const rows = [...grouped.values()]
    .map(({ row, observations }) => {
      row.values = years.map((year) => {
        const values = observations.get(year) ?? [];
        return {
          year,
          value: values.length === 1 ? values[0].value : null,
          ambiguous: values.length > 1,
          issue: values.find((value) => value.issue)?.issue,
        };
      });
      const values = row.values.flatMap((r) => (r.value === null ? [] : [r.value]));
      row.complete = values.length === years.length;
      // Quantities are consolidated only within a single source and exact geographic level.
      row.total = values.length ? values.reduce((a, b) => a + b, 0) : null;
      row.average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
      return row;
    })
    .sort((a, b) => (b.total ?? 0) - (a.total ?? 0) || a.model.localeCompare(b.model, "pt-BR"));
  return {
    rows,
    recordIds: eligible.map((record) => record.id),
    excluded: records.filter((r) => !isCarModelRecord(r) || r.metric !== measure).length,
    officialAvailable: published.coverage.availableYears.length > 0,
    officialYears: published.publications.map((item) => item.year),
    measure,
    coverage: published.coverage,
  };
}
