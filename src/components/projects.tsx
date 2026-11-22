"use client";
import { ArrowUpRight, Camera, Pencil, Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { useProjectForm } from "@/hooks/use-project-form";
import type { Project } from "@/types/domain";
import { Dialog } from "./dialog";
import { FormError, SubmitButton, Toast } from "./feedback";
import { ProjectImage } from "./project-image";

function ProjectDialog({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useProjectForm(project, onSaved);
  return (
    <Dialog
      title={project ? "Editar projeto" : "Novo projeto"}
      eyebrow="PROJETOS"
      variant="modal"
      onClose={onClose}
    >
      <form className="project-form" onSubmit={form.submit}>
        <fieldset disabled={form.pending || form.photoPending}>
          <div className="project-photo-field">
            <ProjectImage
              size="lg"
              project={{
                name: project?.name ?? "Novo projeto",
                color: project?.color ?? "lilac",
                image: form.image,
              }}
            />
            <div>
              <strong>Foto do projeto</strong>
              <p>JPG, PNG ou WebP. Até 5 MB.</p>
              <div className="project-photo-actions">
                <label className="button secondary project-photo-upload">
                  <Camera size={14} />
                  {form.photoPending ? "Preparando…" : form.image ? "Trocar foto" : "Escolher foto"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    aria-label="Foto do projeto"
                    onChange={form.upload}
                  />
                </label>
                {form.image && (
                  <button className="text-button" type="button" onClick={form.removePhoto}>
                    <X size={13} />
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>
          <label className="field">
            <span>Nome do projeto</span>
            <input
              name="name"
              defaultValue={project?.name}
              required
              minLength={2}
              maxLength={100}
              placeholder="Nome do projeto"
            />
          </label>
          <label className="field">
            <span>
              Descrição <small>opcional</small>
            </span>
            <textarea
              name="description"
              defaultValue={project?.description}
              maxLength={3000}
              rows={4}
              placeholder="Descreva o projeto e sua área de atuação."
            />
          </label>
        </fieldset>
        <FormError message={form.error} />
        <div className="modal-footer">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton pending={form.pending} disabled={form.photoPending}>
            {project ? "Salvar alterações" : "Criar projeto"}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}
export function Projects({ projects }: { projects: Project[] }) {
  const [editing, setEditing] = useState<Project | "new" | null>(null);
  const [notice, setNotice] = useState("");
  return (
    <div className="page-content projects-page">
      <div className="workspace-page-heading">
        <div>
          <span className="section-index">03 / PROJETOS</span>
          <h1>Projetos</h1>
          <p className="projects-description">Cadastre projetos e edite nome, foto e descrição.</p>
        </div>
        <button type="button" className="button primary" onClick={() => setEditing("new")}>
          <Plus size={17} />
          Novo projeto
        </button>
      </div>
      <div className="projects-directory-heading">
        <span>
          {projects.length} {projects.length === 1 ? "projeto" : "projetos"}
        </span>
        <span>Gestão de administradores</span>
      </div>
      <div className="projects-directory">
        {projects.map((project) => (
          <motion.article layout key={project.id} className="project-entry">
            <ProjectImage project={project} size="lg" />
            <div className="project-entry-content">
              <h2>{project.name}</h2>
              <p>{project.description || "Descrição não informada."}</p>
              <div className="project-entry-links">
                <Link href={`/tarefas?project=${project.id}`}>
                  Tarefas
                  <ArrowUpRight size={12} />
                </Link>
                <Link href={`/inteligencia?project=${project.id}`}>
                  Inteligência de mercado
                  <ArrowUpRight size={12} />
                </Link>
              </div>
            </div>
            <button
              className="button secondary"
              type="button"
              aria-label={`Editar projeto ${project.name}`}
              onClick={() => setEditing(project)}
            >
              <Pencil size={14} />
              Editar
            </button>
          </motion.article>
        ))}
      </div>
      <AnimatePresence>
        {editing && (
          <ProjectDialog
            key={editing === "new" ? "new" : `${editing.id}-${editing.version}`}
            project={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setNotice(editing === "new" ? "Projeto criado." : "Projeto atualizado.");
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {notice && <Toast message={notice} onClose={() => setNotice("")} />}
      </AnimatePresence>
    </div>
  );
}
