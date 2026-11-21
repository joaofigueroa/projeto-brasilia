import "server-only";
import type { StoredTask } from "@/server/repositories/tasks";
import type { PublicUser } from "@/types/domain";

export function taskPermissions(user: PublicUser, task: StoredTask) {
  const canEdit = user.role === "admin" || task.administratorId === user.id;
  return { canEdit, canMove: canEdit || task.assigneeIds.includes(user.id) };
}
