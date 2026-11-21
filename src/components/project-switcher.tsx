"use client";
import { Check, ChevronDown, Layers3 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigation } from "@/hooks/use-navigation";
import type { Project } from "@/types/domain";
export function ProjectSwitcher({
  projects,
  selectedId,
  onSelect,
}: {
  projects: Project[];
  selectedId: string | null;
  onSelect: () => void;
}) {
  const { navigate } = useNavigation();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const button = useRef<HTMLButtonElement>(null);
  const options = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = projects.find((p) => p.id === selectedId);
  const requiresProject = pathname === "/inteligencia";
  useEffect(() => {
    if (!open) return;
    options.current?.querySelector<HTMLButtonElement>('[aria-pressed="true"],button')?.focus();
    function close(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);
  function toggle() {
    const rect = button.current?.getBoundingClientRect();
    if (rect)
      setPosition({ left: Math.min(rect.left, window.innerWidth - 252), top: rect.bottom + 7 });
    setOpen(!open);
  }
  function select(project: string | null) {
    navigate({ project, tab: null, task: null });
    setOpen(false);
    onSelect();
    button.current?.focus();
  }
  return (
    <div className="project-switcher">
      <button
        ref={button}
        type="button"
        className="project-switcher-trigger"
        aria-label={`Selecionar projeto: ${selected?.name ?? "Todos os projetos"}`}
        title={selected?.name ?? "Todos os projetos"}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={toggle}
      >
        <span className={`project-switcher-icon project-${selected?.color ?? "lilac"}`}>
          <Layers3 size={19} />
        </span>
        <span className="project-switcher-label">
          <small>Projeto</small>
          <strong>{selected?.name ?? "Todos os projetos"}</strong>
        </span>
        <ChevronDown size={15} />
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <>
                <button
                  type="button"
                  className="project-switcher-backdrop"
                  aria-label="Fechar seleção de projeto"
                  onClick={() => {
                    setOpen(false);
                    button.current?.focus();
                  }}
                />
                <motion.div
                  ref={options}
                  id={id}
                  role="group"
                  aria-label="Projetos"
                  className="project-switcher-options"
                  style={position}
                  initial={{ opacity: 0, y: -5, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -5, scale: 0.98 }}
                >
                  <span className="project-switcher-caption">Selecionar projeto</span>
                  {!requiresProject && (
                    <button type="button" aria-pressed={!selected} onClick={() => select(null)}>
                      <Layers3 size={16} />
                      <span>Todos os projetos</span>
                      {!selected && <Check size={16} />}
                    </button>
                  )}
                  {projects.map((project) => (
                    <button
                      type="button"
                      key={project.id}
                      aria-pressed={project.id === selected?.id}
                      onClick={() => select(project.id)}
                    >
                      <span className={`project-switcher-dot project-${project.color}`} />
                      <span>{project.name}</span>
                      {project.id === selected?.id && <Check size={16} />}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
