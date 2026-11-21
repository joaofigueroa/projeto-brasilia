"use server";

import { revalidatePath } from "next/cache";
import { changePassword, configureUser, createUser, updateProfile } from "@/server/services/users";
import { actionResult } from "./result";

export async function createUserAction(input: unknown) {
  return actionResult(async () => {
    const user = await createUser(input);
    revalidatePath("/", "layout");
    return user.id;
  });
}
export async function configureUserAction(input: unknown) {
  return actionResult(async () => {
    await configureUser(input);
    revalidatePath("/", "layout");
  });
}
export async function updateProfileAction(input: unknown) {
  return actionResult(async () => {
    const result = await updateProfile(input);
    revalidatePath("/", "layout");
    return result;
  });
}
export async function changePasswordAction(input: unknown) {
  return actionResult(() => changePassword(input));
}
