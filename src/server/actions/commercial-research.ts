"use server";
import { revalidatePath } from "next/cache";
import {
  generateCityAnalysis,
  processCityResearch,
  saveProspectGoogleNote,
  startCityResearch,
  updateResearchedProfile,
} from "@/server/services/commercial-research";
import { connectResearchAi } from "@/server/services/research-ai";
import { actionResult } from "./result";
export async function connectResearchAiAction(input: unknown) {
  return actionResult(async () => {
    const result = await connectResearchAi(input);
    revalidatePath("/inteligencia");
    return result;
  });
}
export async function startCityResearchAction(input: unknown) {
  return actionResult(() => startCityResearch(input));
}
export async function processCityResearchAction(input: unknown) {
  return actionResult(async () => {
    const result = await processCityResearch(input);
    if (result?.status === "completed") revalidatePath("/inteligencia");
    return result;
  });
}
export async function generateCityAnalysisAction(input: unknown) {
  return actionResult(async () => {
    const result = await generateCityAnalysis(input);
    revalidatePath("/inteligencia");
    return result;
  });
}
export async function saveProspectGoogleNoteAction(input: unknown) {
  return actionResult(async () => {
    const result = await saveProspectGoogleNote(input);
    revalidatePath("/inteligencia");
    return result;
  });
}
export async function updateResearchedProfileAction(input: unknown) {
  return actionResult(async () => {
    const result = await updateResearchedProfile(input);
    revalidatePath("/inteligencia");
    return result;
  });
}
