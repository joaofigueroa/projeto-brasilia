"use server";
import { revalidatePath } from "next/cache";
import {
  importIntelligenceRecords,
  saveAnalysisTab,
  saveIntelligenceRecord,
} from "@/server/services/intelligence";
import { actionResult } from "./result";
export async function saveAnalysisTabAction(input: unknown) {
  return actionResult(async () => {
    const id = await saveAnalysisTab(input);
    revalidatePath("/inteligencia");
    return id;
  });
}
export async function saveIntelligenceRecordAction(input: unknown) {
  return actionResult(async () => {
    const id = await saveIntelligenceRecord(input);
    revalidatePath("/inteligencia");
    return id;
  });
}
export async function importIntelligenceRecordsAction(input: unknown) {
  return actionResult(async () => {
    const count = await importIntelligenceRecords(input);
    revalidatePath("/inteligencia");
    return count;
  });
}
