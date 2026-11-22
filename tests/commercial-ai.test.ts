import { afterEach, describe, expect, it, vi } from "vitest";
import dataset from "@/data/research/3c-automotive.json";

const provider = vi.hoisted(() => ({ generate: vi.fn() }));
vi.mock("ai", async () => {
  const actual = await vi.importActual<typeof import("ai")>("ai");
  return { ...actual, generateText: provider.generate };
});
vi.mock("@/server/services/research-ai", () => ({
  researchLanguageModel: async () => ({ model: "test-model", name: "test-model" }),
}));

import { generateCommercialAnalysis } from "@/server/integrations/commercial-ai";
import { commercialResearchSchema } from "@/validators/commercial-research";

const research = commercialResearchSchema.parse(dataset);
const input = {
  projectId: research.projectId,
  cityCode: "5300108",
  cityName: "Brasília",
  stats: { total: 15681, researched: 5 },
  sourceMonth: "2026-10",
  count: 15681,
  prospects: research.prospects.filter((p) => p.cityCode === "5300108"),
  products: research.products,
};
afterEach(() => vi.clearAllMocks());
describe("grounded commercial report contract", () => {
  it("uses public evidence, a bounded sample and no manual Google content", async () => {
    const profiles = input.prospects.map((p) => ({
      ...p,
      google: {
        rating: 5,
        reviewCount: 1,
        checkedAt: "2026-01-01",
        mapsUrl: "",
        reviews: [
          {
            author: "Test",
            text: "PRIVATE-MANUAL-REVIEW-MUST-NOT-BE-SENT",
            rating: 5,
            publishedAt: "",
            url: "",
          },
        ],
        version: 1,
      },
    }));
    provider.generate.mockResolvedValue({
      output: research.reports[0],
      usage: { inputTokens: 200, outputTokens: 100 },
    });
    const result = await generateCommercialAnalysis({ ...input, prospects: profiles });
    expect(result.report.cityCode).toBe("5300108");
    expect(result.model).toBe("test-model");
    const request = provider.generate.mock.calls[0][0];
    expect(request.prompt).toContain("15681");
    expect(request.prompt).not.toContain("PRIVATE-MANUAL-REVIEW");
    expect(request.maxRetries).toBe(0);
    expect(request.maxOutputTokens).toBe(5000);
  });
  it("rejects a report for a different city or unsupported prospect before persistence", async () => {
    provider.generate.mockResolvedValue({ output: research.reports[1], usage: {} });
    await expect(generateCommercialAnalysis(input)).rejects.toThrow("fora da pesquisa");
    const report = structuredClone(research.reports[0]);
    report.plays[0].prospectIds = ["unknown-prospect"];
    provider.generate.mockResolvedValue({ output: report, usage: {} });
    await expect(generateCommercialAnalysis(input)).rejects.toThrow("fora da pesquisa");
  });
  it("does not leak provider errors or credentials to the interface", async () => {
    provider.generate.mockRejectedValue(new Error("test-provider-secret-must-not-leak"));
    await expect(generateCommercialAnalysis(input)).rejects.toThrow("Não foi possível gerar");
  });
});
