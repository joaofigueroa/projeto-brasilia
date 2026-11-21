import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { ZodError } from "zod";
import type { ActionResult } from "@/types/domain";

export async function actionResult<T>(operation: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { success: true, data: await operation() };
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof ZodError)
      return { success: false, error: error.issues[0]?.message ?? "Confira os dados informados." };
    const code =
      (error as { code?: string; cause?: { code?: string } })?.cause?.code ??
      (error as { code?: string })?.code;
    if (code === "23505") return { success: false, error: "Já existe uma pessoa com esse e-mail." };
    if (error instanceof Error && error.name === "BusinessError")
      return { success: false, error: error.message };
    return {
      success: false,
      error: "Não foi possível salvar agora. Tente novamente em instantes.",
    };
  }
}
