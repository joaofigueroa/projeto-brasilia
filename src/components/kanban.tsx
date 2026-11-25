"use client";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Circle,
  CircleCheck,
  CircleDashed,
  Columns3,
  Ellipsis,
  GripVertical,
  Layers3,
  List,
  ListFilter,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useState } from "react";
import { useBoard } from "@/hooks/use-board";
import { formatDay, todayInSaoPaulo } from "@/libs/calendar";
import { priorityLabels, statuses, statusLabels } from "@/libs/presentation";
import type { BoardData, Project, PublicUser, Task, TaskStatus } from "@/types/domain";
import { Avatar } from "./avatar";
import { Toast } from "./feedback";
import { ProjectImage } from "./project-image";
import { TaskDialog } from "./task-dialog";
import { TaskList } from "./task-list";
import { TaskNextWeekButton } from "./task-next-week-button";
import { WeeklyPlanner } from "./weekly-planner";

const statusIcons = { open: CircleDashed, in_progress: Circle, done: CircleCheck };

function CardContent({
  task,
  project,
  users,
}: {
  task: Task;
  project?: Project;
  users: PublicUser[];
}) {
  const overdue = task.dueDate && task.dueDate < todayInSaoPaulo() && task.status !== "done";
  return (
    <>
      <div className="task-project-row">
        <span
          className={`project-tag task-project-identity project-${project?.color ?? "lilac"}`}
          title={project?.name}
        >
          <ProjectImage project={project} size="md" />
          <span>{project?.name}</span>
        </span>
        <span
          className={`priority-mark priority-${task.priority}`}
          role="img"
          title={`Prioridade ${priorityLabels[task.priority].toLowerCase()}`}
          aria-label={`Prioridade ${priorityLabels[task.priority]}`}
        >
          {task.priority === "high" ? (
            <ArrowUp size={14} />
          ) : task.priority === "low" ? (
            <ArrowDown size={14} />
          ) : (
            <span>＝</span>
          )}
        </span>
      </div>
      <h3>{task.title}</h3>
      {task.description && <p className="task-description">{task.description}</p>}
      <div className="task-card-footer">
        <span className={`task-date ${overdue ? "overdue" : ""}`}>
          {task.dueDate ? (
            <>
              <CalendarDays size={13} />
              {formatDay(task.dueDate, { day: "2-digit", month: "short" }).replace(" de ", " ")}
            </>
          ) : (
            <span>Sem prazo</span>
          )}
        </span>
        <span className="task-owners">
          <span className="avatar-stack">
            {task.assigneeIds.slice(0, 3).map((id) => {
              const user = users.find((person) => person.id === id);
              return user ? <Avatar key={user.id} user={user} size="sm" /> : null;
            })}
            {task.assigneeIds.length > 3 && (
              <span className="avatar avatar-sm avatar-more">+{task.assigneeIds.length - 3}</span>
            )}
          </span>
          <span className="task-owner-name">
            {task.assigneeIds.length === 0
              ? "Sem responsável"
              : users.find((person) => person.id === task.assigneeIds[0])?.name.split(" ")[0]}
            {task.assigneeIds.length > 1 ? ` +${task.assigneeIds.length - 1}` : ""}
          </span>
        </span>
      </div>
    </>
  );
}

function TaskCard({
  task,
  project,
  users,
  onOpen,
  onMove,
  onPostpone,
  disabled,
}: {
  task: Task;
  project?: Project;
  users: PublicUser[];
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
  onPostpone: (task: Task) => void;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: disabled || !task.canMove,
  });
  return (
    <motion.article
      ref={setNodeRef}
      layout
      layoutId={task.id}
      className={`task-card ${isDragging ? "is-dragging" : ""}`}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.3 : 1 }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
    >
      <button
        type="button"
        className="task-card-main"
        onClick={onOpen}
        aria-label={`Abrir tarefa: ${task.title}`}
      >
        <CardContent task={task} project={project} users={users} />
      </button>
      <div className="task-card-controls">
        <TaskNextWeekButton task={task} compact disabled={disabled} onPostpone={onPostpone} />
        {task.canMove && (
          <>
            <button
              type="button"
              className="card-drag-handle"
              {...listeners}
              {...attributes}
              aria-label={`Arrastar tarefa: ${task.title}`}
            >
              <GripVertical size={15} />
            </button>
            <div className="card-status-control">
              <span>{statusLabels[task.status]}</span>
              <ChevronDown size={12} />
              <select
                aria-label={`Alterar status de ${task.title}`}
                title="Alterar status"
                value={task.status}
                disabled={disabled}
                onChange={(event) => onMove(event.target.value as TaskStatus)}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {statusLabels[status]}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
        <button
          type="button"
          className="card-more"
          aria-label={`Detalhes e histórico: ${task.title}`}
          onClick={onOpen}
        >
          <Ellipsis size={18} />
        </button>
      </div>
    </motion.article>
  );
}

