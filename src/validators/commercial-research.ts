import { z } from "zod";
import { normalizeGoogleMapsEmbedInput } from "@/libs/google-business";

const googleUrl = z.union([
  z.literal(""),
  z
    .url()
    .max(2000)
    .refine((value) => {
      if (!URL.canParse(value)) return false;
      const url = new URL(value);
      return (
        url.protocol === "https:" &&
        (url.hostname === "maps.app.goo.gl" ||
          url.hostname === "g.co" ||
          /(^|\.)google\.(com|com\.br)$/.test(url.hostname)) &&
        !url.username &&
        !url.password
      );
    }, "Use um link HTTPS do Google Maps."),
]);
export const googleNoteFieldsSchema = z.object({
  rating: z.number().min(1).max(5).nullable(),
  reviewCount: z.number().int().nonnegative().max(100000000).nullable(),
  checkedAt: z.iso.date(),
  mapsUrl: googleUrl,
  embedUrl: z
    .string()
    .trim()
    .max(8000)
    .transform(normalizeGoogleMapsEmbedInput)
    .pipe(
      z.union([
        z.literal(""),
        z
          .url()
          .max(4000)
          .refine((value) => {
            if (!URL.canParse(value)) return false;
            const url = new URL(value);
            return (
              url.protocol === "https:" &&
              ["www.google.com", "www.google.com.br"].includes(url.hostname) &&
              url.pathname === "/maps/embed" &&
              !!url.searchParams.get("pb")?.startsWith("!") &&
              [...url.searchParams.keys()].every((key) => key === "pb" || key === "hl") &&
              !url.username &&
              !url.password &&
              !url.port &&
              !url.hash
            );
          }, "Use o endereço de incorporação fornecido pelo Google Maps."),
      ]),
    )
    .default(""),
  reviews: z
    .array(
      z.object({
        id: z.uuid().optional(),
        author: z.string().trim().min(1).max(150),
        text: z.string().trim().min(1).max(1000),
        rating: z.number().int().min(1).max(5),
        publishedAt: z.string().max(60),
        url: googleUrl,
      }),
    )
    .max(5),
});
export const googleNoteInputSchema = z.object({
  projectId: z.uuid(),
  prospectId: z.uuid(),
  version: z.number().int().nonnegative(),
  fields: googleNoteFieldsSchema,
});
export const researchCityInputSchema = z.object({
  projectId: z.uuid(),
  cityCode: z.enum(["5300108", "5208707"]),
});
export const researchBatchInputSchema = z.object({ projectId: z.uuid(), runId: z.uuid() });
export const researchAiConnectionSchema = z.object({
  projectId: z.uuid(),
  version: z.number().int().nonnegative(),
  apiKey: z.string().trim().min(20, "Informe uma chave válida do Gemini.").max(500),
  model: z.enum(["gemini-3.8-flash", "gemini-3.5-flash-lite"]),
});
export const researchListFiltersSchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce
    .number()
    .pipe(z.union([z.literal(10), z.literal(20), z.literal(50)]))
    .default(20),
  query: z.string().trim().max(160).default(""),
  segment: z.enum(["", "workshop", "distributor", "parts_store"]).default(""),
  priority: z.enum(["", "first", "develop", "validate"]).default(""),
  enrichment: z.enum(["", "researched", "registry"]).default(""),
  primaryOnly: z.boolean().default(false),
});

const source = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  url: z.url().startsWith("https://"),
  kind: z.enum(["company", "registry", "government", "directory"]),
  checkedAt: z.iso.date(),
});
const registry = z.object({
  cnpj: z.string().regex(/^[A-Z0-9]{12}\d{2}$/),
  legalName: z.string().min(1),
  openedAt: z.iso.date().nullable(),
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
  databaseId: z.uuid().optional(),
  revision: z.number().int().positive().default(1),
  enrichmentLevel: z.enum(["registry", "researched"]).default("researched"),
  activityMatch: z.enum(["primary", "secondary"]).default("primary"),
  google: googleNoteFieldsSchema
    .extend({ version: z.number().int().positive() })
    .nullable()
    .default(null),
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
export const commercialReportSchema = commercialResearchSchema.shape.reports.element;
export const prospectProfileUpdateSchema = z
  .object({
    projectId: z.uuid(),
    prospectId: z.uuid(),
    revision: z.number().int().positive(),
    name: z.string().trim().min(2).max(180),
    summary: z.string().trim().min(2).max(3000),
    specialization: z.enum(["multibrand", "specialist", "unconfirmed"]),
    brands: z.array(z.string().trim().min(1).max(60)).max(30),
    website: z.union([z.literal(""), z.url().startsWith("https://").max(2000)]),
    phone: z.string().trim().max(80),
    foundationYear: z.number().int().min(1800).max(2100).nullable(),
    sourceName: z.string().trim().min(2).max(150),
    sourceUrl: z.url().startsWith("https://").max(2000),
    sourceKind: z.enum(["company", "government", "directory"]),
    notes: z.string().trim().max(3000),
  })
  .refine(
    (input) => input.specialization === "unconfirmed" || input.sourceKind !== "directory",
    "Confirme a especialização em fonte da própria empresa ou publicação governamental.",
  );
