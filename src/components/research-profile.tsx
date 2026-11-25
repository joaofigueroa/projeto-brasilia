import { ArrowUpRight, ExternalLink } from "lucide-react";
import { formatCnpj, researchCurrency, researchDate } from "@/libs/commercial-research";
import type { ResearchProduct, ResearchRegistry } from "@/types/commercial-research";

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
        if (product?.catalogPage) {
          return (
            <div className="catalog-reference" key={id}>
              <span>{product.family}</span>
              <strong>{product.name}</strong>
              <small>{product.application}</small>
              <small>Catálogo VMS 2026 · p. {product.catalogPage}</small>
            </div>
          );
        }
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
export function RegistryDetails({
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
          <dd>{registry.openedAt ? researchDate(registry.openedAt) : "Não informada"}</dd>
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
        {registry.source.label} · {researchDate(registry.source.checkedAt)}
      </ResearchLink>
    </div>
  );
}
