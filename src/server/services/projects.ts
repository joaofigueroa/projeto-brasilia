import "server-only";
import { v7 } from "uuid";
import { neonStorageConfigured } from "@/server/integrations/neon-storage";
import { insertProject, listProjects, updateProject } from "@/server/repositories/projects";
import {
  insertProjectFileFolder,
  listProjectFileFolders,
  listProjectFiles,
  moveProjectAttachments,
  updateProjectFileFolderName,
} from "@/server/repositories/workspace-attachments";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import { projectFieldsSchema, updateProjectSchema } from "@/validators/projects";
import {
  createFileFolderSchema,
  moveProjectFileSchema,
  moveProjectFilesSchema,
  projectFileListSchema,
  renameFileFolderSchema,
} from "@/validators/workspace-attachment";

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
export async function getProjectFiles(raw: unknown) {
  const viewer = await requireAdmin();
  const input = projectFileListSchema.safeParse(raw);
  if (!input.success) return null;
  const { id, folderId, page, size, q } = input.data;
  const [projects, folders] = await Promise.all([listProjects(), listProjectFileFolders(id)]);
  const project = projects.find((item) => item.id === id);
  if (!project) return null;
  const folder = folders.find((item) => item.id === folderId) ?? null;
  if (folderId && !folder) return null;
  return {
    viewer,
    project,
    folders,
    folder,
    search: q,
    files: await listProjectFiles(project.id, folderId, page, size, q),
    storageConfigured: neonStorageConfigured(),
  };
}
export async function createProjectFileFolder(raw: unknown) {
  const viewer = await requireAdmin();
  const input = createFileFolderSchema.parse(raw);
  const result = await insertProjectFileFolder({ ...input, actorId: viewer.id });
  if (!result.allowed) throw businessError("Pasta ou projeto indisponível. Confira seu acesso.");
  if (!result.id) throw businessError("Já existe uma pasta com esse nome neste local.");
  return { projectId: input.projectId, folderId: result.id };
}
export async function moveProjectFile(raw: unknown) {
  const { projectId, folderId, ...file } = moveProjectFileSchema.parse(raw);
  return moveProjectFiles({ projectId, folderId, files: [file] });
}
export async function moveProjectFiles(raw: unknown) {
  const viewer = await requireAdmin();
  const input = moveProjectFilesSchema.parse(raw);
  const result = await moveProjectAttachments({ ...input, actorId: viewer.id });
  if (result.matched !== input.files.length)
    throw businessError("Não foi possível mover a seleção. Atualize a lista e confira o destino.");
  return { projectId: input.projectId, count: result.changed };
}
export async function renameProjectFileFolder(raw: unknown) {
  const viewer = await requireAdmin();
  const input = renameFileFolderSchema.parse(raw);
  try {
    const folder = await updateProjectFileFolderName({ ...input, actorId: viewer.id });
    if (!folder) throw businessError("A pasta mudou. Atualize a lista e tente novamente.");
    return { projectId: input.projectId };
  } catch (error) {
    const failure = error as { code?: string; cause?: { code?: string } };
    if ((failure.cause?.code ?? failure.code) === "23505")
      throw businessError("Já existe uma pasta com esse nome neste local.");
    throw error;
  }
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
