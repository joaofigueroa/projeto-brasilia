"use server";

import { revalidatePath } from "next/cache";
import { createTask, deleteTask, moveTask, updateTask } from "@/server/services/tasks";
import { actionResult } from "./result";

export async function createTaskAction(input: unknown) {
  return actionResult(async () => {
    const id = await createTask(input);
    revalidatePath("/tarefas");
    return id;
  });
}
export async function updateTaskAction(input: unknown) {
  return actionResult(async () => {
    const id = await updateTask(input);
    revalidatePath("/tarefas");
    return id;
  });
}
export async function moveTaskAction(input: unknown) {
  return actionResult(async () => {
    const id = await moveTask(input);
    revalidatePath("/tarefas");
    return id;
  });
}

export async function deleteTaskAction(input: unknown) {
  return actionResult(async () => {
    const id = await deleteTask(input);
    revalidatePath("/tarefas");
    return id;
  });
}
