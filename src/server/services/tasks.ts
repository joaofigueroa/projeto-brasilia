import "server-only";
import { v7 } from "uuid";
import { priorityLabels, statusLabels } from "@/libs/presentation";
import { listProjects } from "@/server/repositories/projects";
import {
  findTask,
  insertTask,
  listTaskHistory,
  listTasks,
  type StoredTask,
  saveTask,
} from "@/server/repositories/tasks";
import { listUsers } from "@/server/repositories/users";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import type { BoardData, Change, Project, PublicUser } from "@/types/domain";
import {
  boardFiltersSchema,
  createTaskSchema,
  moveTaskSchema,
  type TaskFields,
  updateTaskSchema,
} from "@/validators";
import { taskPermissions } from "./task-permissions";

function fail(message: string): never {
  throw businessError(message);
}

function assertReferences(input: TaskFields, projects: Project[], users: PublicUser[]) {
  if (!projects.some((project) => project.id === input.projectId)) fail("Projeto não encontrado.");
  const ids = new Set(users.map((user) => user.id));
  if (!ids.has(input.administratorId) || input.assigneeIds.some((id) => !ids.has(id)))
    fail("Uma das pessoas selecionadas não está disponível.");
}

function taskChanges(
  previous: StoredTask,
  next: TaskFields,
  users: PublicUser[],
  projects: Project[],
): Change[] {
  const userName = (id: string) =>
    users.find((user) => user.id === id)?.name ?? "Pessoa indisponível";
  const projectName = (id: string) =>
    projects.find((project) => project.id === id)?.name ?? "Projeto indisponível";
  const changes: Change[] = [];
  const fields = [
    "title",
    "description",
    "weekStart",
    "dueDate",
    "projectId",
    "administratorId",
    "priority",
    "status",
  ] as const;
  for (const field of fields) {
    if (previous[field] === next[field]) continue;
    const display = (value: string | null) => {
      if (!value) return "Não definido";
      if (field === "projectId") return projectName(value);
      if (field === "administratorId") return userName(value);
      if (field === "status") return statusLabels[value as keyof typeof statusLabels];
      if (field === "priority") return priorityLabels[value as keyof typeof priorityLabels];
      return value;
    };
    changes.push({ field, before: display(previous[field]), after: display(next[field]) });
  }
  const oldAssignees = [...previous.assigneeIds].sort();
  const newAssignees = [...next.assigneeIds].sort();
  if (JSON.stringify(oldAssignees) !== JSON.stringify(newAssignees))
    changes.push({
      field: "assigneeIds",
      before: oldAssignees.map(userName).join(", "),
      after: newAssignees.map(userName).join(", "),
    });
  return changes;
}

export async function getBoard(rawInput: unknown): Promise<BoardData> {
  const input = boardFiltersSchema.parse(rawInput);
  const viewer = await requireViewer();
  const [stored, projects, users, selected] = await Promise.all([
    listTasks(input),
    listProjects(),
    listUsers(),
    input.task ? findTask(input.task) : Promise.resolve(null),
  ]);
  if (input.project && !projects.some((project) => project.id === input.project))
    fail("Projeto não encontrado.");
  const tasks = stored.map((task) => ({ ...task, ...taskPermissions(viewer, task) }));
  const selectedTask = selected ? { ...selected, ...taskPermissions(viewer, selected) } : null;
  const history = selectedTask ? await listTaskHistory(selectedTask.id) : [];
  const done = tasks.filter((task) => task.status === "done").length;
  return {
    tasks,
    projects,
    users,
    viewer,
    selectedTask,
    history,
    weekStart: input.week,
    projectId: input.project ?? null,
    assigneeId: input.assignee ?? null,
    query: input.q,
    stats: {
      total: tasks.length,
      done,
      inProgress: tasks.filter((task) => task.status === "in_progress").length,
      completion: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    },
  };
}

export async function createTask(rawInput: unknown) {
  const input = createTaskSchema.parse(rawInput);
  const viewer = await requireViewer();
  const [projects, users] = await Promise.all([listProjects(), listUsers()]);
  assertReferences(input, projects, users);
  if (viewer.role !== "admin" && input.administratorId !== viewer.id)
    fail("Você deve administrar os cards que criar.");
  return insertTask({ ...input, id: v7(), actorId: viewer.id, changes: [] });
}

export async function updateTask(rawInput: unknown) {
  const input = updateTaskSchema.parse(rawInput);
  const viewer = await requireViewer();
  const [previous, projects, users] = await Promise.all([
    findTask(input.id),
    listProjects(),
    listUsers(),
  ]);
  if (!previous) fail("Tarefa não encontrada.");
  if (!taskPermissions(viewer, previous).canEdit)
    fail("Somente um administrador deste card pode editá-lo.");
  if (previous.version !== input.version)
    fail("Esta tarefa foi alterada por outra pessoa. Reabra o card para ver a versão atual.");
  assertReferences(input, projects, users);
  const changes = taskChanges(previous, input, users, projects);
  if (!changes.length) return input.id;
  const saved = await saveTask({ ...input, changes, actorId: viewer.id, kind: "updated" });
  if (!saved) fail("Esta tarefa foi alterada por outra pessoa. Reabra o card para continuar.");
  return saved;
}

export async function moveTask(rawInput: unknown) {
  const input = moveTaskSchema.parse(rawInput);
  const viewer = await requireViewer();
  const previous = await findTask(input.id);
  if (!previous) fail("Tarefa não encontrada.");
  if (!taskPermissions(viewer, previous).canMove)
    fail("Somente responsáveis e administradores podem movimentar esta tarefa.");
  if (previous.version !== input.version)
    fail("Esta tarefa foi alterada. Atualize o quadro e tente novamente.");
  if (previous.status === input.status) return input.id;
  const saved = await saveTask({
    ...previous,
    status: input.status,
    actorId: viewer.id,
    kind: "moved",
    changes: [
      { field: "status", before: statusLabels[previous.status], after: statusLabels[input.status] },
    ],
  });
  if (!saved) fail("Esta tarefa foi alterada. Atualize o quadro e tente novamente.");
  return saved;
}
