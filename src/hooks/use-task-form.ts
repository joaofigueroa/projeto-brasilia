import type { FormEvent } from "react";
import { useState, useTransition } from "react";
import { createTaskAction, updateTaskAction } from "@/server/actions/tasks";
import type { Task } from "@/types/domain";

export function useTaskForm(task: Task | null, onSaved: (week: string) => void) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const input = {
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
      projectId: String(form.get("projectId") ?? ""),
      administratorId: String(form.get("administratorId") ?? ""),
      assigneeIds: form.getAll("assigneeIds").map(String),
      weekStart: String(form.get("weekStart") ?? ""),
      dueDate: String(form.get("dueDate") ?? "") || null,
      priority: String(form.get("priority") ?? "medium"),
      status: String(form.get("status") ?? "open"),
    };
    setError("");
    startTransition(async () => {
      const result = task
        ? await updateTaskAction({ ...input, id: task.id, version: task.version })
        : await createTaskAction(input);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSaved(input.weekStart);
    });
  }
  return { submit, pending, error };
}
