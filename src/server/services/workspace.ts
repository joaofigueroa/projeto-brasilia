import "server-only";
import { listProjects } from "@/server/repositories/projects";
import { requireViewer } from "@/server/security/session";

export async function getWorkspace() {
  const viewer = await requireViewer();
  const projects = await listProjects();
  return { viewer, projects };
}
