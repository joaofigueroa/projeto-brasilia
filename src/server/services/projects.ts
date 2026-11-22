import "server-only";
import { v7 } from "uuid";
import { insertProject, listProjects, updateProject } from "@/server/repositories/projects";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import { projectFieldsSchema, updateProjectSchema } from "@/validators/projects";

async function requireAdmin() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin")
    throw businessError("Somente administradores podem gerenciar projetos.");
  return viewer;
}
export async function getProjectManagement() {
  const viewer = await requireAdmin();
  return { viewer, projects: await listProjects() };
}
export async function createProject(raw: unknown) {
  const viewer = await requireAdmin();
  const input = projectFieldsSchema.parse(raw);
  const id = v7();
  const base =
    input.name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 64) || "projeto";
  const projects = await listProjects();
  const project = await insertProject({
    ...input,
    id,
    slug: `${base}-${id}`,
    color: ["lilac", "rose", "blue"][projects.length % 3],
    actorId: viewer.id,
    tabs: [
      { name: "Mercado endereçável", kind: "market" },
      { name: "Possíveis clientes", kind: "prospects" },
      { name: "Editais", kind: "opportunities" },
      { name: "Abordagem", kind: "notes" },
    ].map((tab, position) => ({ ...tab, id: v7(), position })),
  });
  if (!project) throw businessError("Seu acesso de administrador mudou. Atualize a página.");
  return project;
}
export async function saveProject(raw: unknown) {
  const viewer = await requireAdmin();
  const input = updateProjectSchema.parse(raw);
  const project = await updateProject({ ...input, actorId: viewer.id });
  if (!project)
    throw businessError(
      "O projeto foi alterado por outra pessoa ou seu acesso mudou. Reabra a edição antes de salvar.",
    );
  return project;
}
