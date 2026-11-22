"use client";
import {
  BarChart3,
  Building2,
  CarFront,
  ChevronDown,
  Database,
  ExternalLink,
  FileText,
  FileUp,
  Globe2,
  Info,
  MapPin,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useId, useState } from "react";
import type { IntelligenceController } from "@/hooks/use-intelligence";
import { useIntelligence } from "@/hooks/use-intelligence";
import { periodLabel } from "@/libs/analysis-period";
import { formatNumber, metricLabels, prospectLabels } from "@/libs/intelligence-presentation";
import type { IntelligenceData, IntelligenceRecord } from "@/types/intelligence";
import { AnalysisPeriodFilter } from "./analysis-period-filter";
import { BrazilMap } from "./brazil-map";
import { CarModelsView } from "./car-models-view";
import { Toast } from "./feedback";
import { IntelligenceDialogs } from "./intelligence-dialogs";

const regions = [
  { code: "1", name: "Norte" },
  { code: "2", name: "Nordeste" },
  { code: "3", name: "Sudeste" },
  { code: "4", name: "Sul" },
  { code: "5", name: "Centro-Oeste" },
];
const icons = {
  market: BarChart3,
  prospects: Users,
  vehicles: CarFront,
  opportunities: FileText,
  notes: Building2,
};
function ExternalSource({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="bi-source-link">
      {children}
      <ExternalLink size={13} />
    </a>
  );
}
function EmptyRecords({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  return (
    <div className="bi-empty">
      <Database size={25} />
      <h3>Nenhum registro neste recorte</h3>
      <p>
        Não há {data.tab.kind === "prospects" ? "organizações mapeadas" : "registros cadastrados"}{" "}
        para {data.territory.label} em {periodLabel(data.years)}.
      </p>
      {data.viewer.role === "admin" && (
        <button
          type="button"
          className="button secondary"
          onClick={() => controller.openRecord("new")}
        >
          <Plus size={16} />
          Adicionar registro
        </button>
      )}
    </div>
  );
}
function RecordList({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const records = data.records.filter(
    (record) =>
      (!category || record.category === category) &&
      [record.title, record.category, record.notes, record.details.make, record.details.model]
        .join(" ")
        .toLocaleLowerCase("pt-BR")
        .includes(query.toLocaleLowerCase("pt-BR")),
  );
  const categories = [
    ...new Set(
      [...data.tab.settings.segments, ...data.records.map((r) => r.category)].filter(Boolean),
    ),
  ];
  if (!data.records.length) return <EmptyRecords data={data} controller={controller} />;
  return (
    <>
      <div className="bi-record-filters">
        <label className="search-box">
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar registros"
            placeholder="Buscar registros…"
          />
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filtrar registros por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      <div className="bi-record-count">
        {records.length} de {data.records.length} registros neste recorte
        {data.records.length === 500 ? " · limite de 500 resultados" : ""}
      </div>
      <div className="bi-record-list">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} data={data} controller={controller} />
        ))}
      </div>
      {!records.length && <p className="bi-inline-note">Nenhum registro corresponde à busca.</p>}
    </>
  );
}
function RecordCard({
  record,
  data,
  controller,
}: {
  record: IntelligenceRecord;
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  const exact =
    record.stateCode === data.territory.uf &&
    record.municipalityCode === data.territory.city &&
    record.regionCode === data.territory.region;
  return (
    <article className="bi-record-card">
      <div className="bi-record-top">
        <div className="bi-record-tags">
          {record.category && <span>{record.category}</span>}
          {data.tab.kind === "prospects" && (
            <span className={`bi-prospect-status status-${record.status}`}>
              {prospectLabels[record.status]}
            </span>
          )}
        </div>
        {data.viewer.role === "admin" && (
          <button
            type="button"
            className="text-button"
            onClick={() => controller.openRecord(record)}
            title={exact ? "Editar registro" : "O registro mantém o território de origem ao editar"}
          >
            Editar
          </button>
        )}
      </div>
      <h4>{record.title}</h4>
      <div className="bi-record-location">
        <MapPin size={12} />
        {record.territoryLabel} · {record.year}
      </div>
      {record.value !== null && (
        <div className="bi-record-value">
          <strong>
            {new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 4 }).format(record.value)}
          </strong>
          <span>
            {record.unit} · {metricLabels[record.metric]}
          </span>
        </div>
      )}
      {Object.entries(record.details).filter(([, value]) => value).length > 0 && (
        <dl className="bi-record-details">
          {Object.entries(record.details)
            .filter(([, value]) => value)
            .map(([key, value]) => (
              <div key={key}>
                <dt>
                  {{
                    make: "Marca",
                    model: "Modelo",
                    vehicleType: "Tipo",
                    manufactureYear: "Ano de fabricação",
                    contact: "Contato",
                  }[key] ?? key}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
        </dl>
      )}
      {record.notes && <p className="bi-record-notes">{record.notes}</p>}
      <footer>
        <span>Fonte: {record.sourceName}</span>
        {record.sourceUrl && (
          <ExternalSource href={record.sourceUrl}>Consultar fonte</ExternalSource>
        )}
      </footer>
    </article>
  );
}
function MarketView({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  const estimates = data.records.filter((r) => r.metric === "market_size");
  return (
    <>
      <div className="bi-panel-intro">
        <h3>Mercado endereçável</h3>
        <p>Registre estimativas, unidades e premissas para este negócio e território.</p>
      </div>
      <div className="bi-market-overview">
        <div>
          <span>População de referência</span>
          <strong>
            {data.official.population === null
              ? "Não disponível"
              : formatNumber(data.official.population)}
          </strong>
          <small>pessoas · Censo 2022 · IBGE</small>
        </div>
        <div>
          <span>Estimativas cadastradas</span>
          <strong>
            {estimates.length ? String(estimates.length).padStart(2, "0") : "Sem estimativa"}
          </strong>
          <small>
            {estimates.length
              ? "Consulte as fontes e premissas abaixo."
              : "Cadastre ou importe uma estimativa."}
          </small>
        </div>
      </div>
      <p className="bi-data-note">
        <Info size={15} />A população e a frota descrevem o território. O mercado endereçável
        depende dos segmentos, da oferta e das premissas de cada análise.
      </p>
      {data.tab.settings.segments.length > 0 && (
        <div className="bi-segment-section">
          <span>Segmentos desta análise</span>
          <div>
            {data.tab.settings.segments.map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      )}
      <RecordList data={data} controller={controller} />
    </>
  );
}
function VehiclesView({
  data,
  controller,
}: {
  data: IntelligenceData;
  controller: IntelligenceController;
}) {
  return (
    <CarModelsView
      data={data}
      controller={controller}
      records={
        <RecordList
          data={{
            ...data,
            records: data.records.filter((record) => data.models.recordIds.includes(record.id)),
          }}
          controller={controller}
        />
      }
    />
  );
}
function NoticesView({ data }: { data: IntelligenceData }) {
  const notices = data.notices;
  return (
    <>
      <div className="bi-panel-intro">
        <h3>Editais de contratação pública</h3>
        <p>Consulte objetos publicados no PNCP com os termos definidos para esta aba.</p>
      </div>
      <div className="bi-keyword-list">
        {data.tab.settings.keywords.map((word) => (
          <span key={word}>{word}</span>
        ))}
      </div>
      {!data.territory.uf ? (
        <div className="bi-empty">
          <MapPin size={24} />
          <h3>Selecione uma UF</h3>
          <p>A consulta ao PNCP usa a UF e, quando selecionado, o código do município.</p>
        </div>
      ) : (
        notices && (
          <>
            {notices.unavailable && (
              <p className="bi-data-note">
                <Info size={16} />O PNCP está indisponível ou a consulta retornou parcialmente. Os
                registros locais continuam disponíveis; tente a consulta novamente mais tarde.
              </p>
            )}
            <div className="bi-notice-coverage">
              <span>
                {notices.consulted} publicações consultadas · {notices.items.length}{" "}
                correspondências
              </span>
              <p>
                Pregão eletrônico e dispensa. Primeira página de cada modalidade, até 100
                publicações por ano selecionado. Resultados filtrados pelos termos no objeto; a
                busca não examina os itens anexos.
              </p>
              {(notices.periods ?? []).map((period) => (
                <p key={period.year}>
                  {period.year}: {period.from.split("-").reverse().join("/")} a{" "}
                  {period.to.split("-").reverse().join("/")} · {period.consulted} publicações
                  consultadas{period.unavailable ? " · consulta parcial ou indisponível" : ""}
                </p>
              ))}
              {notices.total > notices.consulted && (
                <p>
                  A fonte indica {formatNumber(notices.total)} publicações nos períodos consultados
                  e modalidades. A amostra consultada não cobre todos os resultados.
                </p>
              )}
            </div>
            <div className="bi-record-list">
              {notices.items.map((item) => (
                <article className="bi-record-card" key={item.id}>
                  <div className="bi-record-top">
                    <span className="bi-origin-tag">PNCP</span>
                    <span className="bi-record-date">
                      {item.publishedAt.slice(0, 10).split("-").reverse().join("/")}
                    </span>
                  </div>
                  <h4>{item.title}</h4>
                  <p>
                    {item.organization} · {item.city}
                  </p>
                  {item.value !== null && (
                    <div className="bi-notice-value">
                      Valor estimado:{" "}
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(item.value)}
                    </div>
                  )}
                  <ExternalSource href={item.url}>Ver publicação oficial</ExternalSource>
                </article>
              ))}
            </div>
            {!notices.items.length && !notices.unavailable && (
              <p className="bi-inline-note">
                Nenhuma correspondência na amostra consultada. Isso não indica ausência de editais
                no mercado. Consulte a busca completa do portal.
              </p>
            )}
          </>
        )
      )}
      <ExternalSource href="https://pncp.gov.br/app/editais">
        Consultar o portal PNCP
      </ExternalSource>
    </>
  );
}
function Sources({ data }: { data: IntelligenceData }) {
  return (
    <details className="bi-sources">
      <summary>
        <Database size={16} />
        <span>Fontes e cobertura</span>
        <ChevronDown size={15} />
      </summary>
      <div>
        <ExternalSource href="https://sidra.ibge.gov.br/tabela/4714">
          IBGE · Censo 2022 · população
        </ExternalSource>
        <p>
          População de 2022, independente do ano do filtro. Não é estimativa de consumo ou de
          clientes.
        </p>
        <ExternalSource
          href={`https://www.gov.br/transportes/pt-br/assuntos/transito/conteudo-Senatran/frota-de-veiculos-${[2022, 2023, 2024].includes(data.year) ? data.year : 2024}`}
        >
          Senatran · frota por município e tipo
        </ExternalSource>
        <p>
          Posição de dezembro de 2022, 2023 e 2024. No recorte e período selecionados:{" "}
          {data.official.coveredMunicipalities} de {data.official.municipalities} códigos municipais
          com frota vinculada. Totais de UF preservam todas as linhas da fonte, inclusive municípios
          sem vínculo de nome.
        </p>
        <p>
          O mapa mostra somente automóveis. Para vários anos, usa a média dos estoques de dezembro,
          com dados em todos os anos selecionados. Esse indicador não representa vendas.
        </p>
        <ExternalSource href="https://servicodados.ibge.gov.br/api/docs/malhas?versao=3">
          IBGE · malhas de UFs e municípios
        </ExternalSource>
        {data.project.slug === "pecas-automotivas" && (
          <p>
            Modelos: rankings nacionais de automóveis da Fenabrave, 2022–2024, com os 50 primeiros
            de cada ano. Os links dos boletins ficam na aba Veículos. Dados por UF e município
            dependem de registros locais com fonte.
          </p>
        )}
        <ExternalSource href="https://www.gov.br/receitafederal/dados">
          Receita Federal · dados públicos de empresas
        </ExternalSource>
        <p>
          Referência para mapear estabelecimentos por segmento. A base completa de empresas não foi
          carregada; cadastre ou importe os registros selecionados.
        </p>
        {data.project.slug === "clinica-estetica" && (
          <ExternalSource href="https://estabelecimentos.datasus.gov.br/pages/estabelecimentos/consulta.jsp">
            CNES · consulta de estabelecimentos
          </ExternalSource>
        )}
        <ExternalSource href="https://pncp.gov.br/api/consulta/swagger-ui/index.html">
          PNCP · documentação da consulta pública
        </ExternalSource>
        <p>
          O painel de editais consulta a API ao abrir a aba. Não substitui a leitura do edital e dos
          anexos.
        </p>
      </div>
    </details>
  );
}
export function Intelligence({ data }: { data: IntelligenceData }) {
  const controller = useIntelligence(data);
  const tabGroup = useId();
  const canManage = data.viewer.role === "admin";
  const [mapHidden, setMapHidden] = useState(false);
  function navigateTab(index: number) {
    const tab = data.tabs[(index + data.tabs.length) % data.tabs.length];
    controller.navigate({ tab: tab.id });
    document.getElementById(`${tabGroup}-${tab.id}`)?.focus();
  }
  return (
    <div className="page-content bi-page">
      <div className="workspace-page-heading bi-page-heading">
        <div>
          <span className="section-index">02 / INTELIGÊNCIA</span>
          <h1>Inteligência de mercado</h1>
          <p className="bi-project-context">
            <span className={`project-dot project-dot-${data.project.color}`} />
            {data.project.name}
          </p>
        </div>
        <div className="analysis-period-heading">
          <span className="section-caption">Período da análise</span>
          <div>
            <strong>{periodLabel(data.years)}</strong>
            <AnalysisPeriodFilter
              key={data.project.id}
              years={data.years}
              controller={controller}
            />
          </div>
        </div>
      </div>
      <div className="analysis-navigation">
        <label className="analysis-mobile-picker">
          <span>Análise</span>
          <select
            aria-label="Selecionar análise"
            value={data.tab.id}
            disabled={controller.navigating}
            onChange={(event) => controller.navigate({ tab: event.target.value })}
          >
            {data.tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
        </label>
        <div role="tablist" aria-label="Abas de análise" className="bi-tabs">
          {data.tabs.map((tab, index) => {
            const Icon = icons[tab.kind];
            return (
              <button
                type="button"
                role="tab"
                key={tab.id}
                id={`${tabGroup}-${tab.id}`}
                aria-selected={tab.id === data.tab.id}
                aria-controls={`${tabGroup}-panel`}
                tabIndex={tab.id === data.tab.id ? 0 : -1}
                onClick={() => controller.navigate({ tab: tab.id })}
                onKeyDown={(event) => {
                  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
                    event.preventDefault();
                    navigateTab(
                      event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? data.tabs.length - 1
                          : index + (event.key === "ArrowRight" ? 1 : -1),
                    );
                  }
                }}
              >
                <Icon size={15} />
                {tab.name}
                {tab.id === data.tab.id && (
                  <motion.span layoutId={`${tabGroup}-indicator`} className="bi-tab-indicator" />
                )}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="analysis-focus-toggle"
          aria-pressed={mapHidden}
          onClick={() => setMapHidden(!mapHidden)}
        >
          {mapHidden ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          {mapHidden ? "Mostrar mapa" : "Expandir análise"}
        </button>
        {canManage && (
          <button
            type="button"
            className="icon-button analysis-add-tab"
            aria-label="Adicionar aba de análise"
            title="Adicionar aba de análise"
            onClick={() => controller.openTab("new")}
          >
            <Plus size={18} />
          </button>
        )}
      </div>
      <div
        className={`bi-workspace ${mapHidden ? "analysis-expanded" : ""}`}
        aria-busy={controller.navigating}
      >
        <div className="bi-map-column">
          <details className="territory-search">
            <summary>
              <Search size={15} />
              <span>Localizar território</span>
              <ChevronDown size={15} />
            </summary>
            <div className="bi-scope-toolbar" role="group" aria-label="Recorte da análise">
              <label>
                <span>Região</span>
                <select
                  value={data.territory.region ?? "BR"}
                  aria-label="Região da análise"
                  disabled={controller.navigating}
                  onChange={(e) =>
                    controller.navigate({ region: e.target.value, uf: null, city: null })
                  }
                >
                  <option value="BR">Brasil · todas as regiões</option>
                  {regions.map((r) => (
                    <option value={r.code} key={r.code}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Unidade da federação</span>
                <select
                  value={data.territory.uf ?? ""}
                  disabled={controller.navigating}
                  aria-label="UF da análise"
                  onChange={(e) =>
                    controller.navigate({
                      uf: e.target.value || null,
                      city: null,
                      region: e.target.value ? null : (data.territory.region ?? "BR"),
                    })
                  }
                >
                  <option value="">Todas as UFs da região</option>
                  {data.states
                    .filter((s) => !data.territory.region || s.region === data.territory.region)
                    .map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                </select>
              </label>
              <label className="bi-city-filter">
                <span>Município / recorte local</span>
                <select
                  value={data.territory.city ?? ""}
                  aria-label="Município da análise"
                  disabled={!data.territory.uf || controller.navigating}
                  onChange={(e) =>
                    controller.navigate({ city: e.target.value || null, map: "municipalities" })
                  }
                >
                  <option value="">{data.territory.uf ? "Toda a UF" : "Selecione uma UF"}</option>
                  {data.cities.map((city) => (
                    <option key={city.code} value={city.code}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </details>
          <BrazilMap
            key={`${data.project.id}-${data.territory.uf ?? "BR"}-${data.mapView}`}
            data={data}
            controller={controller}
          />
          <div className="bi-selected-territory">
            <Globe2 size={17} />
            <div>
              <span>Recorte selecionado</span>
              <strong>{data.territory.label}</strong>
              <small>
                {data.territory.city
                  ? `Código IBGE ${data.territory.city}`
                  : data.territory.level === "country"
                    ? "Visão nacional"
                    : data.territory.level === "region"
                      ? "Grande região"
                      : "Unidade da federação"}
              </small>
            </div>
            <button
              type="button"
              className="text-button"
              onClick={() => controller.navigate({ uf: null, city: null, region: "BR" })}
            >
              Limpar recorte
            </button>
          </div>
        </div>
        <section
          className="bi-detail-column"
          aria-label={`Análises de ${data.project.name} em ${data.territory.label}`}
        >
          <div className="report-heading">
            <div className="analysis-territory-heading">
              <span className="section-caption">
                <MapPin size={13} />
                {data.territory.city
                  ? `Município · IBGE ${data.territory.city}`
                  : data.territory.level === "country"
                    ? "Visão nacional"
                    : data.territory.level === "region"
                      ? "Grande região"
                      : `Unidade da federação · ${data.territory.uf}`}
              </span>
              <h2>{data.territory.label}</h2>
              <p>
                {periodLabel(data.years)} <span> / </span>{" "}
                {data.years.length === 1
                  ? "1 ano de referência"
                  : `${data.years.length} anos de referência`}
              </p>
            </div>
            <div className="bi-analysis-actions">
              <span className="section-caption">
                {data.records.length}
                {data.records.length === 500 ? "+" : ""}{" "}
                {data.records.length === 1 ? "registro cadastrado" : "registros cadastrados"}
              </span>
              {canManage && (
                <div>
                  <button
                    className="icon-button"
                    type="button"
                    aria-label="Configurar aba atual"
                    title="Configurar aba atual"
                    onClick={() => controller.openTab(data.tab)}
                  >
                    <Settings2 size={16} />
                  </button>
                  <button
                    className="button secondary"
                    type="button"
                    onClick={controller.openImport}
                  >
                    <FileUp size={15} />
                    Importar
                  </button>
                  <button
                    className="button primary"
                    type="button"
                    onClick={() => controller.openRecord("new")}
                  >
                    <Plus size={15} />
                    Registro
                  </button>
                </div>
              )}
            </div>
          </div>
          <motion.div
            key={`${data.project.id}-${data.tab.id}-${data.territory.label}-${data.years.join(",")}-${data.metric}`}
            role="tabpanel"
            id={`${tabGroup}-panel`}
            aria-labelledby={`${tabGroup}-${data.tab.id}`}
            tabIndex={0}
            className="bi-tab-content"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {data.tab.kind === "market" ? (
              <MarketView data={data} controller={controller} />
            ) : data.tab.kind === "vehicles" ? (
              <VehiclesView data={data} controller={controller} />
            ) : data.tab.kind === "opportunities" ? (
              <>
                <NoticesView data={data} />
                <div className="bi-section-title">
                  <h4>Oportunidades cadastradas</h4>
                </div>
                <RecordList data={data} controller={controller} />
              </>
            ) : (
              <>
                <div className="bi-panel-intro">
                  <h3>{data.tab.name}</h3>
                  <p>
                    {data.tab.kind === "prospects"
                      ? "Mapeie organizações e acompanhe a situação de abordagem por segmento."
                      : "Registre hipóteses, critérios e formas de abordar este mercado."}
                  </p>
                </div>
                {data.tab.settings.segments.length > 0 && (
                  <div className="bi-keyword-list">
                    {data.tab.settings.segments.map((segment) => (
                      <span key={segment}>{segment}</span>
                    ))}
                  </div>
                )}
                <RecordList data={data} controller={controller} />
              </>
            )}
          </motion.div>
          <Sources data={data} />
        </section>
      </div>
      <IntelligenceDialogs data={data} controller={controller} />
      <AnimatePresence>
        {controller.notice && (
          <Toast key="notice" message={controller.notice} onClose={controller.dismissNotice} />
        )}
      </AnimatePresence>
    </div>
  );
}
