export type Role = "admin" | "collaborator";
export type TaskStatus = "open" | "in_progress" | "done";
export type Priority = "low" | "medium" | "high";

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  role: Role;
  image: string | null;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  version: number;
  color: string;
  description: string;
};
export type Change = { field: string; before: string; after: string };
export type TaskHistory = {
  id: string;
  kind: "created" | "updated" | "moved";
  actor: Pick<PublicUser, "id" | "name" | "image">;
  createdAt: string;
  changes: Change[];
};

export type Task = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  weekStart: string;
  dueDate: string | null;
  projectId: string;
  administratorId: string;
  createdBy: string;
  assigneeIds: string[];
  version: number;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canMove: boolean;
};

export type BoardData = {
  tasks: Task[];
  projects: Project[];
  users: PublicUser[];
  viewer: PublicUser;
  weekStart: string;
  projectId: string | null;
  assigneeId: string | null;
  query: string;
  stats: { total: number; done: number; inProgress: number; completion: number };
  selectedTask: Task | null;
  history: TaskHistory[];
};

export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };
