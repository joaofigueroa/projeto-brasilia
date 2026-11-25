import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useOptimistic, useState, useTransition } from "react";
import { formatDay } from "@/libs/calendar";
import { statuses } from "@/libs/presentation";
import { moveTaskAction, postponeTaskAction } from "@/server/actions/tasks";
import type { BoardData, Task, TaskStatus } from "@/types/domain";
import { useNavigation } from "./use-navigation";

export function useBoard(data: BoardData) {
  const { navigate, pending: navigating, router } = useNavigation();
  const [creating, setCreating] = useState<TaskStatus | null>(null);
  const [active, setActive] = useState<Task | null>(null);
  const [notice, setNotice] = useState<{ message: string; error: boolean; week?: string } | null>(
    null,
  );
  const [moving, startTransition] = useTransition();
  const [tasks, optimisticallyMove] = useOptimistic(
    data.tasks,
    (current, change: { id: string; status: TaskStatus }) =>
      current.map((task) => (task.id === change.id ? { ...task, status: change.status } : task)),
  );
  function move(task: Task, status: TaskStatus) {
    if (status === task.status || moving) return;
    startTransition(async () => {
      optimisticallyMove({ id: task.id, status });
      const result = await moveTaskAction({ id: task.id, version: task.version, status });
      if (!result.success) {
        setNotice({ message: result.error, error: true });
        router.refresh();
      } else setNotice({ message: "Status da tarefa atualizado.", error: false });
    });
  }
  function postpone(task: Task) {
    if (moving || !task.canEdit) return;
    startTransition(async () => {
      try {
        const result = await postponeTaskAction({ id: task.id, version: task.version });
        if (!result.success) {
          setNotice({ message: result.error, error: true });
          router.refresh();
          return;
        }
        setNotice({
          message: `Tarefa movida para a semana de ${formatDay(result.data.weekStart, { day: "2-digit", month: "2-digit" })}.`,
          error: false,
          week: result.data.weekStart,
        });
      } catch {
        setNotice({ message: "Não foi possível mover a tarefa. Tente novamente.", error: true });
        router.refresh();
      }
    });
  }
  function dragStart(event: DragStartEvent) {
    setActive(tasks.find((task) => task.id === event.active.id) ?? null);
  }
  function dragEnd(event: DragEndEvent) {
    setActive(null);
    const target = String(event.over?.id ?? "");
    const task = tasks.find((item) => item.id === event.active.id);
    if (task && statuses.includes(target as TaskStatus)) move(task, target as TaskStatus);
  }
  function close() {
    setCreating(null);
    if (data.selectedTask) navigate({ task: null });
  }
  function saved(week: string) {
    setCreating(null);
    navigate({ task: null, week });
    setNotice({ message: "Tarefa salva.", error: false });
  }
  function deleted() {
    navigate({ task: null });
    setNotice({ message: "Tarefa excluída.", error: false });
    document.querySelector<HTMLButtonElement>(".new-task")?.focus();
  }
  return {
    deleted,
    tasks,
    creating,
    setCreating,
    active,
    dragStart,
    dragEnd,
    cancelDrag: () => setActive(null),
    move,
    postpone,
    moving,
    navigating,
    navigate,
    close,
    saved,
    notice,
    dismissNotice: () => setNotice(null),
  };
}
