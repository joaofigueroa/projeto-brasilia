import "server-only";
import { selectCommercialResearch } from "@/libs/commercial-research";
import { readCommercialResearch } from "@/server/repositories/commercial-research";
import type { Territory } from "@/types/intelligence";

// Called after authentication and project resolution in getIntelligence.
export function getCommercialResearch(projectId: string, territory: Territory) {
  return selectCommercialResearch(readCommercialResearch(), projectId, territory);
}
