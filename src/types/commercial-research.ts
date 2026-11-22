import type { z } from "zod";
import type { paginationRange } from "@/libs/pagination";
import type {
  commercialResearchSchema,
  researchListFiltersSchema,
  researchProspectSchema,
} from "@/validators/commercial-research";

export type CommercialResearch = z.infer<typeof commercialResearchSchema>;
export type ResearchProspect = z.infer<typeof researchProspectSchema>;
export type ResearchRegistry = NonNullable<ResearchProspect["registry"]>;
export type ResearchProduct = CommercialResearch["products"][number];
export type CommercialReport = CommercialResearch["reports"][number];
export type CommercialResearchView = Omit<CommercialResearch, "projectId"> & {
  coverage: { cityCode: string; cityName: string; state: string; count: number }[];
  live?: {
    pagination: ReturnType<typeof paginationRange>;
    filters: z.infer<typeof researchListFiltersSchema>;
    stats: {
      total: number;
      researched: number;
      primary: number;
      workshops: number;
      distributors: number;
      partsStores: number;
    };
    runs: ResearchRun[];
    reportReferences: ResearchProspect[];
    reports: {
      cityCode: string;
      createdAt: string;
      model: string;
      count: number;
      sampleSize: number;
    }[];
    ai: {
      configured: boolean;
      provider: "gemini" | "gateway" | null;
      model: string | null;
      version: number;
    };
  };
};
export type ResearchListFilters = z.infer<typeof researchListFiltersSchema>;
export type ResearchRun = {
  id: string;
  projectId: string;
  cityCode: string;
  kind: "census" | "analysis";
  status: "pending" | "running" | "completed" | "failed";
  source: string;
  sourceMonth: string;
  cursor: number;
  total: number | null;
  phase: string;
  pendingRows: Record<string, string | null>[];
  leaseToken: string | null;
  leaseUntil: string | null;
  message: string;
  createdAt: string;
  updatedAt: string;
};
