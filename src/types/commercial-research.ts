import type { z } from "zod";
import type {
  commercialResearchSchema,
  researchProspectSchema,
} from "@/validators/commercial-research";

export type CommercialResearch = z.infer<typeof commercialResearchSchema>;
export type ResearchProspect = z.infer<typeof researchProspectSchema>;
export type ResearchRegistry = NonNullable<ResearchProspect["registry"]>;
export type ResearchProduct = CommercialResearch["products"][number];
export type CommercialReport = CommercialResearch["reports"][number];
export type CommercialResearchView = Omit<CommercialResearch, "projectId"> & {
  coverage: { cityCode: string; cityName: string; state: string; count: number }[];
};
