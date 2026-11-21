import type { Metadata } from "next";
import { People } from "@/components/people";
import { Topbar } from "@/components/topbar";
import { getPeople } from "@/server/services/users";

export const metadata: Metadata = { title: "Pessoas" };
export default async function PeoplePage() {
  const data = await getPeople();
  return (
    <>
      <Topbar title="Pessoas" viewer={data.viewer} />
      <People {...data} />
    </>
  );
}
