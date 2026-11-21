"use client";
import { Eye, EyeOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

export function PasswordInput({
  id,
  name,
  autoComplete,
  minLength,
  placeholder = "Sua senha",
  required = true,
}: {
  id: string;
  name: string;
  autoComplete: string;
  minLength?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="password-input">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        minLength={minLength}
        maxLength={128}
        placeholder={placeholder}
      />
      <button
        type="button"
        className="icon-button"
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={String(visible)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
          >
            {visible ? <EyeOff size={18} /> : <Eye size={18} />}
          </motion.span>
        </AnimatePresence>
      </button>
    </span>
  );
}
