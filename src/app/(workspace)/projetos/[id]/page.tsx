import { ArrowLeft, FolderOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProjectFiles } from "@/components/project-files";
import { ProjectImage } from "@/components/project-image";
import { Topbar } from "@/components/topbar";
import { requireViewer } from "@/server/security/session";
import { getProjectFiles } from "@/server/services/projects";

export const metadata: Metadata = { title: "Arquivos do projeto" };

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string; size?: string }>;
}) {
  const viewer = await requireViewer();
  if (viewer.role !== "admin") redirect("/tarefas");
  const [{ id }, { page, size }] = await Promise.all([params, searchParams]);
  const data = await getProjectFiles({ id, page, size });
  if (!data) notFound();

  return (
    <>
      <Topbar title="Projetos" viewer={viewer} />
      <div className="page-content projects-page project-detail">
        <Link className="prospect-back" href="/projetos">
          <ArrowLeft size={15} /> Voltar aos projetos
        </Link>
        <header className="workspace-page-heading project-detail-heading">
          <ProjectImage project={data.project} size="lg" />
          <div>
            <h1>{data.project.name}</h1>
            {data.project.description && (
              <p className="projects-description">{data.project.description}</p>
            )}
          </div>
        </header>
        <nav className="project-detail-nav" aria-label="Seções do projeto">
          <Link href={`/projetos/${data.project.id}`} aria-current="page">
            <FolderOpen size={16} /> Arquivos
          </Link>
        </nav>
        <ProjectFiles
          projectId={data.project.id}
          files={data.files}
          storageConfigured={data.storageConfigured}
        />
      </div>
    </>
  );
}
