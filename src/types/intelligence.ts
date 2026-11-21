import type { Project, PublicUser } from "./domain";

export type AnalysisKind = "market" | "prospects" | "vehicles" | "opportunities" | "notes";
export type MetricKind = "context" | "market_size" | "fleet" | "sales" | "registrations";
export type AnalysisTab = {
  id: string;
  projectId: string;
  name: string;
  kind: AnalysisKind;
  position: number;
  settings: { segments: string[]; keywords: string[] };
  version: number;
};
export type Territory = {
  region: string | null;
  uf: string | null;
  city: string | null;
  label: string;
  level: "country" | "region" | "state" | "city";
};
export type IntelligenceRecord = {
  id: string;
  tabId: string;
  title: string;
  category: string;
  metric: MetricKind;
  value: number | null;
  unit: string;
  year: number;
  regionCode: string | null;
  stateCode: string | null;
  municipalityCode: string | null;
  territoryLabel: string;
  sourceName: string;
  sourceUrl: string;
  notes: string;
  status: "new" | "contacted" | "qualified" | "discarded";
  details: Record<string, string>;
  version: number;
  updatedAt: string;
};
export type OfficialContext = {
  population: number | null;
  fleet: number | null;
  types: { label: string; value: number }[];
  series: { year: number; value: number }[];
  municipalities: number;
  coveredMunicipalities: number;
};
export type PublicNotice = {
  id: string;
  title: string;
  organization: string;
  city: string;
  value: number | null;
  publishedAt: string;
  url: string;
};
export type NoticeResult = {
  items: PublicNotice[];
  consulted: number;
  total: number;
  from: string;
  to: string;
  unavailable: boolean;
  terms: string[];
  periods?: {
    year: number;
    from: string;
    to: string;
    consulted: number;
    total: number;
    unavailable: boolean;
  }[];
};
export type IntelligenceData = {
  viewer: PublicUser;
  projects: Project[];
  project: Project;
  tabs: AnalysisTab[];
  tab: AnalysisTab;
  territory: Territory;
  year: number;
  years: number[];
  mapView: "states" | "municipalities";
  municipalMap: MunicipalMap | null;
  models: CarModelReport;
  metric: MetricKind;
  records: IntelligenceRecord[];
  official: OfficialContext;
  notices: NoticeResult | null;
  states: {
    code: string;
    name: string;
    region: string;
    regionName: string;
    population: number | null;
    fleet: number | null;
  }[];
  cities: { code: string; name: string; population: number | null; fleet: number | null }[];
};

export type MunicipalMap = {
  state: string;
  features: { code: string; name: string; path: string; center: number[] }[];
};
export type CarModelRow = {
  key: string;
  make: string;
  model: string;
  category: string;
  territoryLabel: string;
  sourceName: string;
  unit: string;
  values: { year: number; value: number | null; ambiguous: boolean }[];
  total: number | null;
  average: number | null;
  complete: boolean;
  sources: { name: string; url: string }[];
};
export type CarModelReport = {
  rows: CarModelRow[];
  recordIds: string[];
  excluded: number;
  officialAvailable: boolean;
  officialYears: number[];
  measure: "sales" | "registrations";
};
