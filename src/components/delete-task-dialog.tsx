import { LoaderCircle, Trash2 } from "lucide-react";
import { useTaskDeletion } from "@/hooks/use-task-deletion";
import type { Task } from "@/types/domain";
import { Dialog } from "./dialog";
import { FormError } from "./feedback";
export function DeleteTaskDialog({
  task,
  onCancel,
  onDeleted,
}: {
  task: Task;
  onCancel: () => void;
  onDeleted: () => void;
}) {
  const { pending, error, remove } = useTaskDeletion(task, onDeleted);
  return (
    <Dialog
      title="Excluir tarefa?"
      eyebrow="CONFIRMAR EXCLUSÃO"
      variant="modal"
      initialFocus="[data-cancel-delete]"
      onClose={() => {
        if (!pending) onCancel();
      }}
    >
      <div className="delete-task-body">
        <p>
          A tarefa <strong>“{task.title}”</strong> será removida do quadro para todas as pessoas.
        </p>
        <p>O histórico e o registro da exclusão ficam preservados.</p>
        <FormError message={error} />
      </div>
      <div className="modal-footer">
        <button
          type="button"
          className="button secondary"
          data-cancel-delete
          disabled={pending}
          onClick={onCancel}
        >
          Cancelar
        </button>
        <button type="button" className="button danger" disabled={pending} onClick={remove}>
          {pending ? <LoaderCircle size={16} className="spin" /> : <Trash2 size={16} />}{" "}
          {pending ? "Excluindo…" : "Excluir tarefa"}
        </button>
      </div>
    </Dialog>
  );
}
