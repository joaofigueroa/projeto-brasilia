import "server-only";
import nationalSource from "@/data/official/car-models.json";
import regionalSource from "@/data/official/regional-car-models.json";
import type { CarModelCoverage, Territory } from "@/types/intelligence";

type Publication = {
  year: number;
  uf: string | null;
  sourceName: string;
  sourceUrl: string;
  rows: { make: string; model: string; value: number | null; issue?: string }[];
};
const national: Publication[] = Object.entries(nationalSource).map(([year, data]) => ({
  ...data,
  year: Number(year),
  uf: null,
}));
const regional: Publication[] = regionalSource.publications;

export function getPublishedCarModels(
  territory: Territory,
  years: number[],
  measure: "sales" | "registrations",
): { publications: Publication[]; coverage: CarModelCoverage } {
  // Brasília (5300108) is the IBGE cadastral representation of the entire DF,
  // not an administrative region. Other municipalities never inherit a UF total.
  const isFederalDistrict =
    territory.uf === "DF" && (!territory.city || territory.city === "5300108");
  const matching =
    territory.level === "country"
      ? national
      : isFederalDistrict
        ? regional.filter((item) => item.uf === "DF")
        : [];
  const available = measure === "registrations" ? matching : [];
  const availableYears = [...new Set(available.map((item) => item.year))].sort((a, b) => a - b);
  const publications = available.filter((item) => years.includes(item.year));
  const notes =
    measure === "sales"
      ? [
          "Vendas informadas usam apenas registros locais cadastrados com fonte. Os boletins públicos carregados medem emplacamentos de veículos novos.",
        ]
      : territory.level === "country"
        ? ["Fenabrave nacional: 50 automóveis por ano. Ausência no ranking não significa zero."]
        : isFederalDistrict
          ? [
              "Sincodiv-DF: emplacamentos de veículos novos no Distrito Federal, também exibidos no recorte cadastral Brasília (IBGE 5300108), que abrange todo o DF. Publicação setorial; não é uma base governamental de vendas.",
              "Somente a seção AUTOMÓVEIS da publicação. A classificação pode variar entre fontes e anos; modelos classificados como comerciais leves naquela edição ficam excluídos. Uma ausência não é tratada como zero.",
              "No mapa municipal, Brasília (IBGE 5300108) representa todo o DF. Estes dados não são um recorte do Plano Piloto nem das regiões administrativas.",
            ]
          : [
              "Nenhuma série aberta de emplacamentos por modelo foi carregada para este território. A base pública Senatran por marca/modelo mede estoque de frota, não vendas anuais.",
            ];
  if (publications.some((p) => p.rows.some((row) => row.issue)))
    notes.push(
      "O boletim de 2023 apresenta divergência entre o total anual e a soma mensal do Honda Civic. Essa observação fica sem valor, identificada para revisão, e não entra na consolidação.",
    );
  return {
    publications,
    coverage: {
      availableYears,
      missingYears: years.filter((year) => !availableYears.includes(year)),
      notes,
      sources: publications.map((item) => ({
        name: `${item.sourceName} · ${item.year}`,
        url: item.sourceUrl,
      })),
    },
  };
}
