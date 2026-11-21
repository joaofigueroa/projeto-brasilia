"use client";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { periodLabel } from "@/libs/analysis-period";
export function AnalysisPeriodFilter({
  years,
  controller,
}: {
  years: number[];
  controller: IntelligenceController;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(years);
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    dialog.current?.querySelector<HTMLInputElement>("input:checked")?.focus();
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [open]);
  function toggle(year: number) {
    setDraft((current) =>
      current.includes(year)
        ? current.filter((value) => value !== year)
        : [...current, year].sort((a, b) => a - b),
    );
  }
  function apply() {
    controller.navigate({ years: draft.join(","), year: null });
    setOpen(false);
    button.current?.focus();
  }
  return (
    <div className="bi-period-picker">
      <button
        ref={button}
        className="bi-period-trigger"
        type="button"
        aria-label={`Filtrar anos: ${periodLabel(years)}`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={controller.navigating}
        onClick={() => {
          setDraft(years);
          setOpen(!open);
        }}
      >
        <CalendarDays size={15} />
        <span>{years.length === 1 ? years[0] : `${years.length} anos`}</span>
        <ChevronDown size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <button
              className="bi-period-backdrop"
              aria-label="Fechar filtro de anos"
              type="button"
              onClick={() => setOpen(false)}
            />
            <motion.div
              ref={dialog}
              role="dialog"
              aria-label="Filtro de anos"
              id={id}
              className="bi-period-popover"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <strong>Anos de referência</strong>
              <p>Selecione até 10 anos.</p>
              <button
                className="text-button"
                type="button"
                onClick={() => setDraft([2022, 2023, 2024])}
              >
                Selecionar 2022–2024
              </button>
              <div className="bi-period-years">
                {Array.from(
                  { length: new Date().getFullYear() - 1999 },
                  (_, i) => new Date().getFullYear() - i,
                ).map((year) => (
                  <label key={year}>
                    <input
                      type="checkbox"
                      checked={draft.includes(year)}
                      disabled={!draft.includes(year) && draft.length >= 10}
                      onChange={() => toggle(year)}
                    />
                    <span>{year}</span>
                    {[2022, 2023, 2024].includes(year) && <small>Base inicial</small>}
                  </label>
                ))}
              </div>
              <div className="bi-period-footer">
                <span>{draft.length} selecionados</span>
                <button
                  className="button primary"
                  type="button"
                  disabled={!draft.length}
                  onClick={apply}
                >
                  <Check size={14} />
                  Aplicar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
