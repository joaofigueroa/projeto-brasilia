import "server-only";
import dataset from "@/data/research/3c-automotive.json";
import { commercialResearchSchema } from "@/validators/commercial-research";

const research = commercialResearchSchema.parse(dataset);
export function readCommercialResearch() {
  return research;
}
