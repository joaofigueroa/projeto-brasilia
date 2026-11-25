import { CalendarDays, LoaderCircle, Trash2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { type BulkTaskResult, useTaskBulkAction } from "@/hooks/use-task-bulk-action";
import { addDays, weekLabel } from "@/libs/calendar";
import type { Task } from "@/types/domain";
import { Dialog } from "./dialog";
import { FormError } from "./feedback";
export function TaskBulkActions({
  selected,
  weekStart,
  disabled,
  onClear,
  onCompleted,
}: {
  selected: Task[];
  weekStart: string;
  disabled: boolean;
  onClear: () => void;
  onCompleted: (result: BulkTaskResult) => void;
}) {
  const bulk = useTaskBulkAction((result) => {
    onClear();
    onCompleted(result);
  });
  const confirmation = bulk.confirmation;
  const deleting = confirmation?.operation === "delete";
  const count = confirmation?.tasks.length ?? 0;
  const taskLabel = `${count} ${count === 1 ? "tarefa" : "tarefas"}`;
  return (
    <>
      <div className="bulk-task-dock">
        <AnimatePresence>
          {selected.length > 0 && (
            <motion.div
              className="bulk-task-toolbar"
              role="region"
              aria-label="Ações em massa"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
            >
              <span className="bulk-task-count" role="status">
                {selected.length} {selected.length === 1 ? "selecionada" : "selecionadas"}
              </span>
              <span className="bulk-task-divider" aria-hidden="true" />
              <button
                type="button"
                disabled={disabled || bulk.pending}
                onClick={() => bulk.request("week", selected)}
              >
                <CalendarDays size={16} /> Mudar semana
              </button>
              <button
                type="button"
                className="bulk-task-delete"
                disabled={disabled || bulk.pending}
                onClick={() => bulk.request("delete", selected)}
              >
                <Trash2 size={16} /> Excluir
              </button>
              <button
                type="button"
                className="bulk-task-clear"
                aria-label="Limpar seleção de tarefas"
                disabled={bulk.pending}
                onClick={onClear}
              >
                <X size={17} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {confirmation && (
          <Dialog
            variant="modal"
            title={deleting ? `Excluir ${taskLabel}?` : `Mudar a semana de ${taskLabel}?`}
            eyebrow="CONFIRMAR AÇÃO EM MASSA"
            initialFocus="[data-cancel-bulk]"
            onClose={bulk.cancel}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                bulk.confirm(String(form.get("weekStart") ?? ""));
              }}
            >
              <fieldset className="bulk-task-confirmation" disabled={bulk.pending}>
                <p>
                  {deleting
                    ? "As tarefas abaixo serão removidas do quadro para todas as pessoas. O histórico de cada uma será preservado."
                    : "As tarefas abaixo serão movidas para a semana escolhida. Prazos, responsáveis e status serão mantidos."}
                </p>
                <ul className="bulk-task-preview" aria-label="Tarefas afetadas">
                  {confirmation.tasks.map((task) => (
                    <li key={task.id}>
                      <strong>{task.title}</strong>
                      <span>{weekLabel(task.weekStart)}</span>
                    </li>
                  ))}
                </ul>
                {!deleting && (
                  <label className="field">
                    <span>
                      <CalendarDays size={15} /> Semana de destino
                    </span>
                    <input
                      type="date"
                      name="weekStart"
                      defaultValue={addDays(weekStart, 7)}
                      min="1970-01-05"
                      step={7}
                      required
                    />
                    <small>Selecione a segunda-feira que inicia a nova semana.</small>
                  </label>
                )}
                <FormError message={bulk.error} />
              </fieldset>
              <div className="modal-footer">
                <button
                  type="button"
                  className="button secondary"
                  data-cancel-bulk
                  disabled={bulk.pending}
                  onClick={bulk.cancel}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`button ${deleting ? "danger" : "primary"}`}
                  disabled={bulk.pending}
                >
                  {bulk.pending && <LoaderCircle size={16} className="spin" />}
                  {bulk.pending
                    ? "Aplicando…"
                    : deleting
                      ? `Excluir ${taskLabel}`
                      : "Confirmar mudança de semana"}
                </button>
              </div>
            </form>
          </Dialog>
        )}
      </AnimatePresence>
    </>
  );
}
