import type { Metadata } from "next";
import { Profile } from "@/components/profile";
import { Topbar } from "@/components/topbar";
import { requireViewer } from "@/server/security/session";

export const metadata: Metadata = { title: "Meu perfil" };
export default async function ProfilePage() {
  const user = await requireViewer();
  return (
    <>
      <Topbar title="Meu perfil" viewer={user} />
      <Profile user={user} />
    </>
  );
}
