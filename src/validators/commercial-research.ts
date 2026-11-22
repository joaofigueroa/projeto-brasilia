import { z } from "zod";

const source = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.url().startsWith("https://"),
  kind: z.enum(["company", "registry", "government", "directory"]),
  checkedAt: z.iso.date(),
});
const registry = z.object({
  cnpj: z.string().regex(/^\d{14}$/),
  legalName: z.string().min(1),
  openedAt: z.iso.date(),
  capital: z.number().nonnegative().nullable(),
  status: z.string(),
  cnae: z.string().regex(/^\d{7}$/),
  activity: z.string(),
  address: z.string(),
  cityCode: z.string().regex(/^\d{7}$/),
  state: z.enum(["DF", "GO"]),
  branch: z.boolean(),
  source,
});
export const researchProspectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  cityCode: z.enum(["5300108", "5208707"]),
  cityName: z.enum(["Brasília", "Goiânia"]),
  state: z.enum(["DF", "GO"]),
  segment: z.enum(["workshop", "distributor", "parts_store"]),
  specialization: z.enum(["multibrand", "specialist", "unconfirmed"]),
  brands: z.array(z.string()),
  website: z.union([z.literal(""), z.url().startsWith("https://")]),
  phone: z.string(),
  summary: z.string(),
  priority: z.enum(["first", "develop", "validate"]),
  rationale: z.string(),
  nextStep: z.string(),
  productIds: z.array(z.string()).min(1),
  questions: z.array(z.string()).min(1),
  gaps: z.array(z.string()),
  foundation: z
    .object({ year: z.number().int(), note: z.string(), sourceId: z.string() })
    .nullable(),
  registry: registry.nullable(),
  registryCandidates: z.array(registry),
  sources: z.array(source),
  evidence: z.array(z.object({ text: z.string(), sourceId: z.string() })).min(1),
});
export const commercialResearchSchema = z.object({
  version: z.string(),
  checkedAt: z.iso.date(),
  projectId: z.uuid(),
  catalogUrl: z.url().startsWith("https://"),
  catalogCount: z.number().int().positive(),
  catalogFamilies: z.array(z.string()),
  products: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      family: z.string(),
      brands: z.array(z.string()),
      application: z.string(),
      url: z.url().startsWith("https://"),
    }),
  ),
  prospects: z.array(researchProspectSchema),
  reports: z.array(
    z.object({
      cityCode: z.enum(["5300108", "5208707"]),
      title: z.string(),
      thesis: z.string(),
      observations: z.array(z.object({ text: z.string(), prospectIds: z.array(z.string()) })),
      plays: z.array(
        z.object({
          title: z.string(),
          priority: z.string(),
          prospectIds: z.array(z.string()),
          productIds: z.array(z.string()),
          reason: z.string(),
          action: z.string(),
          success: z.string(),
        }),
      ),
      route: z.string(),
      limits: z.array(z.string()),
    }),
  ),
});
