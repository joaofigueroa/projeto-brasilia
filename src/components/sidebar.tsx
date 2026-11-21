"use client";
import {
  FolderKanban,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { useNavigation } from "@/hooks/use-navigation";
import { authClient } from "@/libs/auth-client";
import type { PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";
import { Brand } from "./brand";

export function Sidebar({ viewer }: { viewer: PublicUser }) {
  const pathname = usePathname();
  const navigationId = useId();
  const [expanded, setExpanded] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const { router } = useNavigation();
  const links = [
    { href: "/tarefas", label: "Tarefas", Icon: FolderKanban },
    { href: "/pessoas", label: "Pessoas", Icon: Users },
    { href: "/perfil", label: "Meu perfil", Icon: UserRound },
  ];
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
          aria-expanded={expanded}
          aria-controls={navigationId}
          onClick={() => setExpanded(true)}
        >
          <Menu />
        </button>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.button
            type="button"
            className="sidebar-scrim"
            aria-label="Fechar menu"
            onClick={() => setExpanded(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </AnimatePresence>
      <aside
        className={`sidebar ${expanded ? "sidebar-open" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}
      >
        <div className="sidebar-brand">
          <Link href="/tarefas" aria-label="Brasília, início" title="Brasília">
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
        <div className="sidebar-navigation-heading">
          <span className="nav-label">NAVEGAÇÃO</span>
          <button
            className="icon-button sidebar-toggle"
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            aria-expanded={!collapsed}
            aria-controls={navigationId}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        </div>
        <nav id={navigationId} aria-label="Navegação principal">
          <div className="nav-links">
            {links.map(({ href, label, Icon }) => (
              <Link
                key={href}
                className={`nav-link ${pathname.startsWith(href) ? "active" : ""}`}
                href={href}
                aria-label={label}
                title={label}
                aria-current={pathname.startsWith(href) ? "page" : undefined}
                onClick={() => setExpanded(false)}
              >
                {pathname.startsWith(href) && (
                  <motion.span layoutId="active-nav" className="nav-active-bg" />
                )}
                <Icon size={19} />
                <span className="nav-link-label">{label}</span>
                {pathname.startsWith(href) && <span className="nav-active-marker" />}
              </Link>
            ))}
          </div>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-account">
            <Link
              href="/perfil"
              onClick={() => setExpanded(false)}
              aria-label={`Meu perfil: ${viewer.name}`}
              title={viewer.name}
            >
              <Avatar user={viewer} />
              <span className="sidebar-account-details">
                <strong>{viewer.name.split(" ").slice(0, 2).join(" ")}</strong>
                <small>{viewer.role === "admin" ? "Administrador" : "Colaborador"}</small>
              </span>
            </Link>
            <button
              className="icon-button"
              type="button"
              aria-label="Sair da conta"
              title="Sair da conta"
              disabled={signingOut}
              onClick={signOut}
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
