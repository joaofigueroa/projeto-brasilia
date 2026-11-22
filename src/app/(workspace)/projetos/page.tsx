import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Projects } from "@/components/projects";
import { Topbar } from "@/components/topbar";
import { requireViewer } from "@/server/security/session";
import { getProjectManagement } from "@/server/services/projects";
export const metadata: Metadata = { title: "Projetos" };
export default async function ProjectsPage() {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/tarefas");
  const data = await getProjectManagement();
  return (
    <>
      <Topbar title="Projetos" viewer={data.viewer} />
      <Projects projects={data.projects} />
    </>
  );
}
