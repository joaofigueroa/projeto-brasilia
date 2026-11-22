import "server-only";
import { createGoogle } from "@ai-sdk/google";
import { automotiveProjectId } from "@/libs/company-census";
import {
  readResearchAiConnection,
  writeResearchAiConnection,
} from "@/server/repositories/research-ai";
import { businessError } from "@/server/security/business-error";
import { decryptResearchKey, encryptResearchKey } from "@/server/security/research-secrets";
import { requireViewer } from "@/server/security/session";
import { researchAiConnectionSchema } from "@/validators/commercial-research";
export async function researchAiStatus(projectId: string) {
  const connection = await readResearchAiConnection(projectId);
  if (connection)
    return {
      configured: true,
      provider: "gemini" as const,
      model: connection.model,
      version: connection.version,
    };
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY)
    return { configured: true, provider: "gemini" as const, model: "gemini-3.8-flash", version: 0 };
  if (process.env.AI_GATEWAY_API_KEY)
    return {
      configured: true,
      provider: "gateway" as const,
      model: process.env.AI_RESEARCH_MODEL ?? "anthropic/claude-haiku-5.5",
      version: 0,
    };
  return { configured: false, provider: null, model: null, version: 0 };
}
export async function researchLanguageModel(projectId: string) {
  const connection = await readResearchAiConnection(projectId);
  const apiKey = connection
    ? decryptResearchKey(connection.encryptedKey)
    : process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (apiKey) {
    const modelId = connection?.model ?? "gemini-3.8-flash";
    return { model: createGoogle({ apiKey })(modelId), name: `google/${modelId}` };
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    const model = process.env.AI_RESEARCH_MODEL ?? "anthropic/claude-haiku-5.5";
    return { model, name: model };
  }
  throw businessError(
    "Conecte uma chave gratuita do Gemini em Configurar IA para gerar novas análises.",
  );
}
export async function connectResearchAi(raw: unknown) {
  const input = researchAiConnectionSchema.parse(raw);
  const viewer = await requireViewer();
  if (viewer.role !== "admin" || input.projectId !== automotiveProjectId)
    throw businessError("Somente administradores podem conectar a IA deste projeto.");
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}`,
      {
        headers: { "x-goog-api-key": input.apiKey },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      },
    );
  } catch {
    throw businessError("Não foi possível verificar a chave com o Gemini. Tente novamente.");
  }
  if (!response.ok)
    throw businessError(
      "A chave não tem acesso ao modelo escolhido. Confira o projeto e a disponibilidade no AI Studio.",
    );
  const saved = await writeResearchAiConnection({
    projectId: input.projectId,
    actorId: viewer.id,
    encryptedKey: encryptResearchKey(input.apiKey),
    model: input.model,
    version: input.version,
  });
  if (!saved.length)
    throw businessError(
      "A conexão foi alterada por outra pessoa. Reabra as configurações antes de salvar.",
    );
  return {
    configured: true,
    provider: "gemini" as const,
    model: input.model,
    version: input.version + 1,
  };
}
