"use client";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  Fingerprint,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId } from "react";
import { useProfile } from "@/hooks/use-profile";
import type { PublicUser } from "@/types/domain";
import { Avatar } from "./avatar";
import { FormError, SubmitButton, Toast } from "./feedback";
import { PasswordInput } from "./password-input";

export function Profile({ user }: { user: PublicUser }) {
  const profile = useProfile(user);
  const fieldId = useId();
  return (
    <div className="page-content profile-page">
      <motion.div
        className="page-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="page-eyebrow">
            <span className="eyebrow-line" />
            CONFIGURAÇÕES DA CONTA
          </span>
          <h1>Meu perfil</h1>
          <p>Edite seus dados, sua foto e sua senha.</p>
        </div>
      </motion.div>
      <div className="profile-grid">
        <div>
          <motion.section
            className="settings-card"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="settings-card-heading">
              <span className="settings-icon">
                <UserRound size={19} />
              </span>
              <div>
                <h2>Informações pessoais</h2>
                <p>Nome, e-mail, foto e função profissional.</p>
              </div>
            </div>
            <form onSubmit={profile.submit}>
              <fieldset disabled={profile.pending}>
                <div className="profile-photo">
                  <div className="photo-preview">
                    <Avatar
                      user={{ name: user.name, image: profile.image ?? user.image }}
                      size="xl"
                    />
                    <label className="photo-upload" title="Alterar foto">
                      <Camera size={17} />
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={profile.upload}
                        aria-label="Enviar foto de perfil"
                        disabled={profile.photoPending}
                      />
                    </label>
                  </div>
                  <div>
                    <strong>Sua foto de perfil</strong>
                    <p>JPG, PNG ou WebP, até 5 MB.</p>
                    <div className="photo-actions">
                      <label className="text-button">
                        {profile.photoPending ? "Preparando…" : "Escolher foto"}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={profile.upload}
                          className="visually-hidden"
                          aria-label="Escolher foto de perfil"
                          disabled={profile.photoPending}
                        />
                      </label>
                      {(profile.image ?? user.image) && (
                        <button
                          type="button"
                          className="text-button muted"
                          onClick={profile.removePhoto}
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <label className="field">
                  <span>
                    <UserRound size={15} />
                    Nome completo
                  </span>
                  <input
                    name="name"
                    defaultValue={user.name}
                    minLength={2}
                    maxLength={100}
                    autoComplete="name"
                    required
                  />
                </label>
                <label className="field">
                  <span>
                    <Mail size={15} />
                    E-mail
                  </span>
                  <input
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={(event) => profile.setEmail(event.target.value)}
                    maxLength={254}
                    autoComplete="email"
                    required
                  />
                </label>
                <AnimatePresence>
                  {profile.email.trim().toLowerCase() !== user.email && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                    >
                      <label className="field" htmlFor={`${fieldId}-email-password`}>
                        <span>Confirme sua senha atual</span>
                        <PasswordInput
                          id={`${fieldId}-email-password`}
                          name="currentPassword"
                          autoComplete="current-password"
                        />
                        <small>Ao alterar o e-mail, você precisará entrar novamente.</small>
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
                <label className="field">
                  <span>
                    <BriefcaseBusiness size={15} />
                    Função profissional
                  </span>
                  <input
                    name="jobTitle"
                    defaultValue={user.jobTitle}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </label>
              </fieldset>
              <FormError message={profile.error} />
              <div className="settings-footer">
                <span>
                  <Check size={15} />
                  Salve para atualizar seus dados.
                </span>
                <SubmitButton pending={profile.pending || profile.photoPending}>
                  Salvar perfil
                </SubmitButton>
              </div>
            </form>
          </motion.section>
          <section className="settings-card password-card">
            <div className="settings-card-heading">
              <span className="settings-icon">
                <LockKeyhole size={19} />
              </span>
              <div>
                <h2>Segurança da conta</h2>
                <p>Altere a senha usada para entrar na plataforma.</p>
              </div>
            </div>
            <form onSubmit={profile.submitPassword}>
              <fieldset disabled={profile.passwordPending}>
                <label className="field" htmlFor={`${fieldId}-current-password`}>
                  <span>Senha atual</span>
                  <PasswordInput
                    id={`${fieldId}-current-password`}
                    name="currentPassword"
                    autoComplete="current-password"
                  />
                </label>
                <div className="field-row">
                  <label className="field" htmlFor={`${fieldId}-new-password`}>
                    <span>Nova senha</span>
                    <PasswordInput
                      id={`${fieldId}-new-password`}
                      name="newPassword"
                      autoComplete="new-password"
                      minLength={12}
                      placeholder="Pelo menos 12 caracteres"
                    />
                  </label>
                  <label className="field" htmlFor={`${fieldId}-confirm-password`}>
                    <span>Confirmar nova senha</span>
                    <PasswordInput
                      id={`${fieldId}-confirm-password`}
                      name="confirmPassword"
                      autoComplete="new-password"
                      minLength={12}
                      placeholder="Repita a nova senha"
                    />
                  </label>
                </div>
              </fieldset>
              <FormError message={profile.passwordError} />
              <div className="settings-footer">
                <span>
                  <ShieldCheck size={15} />
                  Outras sessões serão encerradas.
                </span>
                <SubmitButton pending={profile.passwordPending}>Alterar senha</SubmitButton>
              </div>
            </form>
          </section>
        </div>
        <aside className="profile-aside">
          <section className="access-card">
            <span className="access-icon">
              <Fingerprint size={30} />
            </span>
            <span className="eyebrow">SEU ACESSO</span>
            <h2>{user.role === "admin" ? "Administrador" : "Colaborador"}</h2>
            <p>
              {user.role === "admin"
                ? "Seu papel permite gerenciar pessoas, configurar acessos e acompanhar todos os projetos."
                : "Acompanhe os projetos, crie tarefas e altere o status das tarefas pelas quais você é responsável."}
            </p>
            <span className="role-tag role-admin">
              {user.role === "admin" ? <ShieldCheck size={14} /> : <Users size={14} />}
              {user.role === "admin" ? "Administrador" : "Colaborador"}
            </span>
            <div className="access-card-note">
              <LockKeyhole size={15} />
              <span>
                Seu papel de acesso é configurado por um administrador e é independente da sua
                função.
              </span>
            </div>
          </section>
        </aside>
      </div>
      <AnimatePresence>
        {profile.notice && <Toast message={profile.notice} onClose={profile.dismissNotice} />}
      </AnimatePresence>
    </div>
  );
}
