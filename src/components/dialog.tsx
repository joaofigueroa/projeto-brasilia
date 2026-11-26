"use client";
import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useId, useRef } from "react";

export function Dialog({
  children,
  title,
  eyebrow,
  onClose,
  variant = "drawer",
  initialFocus,
  panelClassName,
}: {
  children: React.ReactNode;
  title: string;
  eyebrow?: string;
  onClose: () => void;
  variant?: "drawer" | "modal";
  initialFocus?: string;
  panelClassName?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const labelId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    dialog
      ?.querySelector<HTMLElement>(
        initialFocus ?? "input:not([type='checkbox']):not([type='radio']):not(:disabled)",
      )
      ?.focus();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, [initialFocus]);
  return (
    <motion.dialog
      ref={ref}
      className={`app-dialog ${variant}`}
      aria-labelledby={labelId}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        className="dialog-backdrop"
        aria-label="Fechar janela"
        tabIndex={-1}
        onClick={onClose}
        type="button"
      />
      <motion.section
        className={panelClassName ? `dialog-panel ${panelClassName}` : "dialog-panel"}
        initial={variant === "drawer" ? { x: 65 } : { y: 18, scale: 0.97 }}
        animate={{ x: 0, y: 0, scale: 1 }}
        exit={variant === "drawer" ? { x: 65 } : { y: 18, scale: 0.97 }}
      >
        <header className="dialog-header">
          <div>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            <h2 id={labelId}>{title}</h2>
          </div>
          <button className="icon-button" aria-label="Fechar" onClick={onClose} type="button">
            <X size={20} />
          </button>
        </header>
        {children}
      </motion.section>
    </motion.dialog>
  );
}
