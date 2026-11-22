import { describe, expect, it } from "vitest";
import { buildCensusProfile, censusEligibility } from "@/libs/company-census";
import { paginationRange } from "@/libs/pagination";
import { censusWhere } from "@/server/integrations/company-census";
import {
  researchListFiltersSchema,
  researchProspectSchema,
} from "@/validators/commercial-research";

const row = {
  cnpj_basico: "12345678",
  cnpj_ordem: "0001",
  cnpj_dv: "95",
  nome_fantasia: "Oficina Teste",
  situacao_cadastral: "02",
  data_inicio_atividade: "20090125",
  cnae_fiscal_principal: "4520001",
  cnae_fiscal_secundaria: null,
  uf: "DF",
  municipio: "9701",
  identificador_matriz_filial: "1",
  logradouro: "Rua de teste",
  numero: "10",
  bairro: "Teste",
  ddd1: "61",
  telefone1: "30000000",
};
const company = { razao_social: "OFICINA TESTE LTDA", capital_social: "12345,67" };
describe("public business census", () => {
  it("keeps exact city, active status and main or secondary activity boundaries", () => {
    expect(censusEligibility(row)?.city.code).toBe("5300108");
    expect(censusEligibility({ ...row, uf: "GO", municipio: "9373" })?.city.code).toBe("5208707");
    expect(censusEligibility({ ...row, uf: "GO", municipio: "9223" })).toBeNull();
    expect(censusEligibility({ ...row, situacao_cadastral: "08" })).toBeNull();
    expect(censusEligibility({ ...row, cnae_fiscal_principal: "4530704" })).toBeNull();
    expect(
      censusEligibility({
        ...row,
        cnae_fiscal_principal: "4530704",
        cnae_fiscal_secundaria: "1111111,4530701,2222222",
      })?.activityMatch,
    ).toBe("secondary");
  });
  it("preserves registry facts, provenance and unknown specialization without inferring sales", () => {
    const profile = researchProspectSchema.parse(
      buildCensusProfile(
        row,
        company,
        "ArthurKrieger/cnpj-dados-receita-brasil-2026-10",
        "2026-10",
      ),
    );
    expect(profile.registry?.openedAt).toBe("2009-01-25");
    expect(profile.registry?.capital).toBe(12345.67);
    expect(profile.foundation).toBeNull();
    expect(profile.specialization).toBe("unconfirmed");
    expect(profile.enrichmentLevel).toBe("registry");
    expect(profile.registry?.source.url).toContain("huggingface.co/datasets/");
    expect(profile.brands).toEqual([]);
    expect(profile.google).toBeNull();
  });
  it("uses the legal name when the fantasy name is absent or a placeholder and preserves missing values", () => {
    const profile = buildCensusProfile(
      { ...row, nome_fantasia: "******", data_inicio_atividade: "20260231" },
      { ...company, capital_social: null },
      "ArthurKrieger/cnpj-dados-receita-brasil-2026-10",
      "2026-10",
    );
    expect(profile.name).toBe(company.razao_social);
    expect(profile.registry?.capital).toBeNull();
    expect(profile.registry?.openedAt).toBeNull();
  });
  it("rejects out-of-scope source rows and does not send user-defined queries upstream", () => {
    expect(() => buildCensusProfile({ ...row, uf: "SP" }, company, "source", "2026-10")).toThrow();
    expect(censusWhere("5208707")).toContain("\"municipio\"='9373'");
    expect(censusWhere("5208707")).toContain('"cnae_fiscal_secundaria" LIKE');
    expect(() => censusWhere("5201405")).toThrow();
  });
});
describe("pagination", () => {
  it("calculates last and empty pages and clamps stale page numbers after filtering", () => {
    expect(paginationRange(15681, 785, 20)).toMatchObject({
      page: 785,
      start: 15681,
      end: 15681,
      pages: 785,
    });
    expect(paginationRange(3, 785, 20)).toMatchObject({ page: 1, start: 1, end: 3, pages: 1 });
    expect(paginationRange(0, 5, 20)).toMatchObject({ page: 1, start: 0, end: 0, pages: 1 });
    expect(paginationRange(100, 2, 20)).toMatchObject({ offset: 20, start: 21, end: 40 });
  });
  it("validates page sizes and limits before a database query", () => {
    expect(researchListFiltersSchema.parse({ page: "2", pageSize: "50" })).toMatchObject({
      page: 2,
      pageSize: 50,
    });
    expect(researchListFiltersSchema.safeParse({ pageSize: 100000 }).success).toBe(false);
    expect(researchListFiltersSchema.safeParse({ page: -1 }).success).toBe(false);
  });
});
