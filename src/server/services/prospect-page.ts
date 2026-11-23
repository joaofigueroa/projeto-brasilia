import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  findResearchProfileById,
  findResearchProfiles,
  readCommercialResearch,
} from "@/server/repositories/commercial-research";
import { listAnalysisTabs } from "@/server/repositories/intelligence";
import { listProjects } from "@/server/repositories/projects";
import { isProspectFavorite, setProspectFavorite } from "@/server/repositories/prospect-favorites";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import { prospectFavoriteSchema, prospectPageInputSchema } from "@/validators/prospect-page";
import { getProspectCrm } from "./prospect-crm";
export const getProspectPage = cache(async (id: string, projectId: string) => {
  const viewer = await requireViewer();
  const parsed = prospectPageInputSchema.safeParse({ id, projectId });
  if (!parsed.success) return null;
  const [projects, prospect, tabs] = await Promise.all([
    listProjects(),
    z.uuid().safeParse(id).success
      ? findResearchProfileById(projectId, id)
      : findResearchProfiles(projectId, [id]).then((rows) => rows[0] ?? null),
    listAnalysisTabs(projectId),
  ]);
  const project = projects.find((item) => item.id === projectId);
  if (!project || !prospect?.databaseId) return null;
  const favorite = await isProspectFavorite(viewer.id, prospect.databaseId);
  const crm = await getProspectCrm({ projectId, prospectId: prospect.databaseId });
  const params = new URLSearchParams({
    project: project.id,
    uf: prospect.state,
    city: prospect.cityCode,
  });
  const tab = tabs.find((item) => item.kind === "prospects");
  if (tab) params.set("tab", tab.id);
  return {
    viewer,
    project,
    prospect: { ...prospect, isFavorite: favorite },
    crm,
    products: readCommercialResearch().products,
    defaultBackHref: `/inteligencia?${params}`,
  };
});
export async function favoriteProspect(raw: unknown) {
  const input = prospectFavoriteSchema.parse(raw);
  const viewer = await requireViewer();
  const saved = await setProspectFavorite({ ...input, userId: viewer.id });
  if (!saved)
    throw businessError("Este perfil não está disponível neste projeto. Atualize a página.");
  return { favorite: input.favorite };
}
