"use client";
import { ArrowRight, ArrowUpRight, FileSearch, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import {
  researchDate,
  researchPriorityLabels,
  researchSegmentLabels,
} from "@/libs/commercial-research";
import { prospectPageHref } from "@/libs/prospect-navigation";
import type { CommercialResearchView } from "@/types/commercial-research";
import { Pagination } from "./pagination";
import { ProspectCard } from "./prospect-card";
import { CatalogReferences, ResearchLink } from "./research-profile";
import { StateFlag } from "./state-flag";

type ResearchProps = { research: CommercialResearchView; controller: IntelligenceController };
function ResearchCities({ research, controller }: ResearchProps) {
  return (
    <div className="research-city-links" role="group" aria-label="Cidades pesquisadas">
      {research.coverage.map((city) => (
        <button
          className="research-city-link"
          key={city.cityCode}
          type="button"
          disabled={controller.navigating}
          onClick={() => controller.navigate({ region: "5", uf: city.state, city: city.cityCode })}
        >
          <StateFlag code={city.state} name={city.state === "DF" ? "Distrito Federal" : "Goiás"} />
          <span>
            {city.cityName}
            <small>{city.count.toLocaleString("pt-BR")} empresas mapeadas</small>
          </span>
          <ArrowUpRight size={16} />
        </button>
      ))}
    </div>
  );
}
function ResearchCoverage({ research, controller }: ResearchProps) {
  return (
    <div className="research-coverage">
      <FileSearch size={24} />
      <h3>Pesquisa disponível em Brasília e Goiânia</h3>
      <p>
        Selecione uma das cidades para consultar empresas e análise comercial. O levantamento
        cadastral cobre os CNPJs ativos nos CNAEs definidos, dentro dessas cidades. Perfis
        comerciais pesquisados são identificados separadamente.
      </p>
      <ResearchCities research={research} controller={controller} />
    </div>
  );
}
function ResearchEdition({ research }: { research: CommercialResearchView }) {
  const census = research.live?.runs.find(
    (run) => run.kind === "census" && run.status === "completed",
  );
  return (
    <div className="research-edition">
      <span>
        {census
          ? `Cadastro · competência ${census.sourceMonth}`
          : `Pesquisa pública · ${researchDate(research.checkedAt)}`}
      </span>
      <span>{census ? "Atualização por cidade" : `v${research.version}`}</span>
    </div>
  );
}
export function ResearchedProspects({
  research,
  controller,
  projectId,
}: ResearchProps & { projectId: string; canManage?: boolean }) {
  const filters = research.live?.filters ?? {
    query: "",
    segment: "",
    priority: "",
    enrichment: "",
    primaryOnly: false,
    page: 1,
    pageSize: 20,
  };
  const [draft, setDraft] = useState({ base: filters.query, value: filters.query });
  const query = draft.base === filters.query ? draft.value : filters.query;
  const from = `${usePathname()}?${useSearchParams().toString()}`;
  const id = useId();
  const pagination = research.live?.pagination ?? {
    total: research.prospects.length,
    page: 1,
    pageSize: 20,
    pages: 1,
    offset: 0,
    start: research.prospects.length ? 1 : 0,
    end: research.prospects.length,
  };
  const total = research.live?.stats.total ?? research.prospects.length;
  const favoritesOnly = research.live?.favoritesOnly ?? false;
  const apply = (changes: Record<string, string | null>) =>
    controller.navigate({ researchPage: null, researchQuery: query || null, ...changes });
  if (!research.reports.length)
    return <ResearchCoverage research={research} controller={controller} />;
  return (
    <div className="commercial-research">
      <ResearchEdition research={research} />
      <div className="research-intro">
        <div>
          <span className="section-caption">Prospecção · setor automotivo</span>
          <h3 id={`${id}-results`} tabIndex={-1}>
            {favoritesOnly ? "Clientes favoritados" : "Empresas para avaliar"}
          </h3>
        </div>
        <span className="research-count">
          {total.toLocaleString("pt-BR")}
          <small>{total === 1 ? "perfil no recorte" : "perfis no recorte"}</small>
        </span>
      </div>
      <p className="research-description">
        {favoritesOnly
          ? "Sua seleção de empresas neste território. Use a estrela para remover um cliente dos favoritos."
          : "Estabelecimentos encontrados no cadastro e perfis com pesquisa comercial. Abra cada perfil para consultar os dados da empresa, fontes e oportunidades comerciais."}
      </p>
      {research.live && !favoritesOnly && (
        <div className="research-census-summary">
          <span>
            <strong>{research.live.stats.primary.toLocaleString("pt-BR")}</strong> com atividade
            principal no recorte
          </span>
          <span>
            <strong>{research.live.stats.researched.toLocaleString("pt-BR")}</strong> com pesquisa
            comercial
          </span>
          <span>
            <strong>{(total - research.live.stats.researched).toLocaleString("pt-BR")}</strong>{" "}
            aguardando enriquecimento
          </span>
        </div>
      )}
      {!favoritesOnly && (
        <p className="research-period-note">
          Os perfis cadastrais não comprovam atuação em linha leve, especialização ou demanda. O
          período de veículos permanece independente da competência do cadastro. Brasília
          corresponde ao município cadastral que abrange todo o DF.
        </p>
      )}
      <form
        className="research-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          apply({});
        }}
      >
        <label className="search-field">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Buscar empresas pesquisadas"
            placeholder="Empresa, marca, CNPJ ou bairro"
            value={query}
            onChange={(event) => setDraft({ base: filters.query, value: event.target.value })}
          />
          <button
            type="submit"
            aria-label="Buscar na lista de empresas"
            disabled={controller.navigating}
          >
            <ArrowRight size={15} />
          </button>
        </label>
        <label htmlFor={`${id}-segment`}>
          <span>Segmento</span>
          <select
            id={`${id}-segment`}
            value={filters.segment}
            disabled={controller.navigating}
            onChange={(event) => apply({ researchSegment: event.target.value || null })}
          >
            <option value="">Todos</option>
            {Object.entries(researchSegmentLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor={`${id}-priority`}>
          <span>Abordagem sugerida</span>
          <select
            id={`${id}-priority`}
            value={filters.priority}
            disabled={controller.navigating}
            onChange={(event) => apply({ researchPriority: event.target.value || null })}
          >
            <option value="">Todas</option>
            {Object.entries(researchPriorityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </form>
      <div className="research-extra-filters">
        <label>
          Perfil
          <select
            aria-label="Filtrar nível de pesquisa"
            value={filters.enrichment}
            disabled={controller.navigating}
            onChange={(event) => apply({ researchEnrichment: event.target.value || null })}
          >
            <option value="">Cadastro e pesquisa comercial</option>
            <option value="researched">Com pesquisa comercial</option>
            <option value="registry">Somente cadastro</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={filters.primaryOnly}
            disabled={controller.navigating}
            onChange={(event) => apply({ researchPrimary: event.target.checked ? "1" : null })}
          />
          Somente atividade principal
        </label>
        <button
          className="text-button"
          type="button"
          disabled={controller.navigating}
          onClick={() =>
            apply({
              researchQuery: null,
              researchSegment: null,
              researchPriority: null,
              researchEnrichment: null,
              researchPrimary: null,
            })
          }
        >
          Limpar filtros
        </button>
      </div>
      <div className="research-list-meta" aria-live="polite">
        <span>
          {pagination.total.toLocaleString("pt-BR")}{" "}
          {pagination.total === 1 ? "resultado" : "resultados"}
          {controller.navigating ? " · Atualizando…" : ""}
        </span>
        <span>Prioridade é uma hipótese comercial, não uma qualificação de compra.</span>
      </div>
      {favoritesOnly && total === 0 && (
        <div className="bi-empty">
          <h3>Nenhum favorito neste recorte</h3>
          <p>
            Favorite empresas na aba Possíveis clientes. Sua seleção fica disponível apenas para
            você.
          </p>
        </div>
      )}
      <div className="research-prospects" aria-busy={controller.navigating}>
        {research.prospects.map((prospect) => (
          <ProspectCard key={prospect.id} prospect={prospect} projectId={projectId} from={from} />
        ))}
      </div>
      <Pagination
        label="possíveis clientes"
        targetId={`${id}-results`}
        {...pagination}
        pending={controller.navigating}
        onPageChange={(page) => controller.navigate({ researchPage: String(page) })}
        onPageSizeChange={(size) =>
          controller.navigate({ researchSize: String(size), researchPage: null })
        }
      />
      {!research.prospects.length && !(favoritesOnly && total === 0) && (
        <div className="research-no-results">
          <p>Nenhuma empresa corresponde aos filtros.</p>
        </div>
      )}
      <details className="research-method">
        <summary>Critérios da pesquisa e cobertura</summary>
        <p>
          Cadastro de CNPJs ativos no município, com CNAEs principais ou secundários 4520-0/01
          (mecânica), 4520-0/03 (elétrica), 4520-0/04 (alinhamento), 4530-7/01 (atacado de peças
          novas) ou 4530-7/03 (varejo de peças novas). A atividade secundária pode não ser exercida
          atualmente. CNAE não comprova foco em automóveis de linha leve; perfis sem fonte comercial
          permanecem em validação.
        </p>
        <p>
          O levantamento cadastral usa um espelho público dos arquivos da Receita Federal, com
          competência e progresso identificados. A cobertura não inclui empresas informais,
          cadastros sem esses CNAEs ou alterações posteriores à competência. Pesquisa comercial e
          cadastro são níveis distintos; a especialização só é confirmada com fonte. Nenhuma empresa
          foi contatada.
        </p>
        <p>
          Abertura do CNPJ é distinta da fundação da marca. Capital pertence à pessoa jurídica,
          inclusive em filiais, e não mede receita ou orçamento de compras. “Priorizar contato” e
          “Desenvolver conta” são hipóteses de abordagem.
        </p>
        <ResearchLink href={research.catalogUrl}>
          Catálogo 3C Automotive · referências e aplicações
        </ResearchLink>
        <ResearchCities research={research} controller={controller} />
      </details>
    </div>
  );
}
export function CommercialIntelligence({
  research,
  controller,
  projectId,
}: ResearchProps & { projectId: string; canManage?: boolean }) {
  const from = `${usePathname()}?${useSearchParams().toString()}`;
  if (!research.reports.length)
    return <ResearchCoverage research={research} controller={controller} />;
  const profiles = (ids: string[]) => (
    <div className="research-profile-links">
      {ids.map((id) => {
        const prospect = (research.live?.reportReferences ?? research.prospects).find(
          (item) => item.id === id,
        );
        return prospect ? (
          <Link
            prefetch={false}
            key={id}
            href={prospectPageHref(projectId, prospect.databaseId ?? prospect.id, from)}
          >
            {prospect.name}
            <ArrowUpRight size={12} aria-hidden="true" />
          </Link>
        ) : null;
      })}
    </div>
  );
  return (
    <div className="commercial-research">
      <ResearchEdition research={research} />
      <div className="research-ai-label">
        <Sparkles size={14} /> Análise por IA <span>Versão publicada</span>
      </div>
      <p className="research-period-note">
        Elaborada por IA a partir da pesquisa vinculada, com fatos e hipóteses separados. Esta
        versão não é recalculada ao trocar os anos. Use a aba Veículos para séries históricas;
        valide a recomendação antes de agir.
      </p>
      {research.reports.map((report) => (
        <article key={report.cityCode} className="commercial-report">
          {research.live?.reports.find((item) => item.cityCode === report.cityCode) && (
            <p className="research-report-version">
              Gerada em{" "}
              {new Date(
                research.live.reports.find((item) => item.cityCode === report.cityCode)
                  ?.createdAt ?? "",
              ).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}{" "}
              ·{" "}
              {research.live.reports
                .find((item) => item.cityCode === report.cityCode)
                ?.count.toLocaleString("pt-BR")}{" "}
              cadastros no recorte · amostra de{" "}
              {research.live.reports.find((item) => item.cityCode === report.cityCode)?.sampleSize}{" "}
              perfis enviada à IA
            </p>
          )}

          {!research.live?.reports.some((item) => item.cityCode === report.cityCode) && (
            <p className="bi-data-note">
              Versão inicial: análise dos perfis pesquisados na primeira entrega. Não incorpora o
              levantamento cadastral completo. Gere uma nova análise para usar os totais atuais.
            </p>
          )}
          <header>
            <span className="section-caption">
              {report.cityCode === "5300108" ? "Brasília · DF" : "Goiânia · GO"} / Priorização
              comercial
            </span>
            <h3>{report.title}</h3>
            <p>{report.thesis}</p>
          </header>
          <section className="commercial-observations">
            <h4>O que as fontes permitem afirmar</h4>
            {report.observations.map((observation, index) => (
              <div className="commercial-observation" key={observation.text}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <div>
                  <p>{observation.text}</p>
                  {profiles(observation.prospectIds)}
                </div>
              </div>
            ))}
          </section>
          <section className="commercial-priorities">
            <h4>
              Sequência sugerida de abordagem <small>Hipóteses da IA</small>
            </h4>
            {report.plays.map((play) => (
              <div className="commercial-play" key={play.priority}>
                <div className="commercial-play-index">{play.priority}</div>
                <div>
                  <h5>{play.title}</h5>
                  <p>{play.reason}</p>
                  {profiles(play.prospectIds)}
                  <dl>
                    <div>
                      <dt>Como começar</dt>
                      <dd>{play.action}</dd>
                    </div>
                    <div>
                      <dt>Critério para avançar</dt>
                      <dd>{play.success}</dd>
                    </div>
                  </dl>
                  <CatalogReferences products={research.products} ids={play.productIds} />
                </div>
              </div>
            ))}
          </section>
          <section className="commercial-route">
            <h4>Organização das visitas</h4>
            <p>{report.route}</p>
          </section>
          <section className="commercial-limits">
            <h4>Limites desta análise</h4>
            <ul>
              {report.limits.map((limit) => (
                <li key={limit}>{limit}</li>
              ))}
              <li>
                A prioridade usa relação com o catálogo, evidência pública e facilidade de
                validação. Capital social não entra como estimativa de compra. Não foram calculadas
                probabilidades de conversão ou tamanho de mercado.
              </li>
            </ul>
          </section>
        </article>
      ))}
      <details className="research-method">
        <summary>Base utilizada pela IA</summary>
        <p>
          A análise usa os totais cadastrais da cidade e uma amostra de perfis com fontes. A versão
          informa quantos cadastros e perfis foram considerados. Declarações empresariais, dados
          públicos, fontes governamentais e diretórios permanecem identificados nos perfis.
        </p>
        <ResearchLink href={research.catalogUrl}>Catálogo consultado da 3C Automotive</ResearchLink>
        <p>
          Use “Gerar nova análise” para produzir e salvar outra versão com os dados atuais da
          cidade. A geração é solicitada por um administrador; não há monitoramento automático.
        </p>
        <ResearchCities research={research} controller={controller} />
      </details>
    </div>
  );
}
