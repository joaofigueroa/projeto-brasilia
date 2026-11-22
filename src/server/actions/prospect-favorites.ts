"use server";
import { revalidatePath } from "next/cache";
import { favoriteProspect } from "@/server/services/prospect-page";
import { actionResult } from "./result";
export async function favoriteProspectAction(input: unknown) {
  return actionResult(async () => {
    const result = await favoriteProspect(input);
    revalidatePath("/inteligencia");
    revalidatePath("/clientes/[id]", "page");
    return result;
  });
}
