import { Plus } from "lucide-react";
import { useEffect, useRef } from "react";
import type { BulkTaskResult } from "@/hooks/use-task-bulk-action";
import { useTaskSelection } from "@/hooks/use-task-selection";
import { formatDay, weekLabel } from "@/libs/calendar";
import { priorityLabels, statuses, statusLabels } from "@/libs/presentation";
import { MAX_BULK_TASKS } from "@/libs/task-bulk";
import type { BoardData, Task, TaskStatus } from "@/types/domain";
import { Avatar } from "./avatar";
import { ProjectImage } from "./project-image";
import { TaskBulkActions } from "./task-bulk-actions";
import { TaskNextWeekButton } from "./task-next-week-button";
export function TaskList({
  data,
  tasks,
  moving,
  onOpen,
  onMove,
  onPostpone,
  onAdd,
  onBulkCompleted,
}: {
  data: BoardData;
  tasks: Task[];
  moving: boolean;
  onOpen: (id: string) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onPostpone: (task: Task) => void;
  onAdd: () => void;
  onBulkCompleted: (result: BulkTaskResult) => void;
}) {
  const selection = useTaskSelection(tasks);
  const selectAll = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selectAll.current) selectAll.current.indeterminate = selection.mixed;
  }, [selection.mixed]);
  return (
    <div className={`task-list-shell ${selection.selected.length ? "has-selection" : ""}`}>
      <div className="task-list-scroll">
        <table className="task-list">
          <caption className="sr-only">Tarefas da semana {weekLabel(data.weekStart)}</caption>
          <thead>
            <tr>
              <th scope="col" className="task-selection-cell">
                <input
                  ref={selectAll}
                  type="checkbox"
                  aria-label={selection.allLabel}
                  checked={selection.allSelected}
                  disabled={!selection.canSelect || moving}
                  onChange={selection.toggleAll}
                />
              </th>
              <th scope="col">Tarefa / projeto</th>
              <th scope="col">Responsáveis</th>
              <th scope="col">Prazo</th>
              <th scope="col">Status</th>
              <th scope="col">Planejamento</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className={selection.ids.has(task.id) ? "task-selected" : ""}>
                <td className="task-selection-cell">
                  <input
                    type="checkbox"
                    aria-label={`Selecionar tarefa: ${task.title}`}
                    title={
                      !task.canEdit
                        ? "Apenas administradores do espaço ou do card podem selecionar esta tarefa."
                        : undefined
                    }
                    checked={selection.ids.has(task.id)}
                    disabled={
                      moving ||
                      !task.canEdit ||
                      (selection.selected.length >= MAX_BULK_TASKS && !selection.ids.has(task.id))
                    }
                    onChange={() => selection.toggle(task)}
                  />
                </td>
                <th scope="row">
                  <button type="button" onClick={() => onOpen(task.id)}>
                    {task.title}
                  </button>
                  <span className="list-project">
                    <ProjectImage
                      project={data.projects.find((item) => item.id === task.projectId)}
                    />
                    <span>{data.projects.find((item) => item.id === task.projectId)?.name}</span>
                    <span>· {priorityLabels[task.priority]}</span>
                  </span>
                </th>
                <td>
                  <span className="avatar-stack">
                    {task.assigneeIds.map((id) => {
                      const user = data.users.find((person) => person.id === id);
                      return user ? <Avatar key={id} user={user} size="sm" /> : null;
                    })}
                  </span>
                  {!task.assigneeIds.length && "Sem responsável"}
                </td>
                <td>
                  {task.dueDate
                    ? formatDay(task.dueDate, { day: "2-digit", month: "short" })
                    : "Sem prazo"}
                </td>
                <td>
                  <select
                    className={`list-status status-${task.status}`}
                    aria-label={`Alterar status de ${task.title}`}
                    value={task.status}
                    disabled={!task.canMove || moving}
                    onChange={(event) => onMove(task, event.target.value as TaskStatus)}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {statusLabels[status]}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <TaskNextWeekButton task={task} disabled={moving} onPostpone={onPostpone} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!tasks.length && (
          <div className="task-list-empty">
            <p>Nenhuma tarefa neste recorte.</p>
            <button className="text-button" type="button" onClick={() => onAdd()}>
              Criar tarefa <Plus size={15} />
            </button>
          </div>
        )}
      </div>
      <TaskBulkActions
        selected={selection.selected}
        weekStart={data.weekStart}
        disabled={moving}
        onClear={selection.clear}
        onCompleted={onBulkCompleted}
      />
    </div>
  );
}
