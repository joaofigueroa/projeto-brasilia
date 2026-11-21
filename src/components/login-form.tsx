"use client";
import { LoaderCircle, LockKeyhole, Mail } from "lucide-react";
import { motion } from "motion/react";
import { useId } from "react";
import { useLogin } from "@/hooks/use-login";
import { FormError } from "./feedback";
import { PasswordInput } from "./password-input";

export function LoginForm({ emailChanged = false }: { emailChanged?: boolean }) {
  const { submit, error, pending } = useLogin();
  const passwordId = useId();
  return (
    <motion.div
      className="login-form-wrap"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
    >
      <span className="login-welcome">ACESSO À PLATAFORMA</span>
      <h1>Entrar</h1>
      <p>Use seu e-mail e senha para acessar a plataforma.</p>
      {emailChanged && (
        <p className="success-note" role="status">
          E-mail atualizado. Entre com seu novo e-mail.
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={pending}>
          <label className="field">
            <span>
              <Mail size={16} />
              E-mail
            </span>
            <input
              type="email"
              name="email"
              placeholder="voce@exemplo.com"
              required
              autoComplete="email"
              maxLength={254}
            />
          </label>
          <label className="field" htmlFor={passwordId}>
            <span>
              <LockKeyhole size={16} />
              Senha
            </span>
            <PasswordInput id={passwordId} name="password" autoComplete="current-password" />
          </label>
        </fieldset>
        <FormError message={error} />
        <button type="submit" className="button primary login-submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle size={18} className="spin" />
              Entrando…
            </>
          ) : (
            "Entrar"
          )}
        </button>
      </form>
      <p className="login-access-note">
        <LockKeyhole size={14} />
        Seu acesso é criado por um administrador.
      </p>
    </motion.div>
  );
}
