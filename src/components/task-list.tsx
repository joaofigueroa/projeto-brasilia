import { Plus } from "lucide-react";
import { formatDay, weekLabel } from "@/libs/calendar";
import { priorityLabels, statuses, statusLabels } from "@/libs/presentation";
import type { BoardData, Task, TaskStatus } from "@/types/domain";
import { Avatar } from "./avatar";
import { ProjectImage } from "./project-image";
import { TaskNextWeekButton } from "./task-next-week-button";
export function TaskList({
  data,
  tasks,
  moving,
  onOpen,
  onMove,
  onPostpone,
  onAdd,
}: {
  data: BoardData;
  tasks: Task[];
  moving: boolean;
  onOpen: (id: string) => void;
  onMove: (task: Task, status: TaskStatus) => void;
  onPostpone: (task: Task) => void;
  onAdd: () => void;
}) {
  return (
    <div className="task-list-scroll">
      <table className="task-list">
        <caption className="sr-only">Tarefas da semana {weekLabel(data.weekStart)}</caption>
        <thead>
          <tr>
            <th scope="col">Tarefa / projeto</th>
            <th scope="col">Responsáveis</th>
            <th scope="col">Prazo</th>
            <th scope="col">Status</th>
            <th scope="col">Planejamento</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id}>
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
  );
}
