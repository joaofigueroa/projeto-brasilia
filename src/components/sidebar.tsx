"use client";
import {
  ArrowUpRight,
  CarFront,
  Check,
  ChevronDown,
  FolderKanban,
  LayoutGrid,
  LogOut,
  Menu,
  Sparkles,
  UserRound,
  Users,
  Wine,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { authClient } from "@/libs/auth-client";
import type { Project, PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";
import { Brand } from "./brand";

const projectIcons = [Sparkles, Wine, CarFront];

export function Sidebar({ viewer, projects }: { viewer: PublicUser; projects: Project[] }) {
  const pathname = usePathname();
  const switcherId = useId();
  const params = useSearchParams();
  const [expanded, setExpanded] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { navigate, router } = useNavigation();
  const selected = projects.find((project) => project.id === params.get("project"));
  const links = [
    { href: "/tarefas", label: "Tarefas", Icon: FolderKanban },
    { href: "/pessoas", label: "Pessoas", Icon: Users },
    { href: "/perfil", label: "Meu perfil", Icon: UserRound },
  ];
  function selectProject(id: string | null) {
    navigate({ project: id, task: null }, "/tarefas");
    setSwitcherOpen(false);
    setExpanded(false);
  }
  async function signOut() {
    setSigningOut(true);
    const result = await authClient.signOut();
    if (result.error) {
      setSigningOut(false);
      return;
    }
    router.push("/login");
    router.refresh();
  }
  return (
    <>
      <div className="mobile-bar">
        <Link href="/tarefas" aria-label="Brasília, início">
          <Brand />
        </Link>
        <button
          type="button"
          className="icon-button"
          aria-label="Abrir menu"
          onClick={() => setExpanded(true)}
        >
          <Menu />
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.button
            className="sidebar-scrim"
            aria-label="Fechar menu"
            onClick={() => setExpanded(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <aside className={`sidebar ${expanded ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <Link href="/tarefas" aria-label="Brasília, início">
            <Brand />
          </Link>
          <button
            className="icon-button mobile-close"
            type="button"
            onClick={() => setExpanded(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>
        <div className="workspace-switcher">
          <button
            type="button"
            className={`workspace-button ${switcherOpen ? "is-open" : ""}`}
            onClick={() => setSwitcherOpen(!switcherOpen)}
            aria-expanded={switcherOpen}
            aria-controls={switcherId}
          >
            <span className="workspace-icon">
              <LayoutGrid size={19} />
            </span>
            <span>
              <small>Seu espaço</small>
              <strong>{selected?.name ?? "Todos os projetos"}</strong>
            </span>
            <ChevronDown size={16} />
          </button>
          <AnimatePresence>
            {switcherOpen && (
              <motion.div
                id={switcherId}
                className="switcher-menu"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <button type="button" onClick={() => selectProject(null)}>
                  <LayoutGrid size={17} />
                  Todos os projetos{!selected && <Check size={16} />}
                </button>
                {projects.map((project) => (
                  <button type="button" key={project.id} onClick={() => selectProject(project.id)}>
                    <span className={`project-square project-${project.color}`} />
                    {project.name}
                    {selected?.id === project.id && <Check size={16} />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <nav aria-label="Navegação principal">
          <span className="nav-label">ESPAÇO DE TRABALHO</span>
          <div className="nav-links">
            {links.map(({ href, label, Icon }) => (
              <Link
                key={href}
                className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
                href={`${href}${href === "/tarefas" && selected ? `?project=${selected.id}` : ""}`}
                onClick={() => setExpanded(false)}
              >
                {pathname.startsWith(href) && (
                  <motion.span layoutId="active-nav" className="nav-active-bg" />
                )}
                <Icon size={19} />
                <span>{label}</span>
                {pathname.startsWith(href) && <span className="nav-active-marker" />}
              </Link>
            ))}
          </div>
        </nav>
        <div className="sidebar-projects">
          <span className="nav-label">
            PROJETOS <span>{projects.length}</span>
          </span>
          {projects.map((project, index) => {
            const Icon = projectIcons[index] ?? LayoutGrid;
            return (
              <button
                key={project.id}
                type="button"
                className={`project-link ${selected?.id === project.id ? "selected" : ""}`}
                onClick={() => selectProject(selected?.id === project.id ? null : project.id)}
                aria-pressed={selected?.id === project.id}
              >
                <span className={`project-icon project-${project.color}`}>
                  <Icon size={17} />
                </span>
                <span>{project.name}</span>
                {selected?.id === project.id && <Check size={15} />}
              </button>
            );
          })}
        </div>
        <div className="sidebar-bottom">
          <div className="workspace-note">
            <span className="note-spark">
              <Sparkles size={19} />
            </span>
            <strong>Juntos, a gente faz.</strong>
            <p>
              Cada entrega é um passo
              <br />
              para o próximo capítulo.
            </p>
            <span className="note-arc" aria-hidden="true" />
          </div>
          <div className="sidebar-account">
            <Link href="/perfil" onClick={() => setExpanded(false)}>
              <Avatar user={viewer} />
              <span>
                <strong>{viewer.name.split(" ").slice(0, 2).join(" ")}</strong>
                <small>{viewer.role === "admin" ? "Administrador" : "Colaborador"}</small>
              </span>
            </Link>
            <button
              className="icon-button"
              type="button"
              aria-label="Sair da conta"
              disabled={signingOut}
              onClick={signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
          <span className="sidebar-footer">
            Seu próximo passo começa aqui.
            <ArrowUpRight size={12} />
          </span>
        </div>
      </aside>
    </>
  );
}
