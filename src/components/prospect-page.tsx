"use client";
import { ArrowLeft, Building2, CircleAlert, Globe2, MapPin, Pencil, Phone } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import {
  formatCnpj,
  researchDate,
  researchPriorityLabels,
  researchSegmentLabels,
  wineProjectId,
} from "@/libs/commercial-research";
import type { getProspectPage } from "@/server/services/prospect-page";
import { Dialog } from "./dialog";
import { ProspectFavoriteButton } from "./prospect-favorite-button";
import { ProspectFollowup } from "./prospect-followup";
import { ProspectGoogleMap } from "./prospect-google-map";
import { ProspectProfileEditor } from "./prospect-profile-editor";
import { ProspectSpecialization } from "./prospect-specialization";
import { CatalogReferences, RegistryDetails, ResearchLink } from "./research-profile";
import { StateFlag } from "./state-flag";

type Data = NonNullable<Awaited<ReturnType<typeof getProspectPage>>>;
const sections = [
  { id: "crm", label: "Acompanhamento" },
  { id: "registry", label: "Cadastro" },
  { id: "commercial", label: "Oportunidade comercial" },
  { id: "sources", label: "Fontes e evidências" },
] as const;
export function ProspectPage({
  data,
  backHref,
  initialSection,
}: {
  data: Data;
  backHref: string;
  initialSection?: string;
}) {
  const { prospect, project, viewer } = data;
  const wine = project.id === wineProjectId;
  const [section, setSection] = useState<string>(
    initialSection && sections.some((item) => item.id === initialSection)
      ? initialSection
      : wine
        ? "commercial"
        : "registry",
  );
  const [editing, setEditing] = useState(false);
  const tabId = useId();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const sources = [
    ...new Map(
      [...prospect.sources, ...(prospect.registry ? [prospect.registry.source] : [])].map(
        (source) => [`${source.id}:${source.url}:${source.checkedAt}`, source],
      ),
    ).values(),
  ];
  function selectTab(index: number) {
    const next = sections[(index + sections.length) % sections.length];
    setSection(next.id);
    document.getElementById(`${tabId}-${next.id}`)?.focus();
  }
  return (
    <div className="prospect-page page-content">
      <Link className="prospect-back" href={backHref}>
        <ArrowLeft size={15} />
        Voltar à pesquisa
      </Link>
      <header className="prospect-page-heading">
        <div>
          <span className="section-caption">{project.name} / Prospecção</span>
          <h1>{prospect.name}</h1>
          <div className="prospect-page-location">
            <StateFlag
              code={prospect.state}
              name={prospect.state === "DF" ? "Distrito Federal" : "Goiás"}
            />
            <span>
              {prospect.cityName} · {prospect.state}
            </span>
            <span>·</span>
            <span>{researchSegmentLabels[prospect.segment]}</span>
          </div>
        </div>
        <div className="prospect-page-actions">
          <ProspectFavoriteButton
            key={`${prospect.databaseId}-${prospect.isFavorite}`}
            projectId={project.id}
            prospectId={prospect.databaseId ?? ""}
            name={prospect.name}
            initialFavorite={prospect.isFavorite}
          />
          {viewer.role === "admin" && (
            <button className="button secondary" type="button" onClick={() => setEditing(true)}>
              <Pencil size={14} />
              Editar perfil
            </button>
          )}
        </div>
      </header>
      <div className="prospect-overview">
        <section className="prospect-overview-summary" aria-labelledby={`${tabId}-overview`}>
          <div className="prospect-overview-status">
            <span className={`research-priority ${prospect.priority}`}>
              {researchPriorityLabels[prospect.priority]}
            </span>
            <span className="prospect-research-level">
              {prospect.enrichmentLevel === "researched"
                ? "Com pesquisa comercial"
                : "Perfil cadastral"}
            </span>
          </div>
          <h2 id={`${tabId}-overview`}>Perfil da empresa</h2>
          <p className="prospect-page-description">{prospect.summary}</p>
          {!wine && <ProspectSpecialization prospect={prospect} />}
          <dl className="prospect-contact-list">
            {prospect.phone && (
              <div>
                <dt>
                  <Phone size={14} />
                  Telefone comercial
                </dt>
                <dd>{prospect.phone}</dd>
              </div>
            )}
            {prospect.website && (
              <div>
                <dt>
                  <Globe2 size={14} />
                  Site da empresa
                </dt>
                <dd>
                  <ResearchLink href={prospect.website}>
                    {new URL(prospect.website).hostname.replace(/^www\./, "")}
                  </ResearchLink>
                </dd>
              </div>
            )}
            {prospect.businessAddress && (
              <div className="wide">
                <dt>
                  <MapPin size={14} /> Localização comercial
                </dt>
                <dd>{prospect.businessAddress}</dd>
              </div>
            )}
            {prospect.registry && (
              <>
                <div className="wide">
                  <dt>
                    <MapPin size={14} />
                    Endereço cadastral
                  </dt>
                  <dd>{prospect.registry.address}</dd>
                </div>
                <div>
                  <dt>
                    <Building2 size={14} />
                    CNPJ
                  </dt>
                  <dd>{formatCnpj(prospect.registry.cnpj)}</dd>
                </div>
              </>
            )}
          </dl>
        </section>
        <div className="prospect-page-map">
          <ProspectGoogleMap prospect={prospect} />
        </div>
      </div>
      <div className="prospect-section-tabs" role="tablist" aria-label="Informações do cliente">
        {sections.map((item, index) => (
          <button
            key={item.id}
            id={`${tabId}-${item.id}`}
            type="button"
            role="tab"
            aria-selected={section === item.id}
            aria-controls={`${tabId}-panel`}
            tabIndex={section === item.id ? 0 : -1}
            onClick={() => setSection(item.id)}
            onKeyDown={(event) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                selectTab(
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? sections.length - 1
                      : index + (event.key === "ArrowRight" ? 1 : -1),
                );
              }
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <motion.section
        key={section}
        role="tabpanel"
        id={`${tabId}-panel`}
        aria-labelledby={`${tabId}-${section}`}
        tabIndex={0}
        className="prospect-section-panel"
        initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16 }}
      >
        {section === "crm" && (
          <ProspectFollowup
            key={`${data.crm.version}:${data.crm.canManage}:${data.crm.history.entries[0]?.id}`}
            projectId={project.id}
            prospectId={prospect.databaseId ?? ""}
            data={data.crm}
          />
        )}
        {section === "registry" && (
          <div className="prospect-detail-grid">
            <section>
              <span className="section-caption">Identidade empresarial</span>
              <h2>Dados cadastrais</h2>
              {prospect.registry ? (
                <RegistryDetails registry={prospect.registry} />
              ) : (
                <p>Não há um CNPJ confirmado para esta marca.</p>
              )}
              {prospect.registryCandidates.map((registry) => (
                <RegistryDetails key={registry.cnpj} registry={registry} candidate />
              ))}
            </section>
            <aside className="prospect-detail-aside">
              <h3>Fundação da marca</h3>
              <p>
                {prospect.foundation
                  ? `${prospect.foundation.year} · ${prospect.foundation.note}`
                  : "Não localizada em fonte verificável. Abertura do CNPJ e fundação da marca são informações distintas."}
              </p>
              <h3>Como interpretar o cadastro</h3>
              <p>
                Capital social pertence à pessoa jurídica, inclusive em filiais. Não representa
                faturamento ou orçamento de compras.
              </p>
              {!wine && (
                <p>
                  O cadastro pode ter defasagem. A atividade declarada não comprova demanda nem
                  atuação em automóveis de passeio.
                </p>
              )}
            </aside>
          </div>
        )}
        {section === "commercial" && (
          <div className="prospect-detail-grid">
            <section>
              <span className="section-caption">Hipótese comercial</span>
              <h2>{wine ? "Relação com o catálogo VMS" : "Relação com o catálogo 3C"}</h2>
              <p>{prospect.rationale}</p>
              <CatalogReferences products={data.products} ids={prospect.productIds} />
              <p className="research-footnote">
                {wine
                  ? "Confirme interesse, disponibilidade dos rótulos e condições comerciais com o comprador."
                  : "Conferir modelo, ano, motor, câmbio e equivalência OEM antes de cotar. Não há demanda confirmada para a frota de clientes da empresa."}
              </p>
            </section>
            <aside className="prospect-detail-aside">
              <h3>Próximo passo sugerido</h3>
              <p>{prospect.nextStep}</p>
              <ol className="research-questions">
                {prospect.questions.map((question) => (
                  <li key={question}>{question}</li>
                ))}
              </ol>
              {prospect.gaps.length > 0 && (
                <>
                  <h3>
                    <CircleAlert size={15} />
                    Pontos a confirmar
                  </h3>
                  <ul>
                    {prospect.gaps.map((gap) => (
                      <li key={gap}>{gap}</li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </div>
        )}
        {section === "sources" && (
          <div className="prospect-detail-grid">
            <section>
              <span className="section-caption">Pesquisa comercial</span>
              <h2>Evidências do perfil</h2>
              {prospect.evidence.map((item) => {
                const source = sources.find((entry) => entry.id === item.sourceId);
                return (
                  <div className="research-evidence" key={`${item.sourceId}:${item.text}`}>
                    <p>{item.text}</p>
                    {source && <ResearchLink href={source.url}>{source.label}</ResearchLink>}
                  </div>
                );
              })}
            </section>
            <aside className="prospect-detail-aside">
              <h3>Fontes consultadas</h3>
              <div className="research-sources">
                {sources.map((source) => (
                  <div key={`${source.id}:${source.url}:${source.checkedAt}`}>
                    <ResearchLink href={source.url}>{source.label}</ResearchLink>
                    <small>
                      {source.kind === "registry"
                        ? "Dados cadastrais"
                        : source.kind === "company"
                          ? "Declaração da empresa"
                          : source.kind === "government"
                            ? "Publicação governamental"
                            : "Diretório de terceiros"}{" "}
                      · {researchDate(source.checkedAt)}
                    </small>
                  </div>
                ))}
              </div>
              <p className="research-footnote">
                Os perfis refletem a data da consulta, sem reconstruir os anos selecionados nos
                indicadores do BI.
              </p>
            </aside>
          </div>
        )}
      </motion.section>
      <AnimatePresence>
        {editing && (
          <Dialog
            title="Editar perfil comercial"
            eyebrow={prospect.name}
            variant="modal"
            onClose={() => setEditing(false)}
          >
            <ProspectProfileEditor
              prospect={prospect}
              projectId={project.id}
              onCancel={() => setEditing(false)}
              onSaved={() => {
                setEditing(false);
                router.refresh();
              }}
            />
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
