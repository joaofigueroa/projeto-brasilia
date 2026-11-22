import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProspectPage } from "@/components/prospect-page";
import { Topbar } from "@/components/topbar";
import { automotiveProjectId } from "@/libs/company-census";
import { safeProspectReturnUrl } from "@/libs/prospect-navigation";
import { getProspectPage } from "@/server/services/prospect-page";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const data = await getProspectPage(
    id,
    typeof search.project === "string" ? search.project : automotiveProjectId,
  );
  return { title: data?.prospect.name ?? "Possível cliente" };
}
export default async function ProspectProfilePage({ params, searchParams }: Props) {
  const [{ id }, search] = await Promise.all([params, searchParams]);
  const data = await getProspectPage(
    id,
    typeof search.project === "string" ? search.project : automotiveProjectId,
  );
  if (!data) notFound();
  const backHref = safeProspectReturnUrl(
    typeof search.from === "string" ? search.from : undefined,
    data.defaultBackHref,
  );
  return (
    <>
      <Topbar title="Possíveis clientes" viewer={data.viewer} />
      <ProspectPage key={data.prospect.databaseId} data={data} backHref={backHref} />
    </>
  );
}
