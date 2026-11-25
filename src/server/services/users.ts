import "server-only";
import { hashPassword } from "better-auth/crypto";
import { headers } from "next/headers";
import { v7 } from "uuid";
import {
  consumeSensitiveAttempt,
  findUserById,
  insertUser,
  listUsers,
  saveUserProfile,
} from "@/server/repositories/users";
import { getAuth } from "@/server/security/auth";
import { businessError } from "@/server/security/business-error";
import { requireViewer } from "@/server/security/session";
import {
  changePasswordSchema,
  configureUserSchema,
  createUserSchema,
  profileSchema,
} from "@/validators";

export async function getPeople() {
  const viewer = await requireViewer();
  return { viewer, users: await listUsers(), canManage: viewer.role === "admin" };
}

export async function createUser(rawInput: unknown) {
  const input = createUserSchema.parse(rawInput);
  const viewer = await requireViewer();
  if (viewer.role !== "admin")
    throw businessError("Somente administradores podem cadastrar pessoas.");
  return insertUser({ ...input, id: v7(), passwordHash: await hashPassword(input.password) });
}

export async function configureUser(rawInput: unknown) {
  const input = configureUserSchema.parse(rawInput);
  const viewer = await requireViewer();
  if (viewer.role !== "admin")
    throw businessError("Somente administradores podem configurar acessos.");
  const previous = await findUserById(input.id);
  if (!previous) throw businessError("Pessoa não encontrada.");
  if (viewer.id === input.id && input.role !== "admin")
    throw businessError("Você não pode remover o próprio acesso de administrador.");
  if (input.newPassword !== undefined && !(await consumeSensitiveAttempt(viewer.id)))
    throw businessError("Muitas tentativas. Aguarde um minuto e tente novamente.");
  const { newPassword, ...profile } = input;
  return saveUserProfile({
    ...profile,
    passwordHash: newPassword === undefined ? undefined : await hashPassword(newPassword),
    revokeSessions:
      newPassword !== undefined || previous.role !== input.role || previous.email !== input.email,
  });
}

export async function updateProfile(rawInput: unknown) {
  const input = profileSchema.parse(rawInput);
  const viewer = await requireViewer();
  const emailChanged = input.email !== viewer.email;
  if (emailChanged) {
    if (!input.currentPassword)
      throw businessError("Confirme sua senha atual para alterar o e-mail.");
    if (!(await consumeSensitiveAttempt(viewer.id)))
      throw businessError("Muitas tentativas. Aguarde um minuto e tente novamente.");
    try {
      await (await getAuth()).api.verifyPassword({
        body: { password: input.currentPassword },
        headers: await headers(),
      });
    } catch {
      throw businessError("A senha atual está incorreta.");
    }
  }
  await saveUserProfile({ ...input, id: viewer.id, revokeSessions: emailChanged });
  return { requiresLogin: emailChanged };
}

export async function changePassword(rawInput: unknown) {
  const input = changePasswordSchema.parse(rawInput);
  const viewer = await requireViewer();
  if (!(await consumeSensitiveAttempt(viewer.id)))
    throw businessError("Muitas tentativas. Aguarde um minuto e tente novamente.");
  try {
    await (await getAuth()).api.changePassword({
      body: { ...input, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch {
    throw businessError("Não foi possível alterar a senha. Confira sua senha atual.");
  }
}
