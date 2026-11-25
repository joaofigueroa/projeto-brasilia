import { useState } from "react";
import { MAX_BULK_TASKS } from "@/libs/task-bulk";
import type { Task } from "@/types/domain";

export function useTaskSelection(tasks: Task[]) {
  const [selection, setSelection] = useState<Task[]>([]);
  const editable = tasks.filter((task) => task.canEdit);
  const selectable = editable.slice(0, MAX_BULK_TASKS);
  const visibleIds = new Set(editable.map((task) => task.id));
  const selected = selection.filter((task) => visibleIds.has(task.id));
  const ids = new Set(selected.map((task) => task.id));
  const allSelected = selectable.length > 0 && selectable.every((task) => ids.has(task.id));
  function toggle(task: Task) {
    if (!task.canEdit) return;
    setSelection((previous) => {
      const visible = previous.filter((item) => visibleIds.has(item.id));
      if (visible.some((item) => item.id === task.id))
        return visible.filter((item) => item.id !== task.id);
      return visible.length < MAX_BULK_TASKS ? [...visible, task] : visible;
    });
  }
  return {
    selected,
    ids,
    allSelected,
    mixed: selected.length > 0 && !allSelected,
    canSelect: selectable.length > 0,
    allLabel:
      editable.length > MAX_BULK_TASKS
        ? `Selecionar até ${MAX_BULK_TASKS} tarefas desta lista`
        : "Selecionar todas as tarefas editáveis desta lista",
    toggle,
    toggleAll: () => setSelection(allSelected ? [] : selectable),
    clear: () => setSelection([]),
  };
}
