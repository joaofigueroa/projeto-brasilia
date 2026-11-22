"use server";
import { revalidatePath } from "next/cache";
import { createProject, saveProject } from "@/server/services/projects";
import { actionResult } from "./result";
export async function createProjectAction(input: unknown) {
  return actionResult(async () => {
    const project = await createProject(input);
    revalidatePath("/", "layout");
    return project.id;
  });
}
export async function saveProjectAction(input: unknown) {
  return actionResult(async () => {
    const project = await saveProject(input);
    revalidatePath("/", "layout");
    return project.id;
  });
}
