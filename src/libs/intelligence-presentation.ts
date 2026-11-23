import type { AnalysisKind, MetricKind } from "@/types/intelligence";
export const analysisLabels: Record<AnalysisKind, string> = {
  market: "Mercado endereçável",
  prospects: "Possíveis clientes",
  favorites: "Clientes favoritados",
  crm: "Acompanhamento",
  vehicles: "Veículos",
  opportunities: "Editais e oportunidades",
  notes: "Análise e abordagem",
  commercial: "Inteligência comercial",
};
export const metricLabels: Record<MetricKind, string> = {
  context: "Registro qualitativo",
  market_size: "Estimativa de mercado",
  fleet: "Frota registrada",
  sales: "Vendas",
  registrations: "Emplacamentos",
};
export const prospectLabels = {
  new: "A mapear",
  contacted: "Contatado",
  qualified: "Qualificado",
  discarded: "Descartado",
};
export const formatNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(value);
export const compactNumber = (value: number) =>
  new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value);
