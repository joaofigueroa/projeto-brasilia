import { useState, useTransition } from "react";
import { deleteTaskAction } from "@/server/actions/tasks";
import type { Task } from "@/types/domain";
export function useTaskDeletion(task: Task, onDeleted: () => void) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function remove() {
    if (pending) return;
    setError("");
    startTransition(async () => {
      const result = await deleteTaskAction({ id: task.id, version: task.version });
      if (!result.success) {
        setError(result.error);
        return;
      }
      onDeleted();
    });
  }
  return { error, pending, remove };
}
