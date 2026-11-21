import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Intelligence } from "@/components/intelligence";
import { Topbar } from "@/components/topbar";
import { getIntelligence } from "@/server/services/intelligence";
export const metadata: Metadata = { title: "Business Intelligence" };
export default async function IntelligencePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const data = await getIntelligence({
    project: params.project,
    tab: params.tab,
    uf: params.uf ?? (params.region ? undefined : "DF"),
    region: params.region,
    city: params.city,
    year: params.year ?? 2024,
    metric: params.metric ?? "fleet",
  });
  if (!params.project) {
    const url = new URLSearchParams();
    for (const [key, value] of Object.entries(params))
      if (typeof value === "string") url.set(key, value);
    url.set("project", data.project.id);
    if (!params.uf && !params.region) url.set("uf", "DF");
    redirect(`/inteligencia?${url}`);
  }
  return (
    <>
      <Topbar title="Business Intelligence" viewer={data.viewer} />
      <Intelligence data={data} />
    </>
  );
}
