import { CalendarDays } from "lucide-react";
import { addDays, weekLabel } from "@/libs/calendar";
import type { Task } from "@/types/domain";

export function TaskNextWeekButton({
  task,
  disabled,
  compact = false,
  onPostpone,
}: {
  task: Task;
  disabled: boolean;
  compact?: boolean;
  onPostpone: (task: Task) => void;
}) {
  if (!task.canEdit) return null;
  const label = `Mover para a semana seguinte: ${task.title}`;
  return (
    <button
      type="button"
      className={`task-next-week ${compact ? "compact" : ""}`}
      aria-label={label}
      title={`Semana seguinte · ${weekLabel(addDays(task.weekStart, 7))}`}
      disabled={disabled}
      onClick={() => onPostpone(task)}
    >
      <CalendarDays size={15} aria-hidden="true" />
      {!compact && <span>Próxima semana</span>}
    </button>
  );
}
