import { useState, useTransition } from "react";
import { deleteTasksInBulkAction, rescheduleTasksInBulkAction } from "@/server/actions/tasks";
import type { Task } from "@/types/domain";
export type BulkTaskResult = { count: number; weekStart?: string };
export type BulkTaskConfirmation = { operation: "week" | "delete"; tasks: Task[] };
export function useTaskBulkAction(onCompleted: (result: BulkTaskResult) => void) {
  const [confirmation, setConfirmation] = useState<BulkTaskConfirmation | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function request(operation: BulkTaskConfirmation["operation"], tasks: Task[]) {
    if (pending || tasks.length === 0) return;
    setError("");
    setConfirmation({ operation, tasks: [...tasks] });
  }
  function cancel() {
    if (!pending) {
      setConfirmation(null);
      setError("");
    }
  }
  function confirm(weekStart: string) {
    if (!confirmation || pending) return;
    const input = {
      tasks: confirmation.tasks.map(({ id, version }) => ({ id, version })),
      confirmed: true,
    };
    setError("");
    startTransition(async () => {
      try {
        const result =
          confirmation.operation === "week"
            ? await rescheduleTasksInBulkAction({ ...input, weekStart })
            : await deleteTasksInBulkAction(input);
        if (!result.success) {
          setError(result.error);
          return;
        }
        setConfirmation(null);
        onCompleted(result.data);
      } catch {
        setError(
          "Não foi possível confirmar a operação. Atualize a lista antes de tentar novamente.",
        );
      }
    });
  }
  return { confirmation, pending, error, request, cancel, confirm };
}
