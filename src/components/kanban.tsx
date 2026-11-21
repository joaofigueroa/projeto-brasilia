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
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  CircleDashed,
  Ellipsis,
  FolderKanban,
  GripVertical,
  Layers3,
  LayoutDashboard,
  ListFilter,
  Plus,
  Search,
  TrendingUp,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId } from "react";
import { useBoard } from "@/hooks/use-board";
import { addDays, formatDay, mondayOf, todayInSaoPaulo, weekLabel } from "@/libs/calendar";
import { priorityLabels, statuses, statusLabels } from "@/libs/presentation";
import type { BoardData, Project, PublicUser, Task, TaskStatus } from "@/types/domain";
import { Avatar } from "./avatar";
import { Toast } from "./feedback";
import { TaskDialog } from "./task-dialog";

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
        <span className={`project-tag project-${project?.color ?? "lilac"}`}>
          <Layers3 size={12} />
          {project?.name}
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
            <span>Sem prazo definido</span>
          )}
        </span>
        <span className="avatar-stack">
          {task.assigneeIds.slice(0, 3).map((id) => {
            const user = users.find((person) => person.id === id);
            return user ? <Avatar key={user.id} user={user} size="sm" /> : null;
          })}
          {task.assigneeIds.length > 3 && (
            <span className="avatar avatar-sm avatar-more">+{task.assigneeIds.length - 3}</span>
          )}
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
  disabled,
}: {
  task: Task;
  project?: Project;
  users: PublicUser[];
  onOpen: () => void;
  onMove: (status: TaskStatus) => void;
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
              <ChevronDown size={14} />
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
          <Icon size={18} />
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
            <span>
              <Icon size={24} />
            </span>
            <p>Nenhuma tarefa neste status.</p>
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
  const currentWeek = mondayOf(todayInSaoPaulo());
  const project = data.projects.find((item) => item.id === data.projectId);
  const stats = [
    { label: "Tarefas na semana", value: data.stats.total, Icon: FolderKanban, color: "green" },
    { label: "Em andamento", value: data.stats.inProgress, Icon: TrendingUp, color: "amber" },
    { label: "Finalizadas", value: data.stats.done, Icon: CircleCheck, color: "green" },
  ];
  return (
    <div className="page-content">
      <motion.div
        className="page-heading"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <span className="page-eyebrow">
            <span className="eyebrow-line" />
            GESTÃO DE TAREFAS
          </span>
          <h1>Tarefas</h1>
          <p>Organize as tarefas da semana por projeto, responsável e status.</p>
        </div>
        <button
          className="button primary new-task"
          type="button"
          onClick={() => board.setCreating("open")}
        >
          <Plus size={18} />
          Nova tarefa
        </button>
      </motion.div>
      <motion.section
        className="week-summary"
        aria-label="Resumo da semana"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        {stats.map(({ label, value, Icon, color }) => (
          <div className="summary-item" key={label}>
            <span className={`summary-icon summary-${color}`}>
              <Icon size={19} />
            </span>
            <div>
              <span className="summary-label">{label}</span>
              <strong>{value.toString().padStart(2, "0")}</strong>
            </div>
          </div>
        ))}
        <div className="summary-item summary-progress">
          <div className="summary-progress-label">
            <span className="summary-label">Progresso da semana</span>
            <strong>
              {data.stats.completion}
              <small>%</small>
            </strong>
          </div>
          <div className="progress-track">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${data.stats.completion}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 22, delay: 0.1 }}
            />
          </div>
          <span className="progress-caption">
            {data.stats.done} de {data.stats.total} tarefas concluídas
          </span>
        </div>
      </motion.section>
      <div className="board-section-heading">
        <div>
          <LayoutDashboard size={17} />
          <h2>Quadro da semana</h2>
          {project && (
            <span className={`project-tag project-${project.color}`}>{project.name}</span>
          )}
        </div>
        <span className="board-week-meta">
          {formatDay(data.weekStart, { month: "long", year: "numeric" })}
        </span>
      </div>
      <div className="board-toolbar" role="group" aria-label="Filtros de tarefas">
        <div className="week-controls">
          <button
            className="icon-button"
            type="button"
            aria-label="Semana anterior"
            disabled={board.navigating}
            onClick={() => board.navigate({ week: addDays(data.weekStart, -7), task: null })}
          >
            <ChevronLeft size={18} />
          </button>
          <label className="week-picker">
            <CalendarDays size={16} />
            <strong>{weekLabel(data.weekStart)}</strong>
            <input
              type="date"
              min="1970-01-05"
              step={7}
              aria-label="Selecionar semana"
              value={data.weekStart}
              onChange={(event) => {
                if (event.target.value)
                  board.navigate({ week: mondayOf(event.target.value), task: null });
              }}
            />
            <ChevronDown size={14} />
          </label>
          <button
            className="icon-button"
            type="button"
            aria-label="Próxima semana"
            disabled={board.navigating}
            onClick={() => board.navigate({ week: addDays(data.weekStart, 7), task: null })}
          >
            <ChevronRight size={18} />
          </button>
          <button
            className={`today-button ${data.weekStart === currentWeek ? "current" : ""}`}
            type="button"
            onClick={() => board.navigate({ week: currentWeek, task: null })}
          >
            Hoje
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
      {(data.query || data.assigneeId || data.projectId) && (
        <div className="active-filters">
          <ListFilter size={14} />
          <span>
            Exibindo {data.tasks.length} {data.tasks.length === 1 ? "tarefa" : "tarefas"}
            {data.query ? ` para “${data.query}”` : ""}
            {project ? ` em ${project.name}` : ""}
          </span>
          <button
            type="button"
            onClick={() => board.navigate({ q: null, assignee: null, project: null, task: null })}
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
                const tasks = board.tasks.filter((task) => task.status === status);
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
                          disabled={board.moving}
                        />
                      ))}
                    </AnimatePresence>
                  </Column>
                );
              })}
            </div>
          </LayoutGroup>
          <DragOverlay dropAnimation={{ duration: 240, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
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
      </div>
      <footer className="board-footer">
        <span>
          <GripVertical size={14} />
          Arraste os cards para alterar o status. Clique para ver os detalhes.
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
          />
        )}
      </AnimatePresence>
    </div>
  );
}
