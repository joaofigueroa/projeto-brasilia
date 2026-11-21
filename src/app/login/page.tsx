import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "@/components/login-form";
import { getViewer } from "@/server/security/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  if (await getViewer()) redirect("/tarefas");
  const params = await searchParams;
  return (
    <main className="login-page">
      <section className="login-story">
        <Brand />
        <div className="login-art" aria-hidden="true">
          <svg viewBox="0 0 600 620" fill="none" aria-hidden="true">
            <path
              d="M100 620V265c0-110 90-200 200-200s200 90 200 200v355"
              stroke="currentColor"
              strokeWidth="1"
            />
            <path
              d="M145 620V265c0-86 69-155 155-155s155 69 155 155v355M190 620V265a110 110 0 0 1 220 0v355M235 620V265a65 65 0 0 1 130 0v355"
              stroke="currentColor"
              strokeWidth="1"
            />
            <circle cx="300" cy="265" r="20" fill="currentColor" />
            <path d="M0 490h600M0 535h600M0 580h600" stroke="currentColor" strokeWidth="1" />
          </svg>
          <span className="art-orbit art-orbit-one" />
          <span className="art-orbit art-orbit-two" />
        </div>
        <div className="login-story-copy">
          <span className="login-story-kicker">PROJETO BRASÍLIA</span>
          <h2>
            Gestão de tarefas
            <br />e projetos.
          </h2>
          <p>Consulte as tarefas da semana, acompanhe os status e gerencie os responsáveis.</p>
        </div>
        <span className="login-story-footer">Tarefas organizadas por semana e projeto.</span>
      </section>
      <section className="login-main">
        <div className="login-mobile-brand">
          <Brand />
        </div>
        <LoginForm emailChanged={params.updated === "email"} />
        <footer>
          Brasília<span>Gestão de tarefas e projetos.</span>
        </footer>
      </section>
    </main>
  );
}
