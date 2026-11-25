"use client";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Mail,
  Pencil,
  Plus,
  ShieldCheck,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import { usePersonForm } from "@/hooks/use-people";
import type { PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";
import { Dialog } from "./dialog";
import { FormError, SubmitButton, Toast } from "./feedback";
import { PasswordInput } from "./password-input";

function PersonDialog({
  user,
  onClose,
  onSaved,
}: {
  user: PublicUser | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { submit, pending, error } = usePersonForm(user, onSaved);
  const passwordId = useId();
  const confirmationId = useId();
  return (
    <Dialog
      title={user ? "Editar pessoa" : "Adicionar pessoa"}
      eyebrow={user ? "CONFIGURAR PESSOA" : "ADICIONAR PESSOA"}
      onClose={onClose}
      variant="modal"
    >
      <form className="person-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          <label className="field">
            <span>Nome completo</span>
            <input
              name="name"
              defaultValue={user?.name}
              required
              minLength={2}
              maxLength={100}
              placeholder="Como essa pessoa se chama?"
              autoComplete="name"
            />
          </label>
          <label className="field">
            <span>E-mail de acesso</span>
            <input
              type="email"
              name="email"
              defaultValue={user?.email}
              required
              maxLength={254}
              placeholder="pessoa@exemplo.com"
              autoComplete="email"
            />
          </label>
          <label className="field">
            <span>Função profissional</span>
            <input
              name="jobTitle"
              defaultValue={user?.jobTitle}
              required
              minLength={2}
              maxLength={100}
              placeholder="Ex.: Marketing e conteúdo"
            />
          </label>
          <div className="field">
            <span className="field-label">Papel de acesso</span>
            <div className="role-options">
              <label>
                <input
                  type="radio"
                  name="role"
                  value="collaborator"
                  defaultChecked={!user || user.role === "collaborator"}
                />
                <Users size={20} />
                <strong>Colaborador</strong>
                <small>Participa dos projetos e acompanha as tarefas.</small>
              </label>
              <label>
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  defaultChecked={user?.role === "admin"}
                />
                <ShieldCheck size={20} />
                <strong>Administrador</strong>
                <small>Gerencia acessos e todos os cards.</small>
              </label>
            </div>
            <small>O papel de acesso é independente da função profissional.</small>
          </div>
          <label className="field" htmlFor={passwordId}>
            <span>{user ? "Nova senha (opcional)" : "Senha inicial"}</span>
            <PasswordInput
              id={passwordId}
              name="password"
              autoComplete="new-password"
              minLength={6}
              placeholder="Pelo menos 6 caracteres"
              required={!user}
            />
            <small>
              {user
                ? "A alteração encerra as sessões ativas desta pessoa."
                : "Compartilhe o acesso com a pessoa. Ela poderá alterar a senha no perfil."}
            </small>
          </label>
          {user && (
            <label className="field" htmlFor={confirmationId}>
              <span>Confirme a nova senha</span>
              <PasswordInput
                id={confirmationId}
                name="passwordConfirmation"
                autoComplete="new-password"
                minLength={6}
                placeholder="Repita a nova senha"
                required={false}
              />
            </label>
          )}
        </fieldset>
        <FormError message={error} />
        <div className="modal-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            Cancelar
          </button>
          <SubmitButton pending={pending}>
            {user ? "Salvar alterações" : "Adicionar pessoa"}
          </SubmitButton>
        </div>
      </form>
    </Dialog>
  );
}

export function People({
  users,
  viewer,
  canManage,
}: {
  users: PublicUser[];
  viewer: PublicUser;
  canManage: boolean;
}) {
  const [editing, setEditing] = useState<PublicUser | "new" | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <div className="page-content people-page">
      <motion.div
        className="page-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="page-eyebrow">
            <span className="eyebrow-line" />
            GESTÃO DE USUÁRIOS
          </span>
          <h1>Pessoas</h1>
          <p>
            {canManage
              ? "Cadastre pessoas e configure seus papéis de acesso."
              : "Consulte as pessoas cadastradas e suas funções."}
          </p>
        </div>
        {canManage && (
          <button className="button primary" type="button" onClick={() => setEditing("new")}>
            <Plus size={18} />
            Adicionar pessoa
          </button>
        )}
      </motion.div>
      <div className="people-section-heading">
        <h2>
          Pessoas do espaço <span>{users.length}</span>
        </h2>
        <span>
          <BadgeCheck size={15} />
          {canManage
            ? "Você gerencia os acessos deste espaço"
            : "Pessoas cadastradas na plataforma"}
        </span>
      </div>
      <motion.div
        className="people-grid"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
      >
        {users.map((user) => (
          <motion.article
            className="person-card"
            key={user.id}
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="person-card-top">
              <Avatar user={user} size="lg" />
              {canManage && (
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => setEditing(user)}
                  aria-label={`Configurar ${user.name}`}
                >
                  <Pencil size={16} />
                </button>
              )}
            </div>
            <h3>
              {user.name}
              {user.id === viewer.id && <span className="you-tag">você</span>}
            </h3>
            <p className="person-job">
              <BriefcaseBusiness size={14} />
              {user.jobTitle || "Função não informada"}
            </p>
            <p className="person-email">
              <Mail size={14} />
              {user.email}
            </p>
            <div className="person-card-bottom">
              <span className={`role-tag ${user.role === "admin" ? "role-admin" : ""}`}>
                {user.role === "admin" ? <ShieldCheck size={13} /> : <Users size={13} />}
                {user.role === "admin" ? "Administrador" : "Colaborador"}
              </span>
              <span className="person-footer-note">Projeto Brasília</span>
            </div>
          </motion.article>
        ))}
      </motion.div>
      <AnimatePresence>
        {editing && (
          <PersonDialog
            key={typeof editing === "string" ? "new" : editing.id}
            user={editing === "new" ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              setSaved(true);
            }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {saved && <Toast message="Pessoa salva." onClose={() => setSaved(false)} />}
      </AnimatePresence>
    </div>
  );
}
