"use client";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import { motion } from "motion/react";

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <motion.div
      className="form-error"
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <AlertCircle size={17} />
      <span>{message}</span>
    </motion.div>
  );
}
export function SubmitButton({
  pending,
  children,
  className = "button primary",
}: {
  pending: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending && <LoaderCircle size={17} className="spin" />}
      {pending ? "Salvando…" : children}
    </button>
  );
}
export function Toast({
  message,
  onClose,
  error = false,
}: {
  message: string;
  onClose: () => void;
  error?: boolean;
}) {
  return (
    <motion.div
      role={error ? "alert" : "status"}
      className={`toast ${error ? "toast-error" : ""}`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10 }}
    >
      {error ? <AlertCircle size={19} /> : <CheckCircle2 size={19} />}
      <span>{message}</span>
      <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar aviso">
        <X size={16} />
      </button>
    </motion.div>
  );
}
