"use client";
import { ArrowUpRight, Building2, Check, CircleAlert, ExternalLink } from "lucide-react";
import {
  formatCnpj,
  researchCurrency,
  researchDate,
  researchPriorityLabels,
  researchSegmentLabels,
  researchSpecializationLabels,
} from "@/libs/commercial-research";
import type {
  CommercialResearchView,
  ResearchProduct,
  ResearchProspect,
  ResearchRegistry,
} from "@/types/commercial-research";
import { Dialog } from "./dialog";

export function ResearchLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a className="research-source" href={href} target="_blank" rel="noreferrer">
      {children}
      <ArrowUpRight size={13} aria-hidden="true" />
    </a>
  );
}
export function CatalogReferences({
  products,
  ids,
}: {
  products: ResearchProduct[];
  ids: string[];
}) {
  return (
    <div className="catalog-references">
      {ids.map((id) => {
        const product = products.find((item) => item.id === id);
        return product ? (
          <a
            key={id}
            href={product.url}
            target="_blank"
            rel="noreferrer"
            className="catalog-reference"
          >
            <span>
              {product.family}
              <ExternalLink size={12} aria-hidden="true" />
            </span>
            <strong>{product.id}</strong>
            <span>{product.name}</span>
            <small>{product.application}</small>
          </a>
        ) : null;
      })}
    </div>
  );
}
function RegistryDetails({
  registry,
  candidate = false,
}: {
  registry: ResearchRegistry;
  candidate?: boolean;
}) {
  return (
    <div className="research-registry">
      <span className="section-caption">
        {candidate
          ? "CNPJ candidato · vínculo a confirmar"
          : registry.branch
            ? "Estabelecimento · filial"
            : "Estabelecimento · matriz"}
      </span>
      <h4>{registry.legalName}</h4>
      <dl className="research-facts">
        <div>
          <dt>CNPJ</dt>
          <dd>{formatCnpj(registry.cnpj)}</dd>
        </div>
        <div>
          <dt>Abertura do CNPJ</dt>
          <dd>{researchDate(registry.openedAt)}</dd>
        </div>
        <div>
          <dt>Capital social da pessoa jurídica</dt>
          <dd>
            {registry.capital === null ? "Não localizado" : researchCurrency(registry.capital)}
          </dd>
        </div>
        <div>
          <dt>Situação na base consultada</dt>
          <dd>{registry.status}</dd>
        </div>
        <div className="wide">
          <dt>CNAE principal</dt>
          <dd>
            {registry.cnae} · {registry.activity}
          </dd>
        </div>
        <div className="wide">
          <dt>Endereço cadastral</dt>
          <dd>{registry.address}</dd>
        </div>
      </dl>
      <ResearchLink href={registry.source.url}>
        Cadastro via BrasilAPI · {researchDate(registry.source.checkedAt)}
      </ResearchLink>
    </div>
  );
}
export function ResearchProfile({
  prospect,
  research,
  onClose,
}: {
  prospect: ResearchProspect;
  research: CommercialResearchView;
  onClose: () => void;
}) {
  const sources = [...prospect.sources, ...(prospect.registry ? [prospect.registry.source] : [])];
  return (
    <Dialog
      title={prospect.name}
      eyebrow={`${prospect.cityName} · ${researchSegmentLabels[prospect.segment]}`}
      onClose={onClose}
    >
      <div className="research-profile bi-dialog-body">
        <div className="research-profile-summary">
          <span className={`research-priority ${prospect.priority}`}>
            {researchPriorityLabels[prospect.priority]}
          </span>
          <p>{prospect.summary}</p>
          <div className="research-tags">
            <span>{researchSpecializationLabels[prospect.specialization]}</span>
            {prospect.brands.map((brand) => (
              <span key={brand}>{brand}</span>
            ))}
          </div>
          <small>
            Perfil pesquisado em {researchDate(research.checkedAt)}. Não indica contato, compra ou
            relacionamento existente.
          </small>
        </div>
        <section className="research-profile-section">
          <h3>
            <Building2 size={17} /> Empresa e cadastro
          </h3>
          <dl className="research-facts">
            <div className="wide">
              <dt>Fundação declarada da marca</dt>
              <dd>
                {prospect.foundation ? (
                  <>
                    {prospect.foundation.year} · {prospect.foundation.note}
                  </>
                ) : (
                  "Não localizada em fonte verificável. A data de abertura do CNPJ aparece separadamente."
                )}
              </dd>
            </div>
            {prospect.phone && (
              <div>
                <dt>Telefone comercial publicado</dt>
                <dd>{prospect.phone}</dd>
              </div>
            )}
            {prospect.website && (
              <div>
                <dt>Canal próprio</dt>
                <dd>
                  <ResearchLink href={prospect.website}>Site da empresa</ResearchLink>
                </dd>
              </div>
            )}
          </dl>
          {prospect.registry ? (
            <RegistryDetails registry={prospect.registry} />
          ) : (
            <p className="research-caution">
              <CircleAlert size={16} /> Não foi atribuído um CNPJ único à marca. Confirme a pessoa
              jurídica antes de usar dados de capital ou abertura.
            </p>
          )}
          {prospect.registryCandidates.map((registry) => (
            <RegistryDetails key={registry.cnpj} registry={registry} candidate />
          ))}
          <p className="research-footnote">
            Dados cadastrais públicos consultados por um intermediário, sem emissão de comprovante
            oficial. A situação pode ter defasagem. Capital social não é faturamento, limite de
            crédito ou orçamento de compras; em filiais, refere-se à pessoa jurídica.
          </p>
        </section>
        <section className="research-profile-section">
          <h3>
            <Check size={17} /> Evidências do perfil
          </h3>
          {prospect.evidence.map((evidence) => {
            const source = sources.find((item) => item.id === evidence.sourceId);
            return (
              <div key={evidence.text} className="research-evidence">
                <p>{evidence.text}</p>
                {source && <ResearchLink href={source.url}>{source.label}</ResearchLink>}
              </div>
            );
          })}
        </section>
        <section className="research-profile-section">
          <span className="section-caption">Avaliação por IA · hipótese comercial</span>
          <h3>Relação com o catálogo 3C</h3>
          <p>{prospect.rationale}</p>
          <CatalogReferences products={research.products} ids={prospect.productIds} />
          <p className="research-footnote">
            Referências para explorar na conversa. Conferir modelo, ano, motor, câmbio, posição e
            equivalência OEM na ficha antes de cotar. Não há demanda ou compatibilidade confirmada
            para a frota de clientes desta empresa.
          </p>
        </section>
        <section className="research-profile-section">
          <h3>Próximo passo sugerido</h3>
          <p>{prospect.nextStep}</p>
          <ol className="research-questions">
            {prospect.questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ol>
        </section>
        {prospect.gaps.length > 0 && (
          <section className="research-profile-section research-open-points">
            <h3>
              <CircleAlert size={17} /> Pontos a confirmar
            </h3>
            <ul>
              {prospect.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="research-profile-section">
          <h3>Fontes e data da pesquisa</h3>
          <div className="research-sources">
            {sources.map((source) => (
              <div key={source.id}>
                <ResearchLink href={source.url}>{source.label}</ResearchLink>
                <small>
                  {source.kind === "registry"
                    ? "Intermediário de dados cadastrais"
                    : source.kind === "directory"
                      ? "Diretório de terceiros"
                      : source.kind === "government"
                        ? "Publicação governamental"
                        : "Declaração da própria empresa"}{" "}
                  · {researchDate(source.checkedAt)}
                </small>
              </div>
            ))}
          </div>
          <p className="research-footnote">
            Pesquisa inicial v{research.version}. Os perfis não são reconstruções históricas dos
            anos selecionados no BI.
          </p>
        </section>
      </div>
    </Dialog>
  );
}
