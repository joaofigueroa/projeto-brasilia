import geography from "@/data/official/territories.json";
import type { Territory } from "@/types/intelligence";

export const regions = [
  { code: "1", name: "Norte" },
  { code: "2", name: "Nordeste" },
  { code: "3", name: "Sudeste" },
  { code: "4", name: "Sul" },
  { code: "5", name: "Centro-Oeste" },
];
export const states = geography.states.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
export const cities = geography.cities;
export function resolveTerritory(input: {
  region?: string;
  uf?: string;
  city?: string;
}): Territory {
  const state = input.uf ? states.find((s) => s.code === input.uf) : undefined;
  if (input.uf && !state) throw new Error("UF inválida.");
  const city = input.city
    ? cities.find((c) => c.code === input.city && c.state === state?.code)
    : undefined;
  if (input.city && !city) throw new Error("Município não pertence à UF selecionada.");
  const region =
    input.region && input.region !== "BR"
      ? regions.find((r) => r.code === input.region)
      : undefined;
  if (input.region && input.region !== "BR" && !region) throw new Error("Região inválida.");
  return {
    region: state?.region ?? region?.code ?? null,
    uf: state?.code ?? null,
    city: city?.code ?? null,
    label: city ? `${city.name} · ${state?.code}` : (state?.name ?? region?.name ?? "Brasil"),
    level: city ? "city" : state ? "state" : region ? "region" : "country",
  };
}
