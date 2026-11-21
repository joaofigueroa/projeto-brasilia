import { Sidebar } from "@/components/sidebar";
import { getWorkspace } from "@/server/services/workspace";

export const dynamic = "force-dynamic";
const mainContentId = "main-content";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { viewer } = await getWorkspace();
  return (
    <div className="workspace-layout">
      <a className="skip-link" href={`#${mainContentId}`}>
        Pular para o conteúdo
      </a>
      <Sidebar viewer={viewer} />
      <main className="main-area" id={mainContentId}>
        {children}
      </main>
    </div>
  );
}
