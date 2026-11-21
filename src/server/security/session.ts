import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { findUserById } from "@/server/repositories/users";
import { getAuth } from "./auth";

export const getViewer = cache(async () => {
  const session = await (await getAuth()).api.getSession({ headers: await headers() });
  if (!session) return null;
  return findUserById(session.user.id);
});

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}
