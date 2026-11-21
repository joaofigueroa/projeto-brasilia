import { afterEach, describe, expect, it, vi } from "vitest";
import { parseCsv } from "@/libs/csv";
import { resolveTerritory } from "@/libs/territories";
import { getPublicNotices } from "@/server/integrations/pncp";

afterEach(() => vi.unstubAllGlobals());
describe("official data boundaries", () => {
  it("filters official procurement objects without treating the sample as all notices", async () => {
    const row = {
      numeroControlePNCP: "test-notice",
      objetoCompra: "Aquisição de VINHOS",
      valorTotalEstimado: 1200,
      dataPublicacaoPncp: "2024-12-02T10:00:00",
      anoCompra: 2024,
      sequencialCompra: 1,
      orgaoEntidade: { cnpj: "00000000000000", razaoSocial: "Órgão de teste" },
      unidadeOrgao: { municipioNome: "Brasília", ufSigla: "DF" },
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: [row, { ...row, numeroControlePNCP: "other", objetoCompra: "Mobiliário" }],
            totalRegistros: 90,
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await getPublicNotices(resolveTerritory({ uf: "DF", city: "5300108" }), 2024, [
      "vinho",
    ]);
    expect(result.items).toHaveLength(1);
    expect(result.consulted).toBe(2);
    expect(result.total).toBe(90);
    expect(result.unavailable).toBe(false);
    expect(result.items[0].url).toBe("https://pncp.gov.br/app/editais/00000000000000/2024/1");
    expect(String(fetchMock.mock.calls[0][0])).toContain("codigoMunicipioIbge=5300108");
  });
  it("reports an upstream failure and avoids municipal queries without a selected state", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("upstream timeout"));
    vi.stubGlobal("fetch", fetchMock);
    expect(
      (await getPublicNotices(resolveTerritory({ uf: "DF" }), 2024, ["vinho"])).unavailable,
    ).toBe(true);
    fetchMock.mockClear();
    expect(
      (await getPublicNotices(resolveTerritory({ region: "BR" }), 2024, ["vinho"])).items,
    ).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("parses quoted separators and multiline notes and rejects malformed CSV before writes", () => {
    expect(
      parseCsv('title;source_name;notes\n"Uma; organização";Fonte;"Linha 1\nLinha 2"')[0],
    ).toEqual({ title: "Uma; organização", source_name: "Fonte", notes: "Linha 1\nLinha 2" });
    expect(() => parseCsv("title,title\nA,B")).toThrow("colunas únicas");
    expect(() => parseCsv('title,notes\nA,"incompleto')).toThrow("aspas não fechadas");
    expect(() => parseCsv('title,notes\nA,"nota"texto')).toThrow("após aspas");
    expect(() => parseCsv(",notes\nA,B")).toThrow("colunas únicas");
  });
});
