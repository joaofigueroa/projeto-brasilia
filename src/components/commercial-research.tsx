"use client";
import { ArrowRight, ArrowUpRight, FileSearch, Search, Sparkles } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useId, useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import {
  filterResearchProspects,
  researchCurrency,
  researchDate,
  researchPriorityLabels,
  researchSegmentLabels,
  researchSpecializationLabels,
} from "@/libs/commercial-research";
import type { CommercialResearchView, ResearchProspect } from "@/types/commercial-research";
import { CatalogReferences, ResearchLink, ResearchProfile } from "./research-profile";
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
            <small>{city.count} perfis pesquisados</small>
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
        Selecione uma das cidades para consultar empresas e análise comercial. As listas são uma
        amostra pesquisada, sem cobertura de todos os estabelecimentos.
      </p>
      <ResearchCities research={research} controller={controller} />
    </div>
  );
}
function ResearchEdition({ research }: { research: CommercialResearchView }) {
  return (
    <div className="research-edition">
      <span>Pesquisa pública · {researchDate(research.checkedAt)}</span>
      <span>v{research.version}</span>
    </div>
  );
}
export function ResearchedProspects({ research, controller }: ResearchProps) {
  const [query, setQuery] = useState("");
  const [segment, setSegment] = useState("");
  const [priority, setPriority] = useState("");
  const [selected, setSelected] = useState<ResearchProspect | null>(null);
  const id = useId();
  const filtered = filterResearchProspects(research.prospects, { query, segment, priority });
  if (!research.prospects.length)
    return <ResearchCoverage research={research} controller={controller} />;
  return (
    <div className="commercial-research">
      <ResearchEdition research={research} />
      <div className="research-intro">
        <div>
          <span className="section-caption">Prospecção · setor automotivo</span>
          <h3>Empresas para avaliar</h3>
        </div>
        <span className="research-count">
          {research.prospects.length}
          <small>perfis no recorte</small>
        </span>
      </div>
      <p className="research-description">
        Seleção inicial de oficinas, distribuidores e autopeças relacionados à oferta da 3C. Abra o
        perfil para consultar cadastro, fontes, referências de produtos e uma sugestão de abordagem.
      </p>
      <p className="research-period-note">
        Perfis atuais da pesquisa, independentes do filtro de anos. Os indicadores históricos do BI
        mantêm o período selecionado.
        {research.prospects.some((prospect) => prospect.state === "DF")
          ? " Brasília corresponde ao município cadastral que abrange todo o DF."
          : ""}
      </p>
      <div className="research-toolbar">
        <label className="search-field">
          <Search size={15} aria-hidden="true" />
          <input
            aria-label="Buscar empresas pesquisadas"
            placeholder="Empresa, marca, CNPJ ou bairro"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label htmlFor={`${id}-segment`}>
          <span>Segmento</span>
          <select
            id={`${id}-segment`}
            value={segment}
            onChange={(event) => setSegment(event.target.value)}
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
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">Todas</option>
            {Object.entries(researchPriorityLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="research-list-meta" aria-live="polite">
        <span>
          {filtered.length} {filtered.length === 1 ? "empresa" : "empresas"}
        </span>
        <span>Prioridade é uma hipótese de IA, não uma qualificação de compra.</span>
      </div>
      <div className="research-prospects">
        {filtered.map((prospect) => (
          <button
            key={prospect.id}
            type="button"
            className={`research-prospect ${prospect.priority}`}
            onClick={() => setSelected(prospect)}
            aria-label={`Ver perfil de ${prospect.name}`}
          >
            <div className="research-prospect-top">
              <span className="section-caption">
                {researchSegmentLabels[prospect.segment]} · {prospect.cityName}
              </span>
              <ArrowUpRight size={17} aria-hidden="true" />
            </div>
            <strong>{prospect.name}</strong>
            <span className="research-prospect-specialization">
              {researchSpecializationLabels[prospect.specialization]}
              {prospect.brands.length ? ` · ${prospect.brands.join(" / ")}` : ""}
            </span>
            <div className="research-prospect-facts">
              <span>
                CNPJ desde <b>{prospect.registry?.openedAt.slice(0, 4) ?? "A confirmar"}</b>
              </span>
              <span>
                Capital social{" "}
                <b>
                  {prospect.registry?.capital == null
                    ? "A confirmar"
                    : researchCurrency(prospect.registry.capital)}
                </b>
                {prospect.registry?.branch && <small>Da pessoa jurídica, não da filial</small>}
              </span>
            </div>
            <div className="research-prospect-bottom">
              <span className={`research-priority ${prospect.priority}`}>
                {researchPriorityLabels[prospect.priority]}
              </span>
              <span>
                Ver perfil <ArrowRight size={13} />
              </span>
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="research-no-results">
          <p>Nenhuma empresa corresponde aos filtros.</p>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setQuery("");
              setSegment("");
              setPriority("");
            }}
          >
            Limpar filtros da lista
          </button>
        </div>
      )}
      <details className="research-method">
        <summary>Critérios da pesquisa e cobertura</summary>
        <p>
          Seleção por presença local, atividade declarada e relação com as famílias do catálogo. Não
          é um censo nem uma lista de clientes ativos. “Priorizar contato” indica evidência
          comercial mais direta; “Desenvolver conta” requer entendimento do canal; “Validar perfil”
          indica pendências de identidade, especialização ou operação.
        </p>
        <p>
          A abertura do estabelecimento é distinta da fundação da marca. Capital social pertence à
          pessoa jurídica e não representa receita ou poder de compra. Dados cadastrais foram
          obtidos via BrasilAPI, com origem em bases públicas, e podem ter defasagem. Nenhuma
          empresa foi contatada nesta pesquisa.
        </p>
        <ResearchLink href={research.catalogUrl}>
          Catálogo 3C Automotive · {research.catalogCount.toLocaleString("pt-BR")} produtos na
          consulta
        </ResearchLink>
        <p>
          Famílias consultadas: {research.catalogFamilies.join(", ")}. As referências em cada perfil
          são exemplos de ajuste técnico a validar, não uma previsão de demanda.
        </p>
        <ResearchCities research={research} controller={controller} />
      </details>
      <AnimatePresence>
        {selected && (
          <ResearchProfile
            prospect={selected}
            research={research}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
export function CommercialIntelligence({ research, controller }: ResearchProps) {
  const [selected, setSelected] = useState<ResearchProspect | null>(null);
  if (!research.reports.length)
    return <ResearchCoverage research={research} controller={controller} />;
  const profiles = (ids: string[]) => (
    <div className="research-profile-links">
      {ids.map((id) => {
        const prospect = research.prospects.find((item) => item.id === id);
        return prospect ? (
          <button type="button" key={id} onClick={() => setSelected(prospect)}>
            {prospect.name}
            <ArrowUpRight size={12} aria-hidden="true" />
          </button>
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
          Pesquisa inicial v{research.version}, publicada em {researchDate(research.checkedAt)}. Os
          perfis vinculam declarações empresariais, cadastros públicos via BrasilAPI e publicações
          governamentais quando disponíveis. Diretórios de terceiros e divergências permanecem
          identificados no perfil.
        </p>
        <ResearchLink href={research.catalogUrl}>Catálogo consultado da 3C Automotive</ResearchLink>
        <p>
          A análise está armazenada com a aplicação e é atualizada por uma nova versão da pesquisa.
          Não há geração automática ou monitoramento contínuo nesta etapa.
        </p>
        <ResearchCities research={research} controller={controller} />
      </details>
      <AnimatePresence>
        {selected && (
          <ResearchProfile
            prospect={selected}
            research={research}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
