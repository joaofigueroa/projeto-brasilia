"use client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { researchPriorityLabels, researchSegmentLabels } from "@/libs/commercial-research";
import { prospectPageHref } from "@/libs/prospect-navigation";
import type { ResearchProspect } from "@/types/commercial-research";
import { ProspectFavoriteButton } from "./prospect-favorite-button";
import { ProspectSpecialization } from "./prospect-specialization";
export function ProspectCard({
  prospect,
  projectId,
  from,
}: {
  prospect: ResearchProspect;
  projectId: string;
  from: string;
}) {
  return (
    <article className={`research-prospect ${prospect.priority}`}>
      <div className="research-prospect-top">
        <span className="section-caption">
          {researchSegmentLabels[prospect.segment]} · {prospect.cityName}
        </span>
        {prospect.databaseId && (
          <ProspectFavoriteButton
            key={`${prospect.databaseId}-${prospect.isFavorite}`}
            projectId={projectId}
            prospectId={prospect.databaseId}
            name={prospect.name}
            initialFavorite={prospect.isFavorite}
            compact
          />
        )}
      </div>
      <Link
        className="research-open-profile"
        prefetch={false}
        href={prospectPageHref(projectId, prospect.databaseId ?? prospect.id, from)}
        aria-label={`Ver perfil de ${prospect.name}`}
      >
        <strong>{prospect.name}</strong>
        <ProspectSpecialization prospect={prospect} compact />
        <span className="research-profile-level">
          {prospect.enrichmentLevel === "researched"
            ? "Com pesquisa comercial"
            : "Perfil cadastral"}
          {prospect.activityMatch === "secondary" ? " · atividade secundária" : ""}
        </span>
        <div className="research-prospect-facts">
          <span>
            CNPJ desde <b>{prospect.registry?.openedAt?.slice(0, 4) ?? "A confirmar"}</b>
          </span>
        </div>
        <div className="research-prospect-bottom">
          <span className={`research-priority ${prospect.priority}`}>
            {researchPriorityLabels[prospect.priority]}
          </span>
          <span>
            Ver perfil
            <ArrowRight size={13} />
          </span>
        </div>
      </Link>
    </article>
  );
}