function Column({
  status,
  children,
  count,
  onAdd,
}: {
  status: TaskStatus;
  children: React.ReactNode;
  count: number;
  onAdd: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const Icon = statusIcons[status];
  return (
    <section
      className={`kanban-column column-${status} ${isOver ? "column-over" : ""}`}
      ref={setNodeRef}
      aria-label={statusLabels[status]}
    >
      <div className="column-header">
        <div>
          <span className="lane-number">
            {String(statuses.indexOf(status) + 1).padStart(2, "0")}
          </span>
          <Icon size={16} />
          <h2>{statusLabels[status]}</h2>
          <span className="column-count">{count}</span>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={`Criar tarefa em ${statusLabels[status]}`}
          onClick={onAdd}
        >
          <Plus size={18} />
        </button>
      </div>
      <div className="column-cards">
        {children}
        {!count && (
          <div className="column-empty">
            <Icon size={18} />
            <p>
              {status === "open"
                ? "Nenhuma tarefa em aberto"
                : status === "in_progress"
                  ? "Nenhuma tarefa em andamento"
                  : "Nenhuma tarefa finalizada"}
            </p>
            <small>
              {status === "open"
                ? "Crie uma tarefa para esta semana."
                : "Mova uma tarefa para esta coluna."}
            </small>
          </div>
        )}
      </div>
      <button type="button" className="add-task-button" onClick={onAdd}>
        <Plus size={15} />
        Adicionar tarefa
      </button>
    </section>
  );
}

export function Kanban({ data }: { data: BoardData }) {
  const board = useBoard(data);
  const dndId = useId();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const project = data.projects.find((item) => item.id === data.projectId);
  const [view, setView] = useState<"board" | "list">("board");
  const [dayFilter, setDayFilter] = useState<{ week: string; day: string } | null>(null);
  const activeDay = dayFilter?.week === data.weekStart ? dayFilter.day : null;
  const visibleTasks = activeDay
    ? board.tasks.filter((task) => task.dueDate === activeDay)
    : board.tasks;
  return (
    <div className="page-content tasks-page">
      <div className="workspace-page-heading">
        <div>
          <span className="section-index">01 / OPERAÇÕES</span>
          <h1>Tarefas</h1>
        </div>
        <button
          className="button primary new-task"
          type="button"
          onClick={() => board.setCreating("open")}
        >
          <Plus size={17} />
          Nova tarefa
        </button>
      </div>
      <WeeklyPlanner
        data={data}
        tasks={board.tasks}
        activeDay={activeDay}
        navigating={board.navigating}
        onDay={(day) => setDayFilter(day ? { week: data.weekStart, day } : null)}
        onWeek={(week) => board.navigate({ week, task: null })}
      />
      <div className="board-toolbar" role="group" aria-label="Filtros de tarefas">
        <div className="board-view-switch" role="group" aria-label="Visualização de tarefas">
          <button type="button" aria-pressed={view === "board"} onClick={() => setView("board")}>
            <Columns3 size={15} />
            Quadro
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            <List size={16} />
            Lista
          </button>
        </div>
        <div className="board-filters">
          <label className="assignee-filter project-filter">
            <Layers3 size={16} />
            <select
              aria-label="Filtrar por projeto"
              value={data.projectId ?? ""}
              disabled={board.navigating}
              onChange={(event) =>
                board.navigate({ project: event.target.value || null, task: null })
              }
            >
              <option value="">Todos os projetos</option>
              {data.projects.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <ChevronDown size={13} />
          </label>
          <form
            className="search-box"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              board.navigate({
                q: String(new FormData(event.currentTarget).get("q") ?? ""),
                task: null,
              });
            }}
          >
            <button type="submit" aria-label="Buscar tarefas">
              <Search size={16} />
            </button>
            <input
              name="q"
              aria-label="Buscar tarefa"
              placeholder="Buscar tarefa…"
              defaultValue={data.query}
              key={data.query}
              maxLength={150}
            />
          </form>
          <label className="assignee-filter">
            <Users size={16} />
            <select
              aria-label="Filtrar por responsável"
              value={data.assigneeId ?? ""}
              disabled={board.navigating}
              onChange={(event) =>
                board.navigate({ assignee: event.target.value || null, task: null })
              }
            >
              <option value="">Todas as pessoas</option>
              <option value={data.viewer.id}>Minhas tarefas</option>
              {data.users
                .filter((user) => user.id !== data.viewer.id)
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
            </select>
            <ChevronDown size={13} />
          </label>
        </div>
      </div>
      {(data.query || data.assigneeId || data.projectId || activeDay) && (
        <div className="active-filters">
          <ListFilter size={14} />
          <span>
            Exibindo {visibleTasks.length} {visibleTasks.length === 1 ? "tarefa" : "tarefas"}
            {data.query ? ` para “${data.query}”` : ""}
            {project ? ` em ${project.name}` : ""}
            {activeDay
              ? ` · prazo em ${formatDay(activeDay, { day: "numeric", month: "short" })}`
              : ""}
          </span>
          <button
            type="button"
            onClick={() => {
              setDayFilter(null);
              board.navigate({ q: null, assignee: null, project: null, task: null });
            }}
          >
            <X size={13} />
            Limpar filtros
          </button>
        </div>
      )}
      <div
        className={`board-container ${board.navigating ? "board-loading" : ""}`}
        aria-busy={board.navigating || board.moving}
      >
        {view === "list" ? (
          <TaskList
            data={data}
            tasks={visibleTasks}
            moving={board.moving}
            onOpen={(task) => board.navigate({ task })}
            onMove={board.move}
            onPostpone={board.postpone}
            onAdd={() => board.setCreating("open")}
          />
        ) : (
          <DndContext
            id={dndId}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={board.dragStart}
            onDragEnd={board.dragEnd}
            onDragCancel={board.cancelDrag}
            accessibility={{
              screenReaderInstructions: {
                draggable:
                  "Pressione espaço para arrastar. Use as setas para mover e espaço para soltar. Use o seletor de status como alternativa.",
              },
              announcements: {
                onDragStart: () => "Tarefa selecionada. Use as setas para escolher uma coluna.",
                onDragOver: ({ over }) =>
                  over
                    ? `Coluna ${statusLabels[String(over.id) as TaskStatus] ?? "selecionada"}.`
                    : "",
                onDragEnd: ({ over }) => (over ? "Tarefa movimentada." : "Movimentação cancelada."),
                onDragCancel: () => "Movimentação cancelada.",
              },
            }}
          >
            <LayoutGroup id={dndId}>
              <div className="kanban-board">
                {statuses.map((status) => {
                  const tasks = visibleTasks.filter((task) => task.status === status);
                  return (
                    <Column
                      key={status}
                      status={status}
                      count={tasks.length}
                      onAdd={() => board.setCreating(status)}
                    >
                      <AnimatePresence initial={false}>
                        {tasks.map((task) => (
                          <TaskCard
                            key={task.id}
                            task={task}
                            project={data.projects.find((item) => item.id === task.projectId)}
                            users={data.users}
                            onOpen={() => board.navigate({ task: task.id })}
                            onMove={(target) => board.move(task, target)}
                            onPostpone={board.postpone}
                            disabled={board.moving}
                          />
                        ))}
                      </AnimatePresence>
                    </Column>
                  );
                })}
              </div>
            </LayoutGroup>
            <DragOverlay
              dropAnimation={{ duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            >
              {board.active && (
                <div className="task-card drag-overlay">
                  <CardContent
                    task={board.active}
                    project={data.projects.find((item) => item.id === board.active?.projectId)}
                    users={data.users}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>
        )}
      </div>
      <footer className="board-footer">
        <span>
          <GripVertical size={14} />
          {view === "board"
            ? "Arraste pela alça para mover. Abra uma tarefa para editar ou consultar o histórico."
            : "Selecione o status para mover. Abra o título para consultar a tarefa."}
        </span>
      </footer>
      <AnimatePresence>
        {(board.creating || data.selectedTask) && (
          <TaskDialog
            key={
              data.selectedTask
                ? `${data.selectedTask.id}-${data.selectedTask.version}`
                : "new-task"
            }
            data={data}
            task={data.selectedTask}
            initialStatus={board.creating ?? "open"}
            onClose={board.close}
            onSaved={board.saved}
            onDeleted={board.deleted}
            onMove={board.move}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {board.notice && (
          <Toast
            message={board.notice.message}
            error={board.notice.error}
            onClose={board.dismissNotice}
            action={
              board.notice.week
                ? {
                    label: "Ver semana",
                    onClick: () => {
                      board.navigate({ week: board.notice?.week ?? data.weekStart, task: null });
                      board.dismissNotice();
                    },
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}
