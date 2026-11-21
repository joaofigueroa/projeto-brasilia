import { z } from "zod";
export const analysisKinds = ["market", "prospects", "vehicles", "opportunities", "notes"] as const;
export const metricKinds = ["context", "market_size", "fleet", "sales", "registrations"] as const;
const sourceUrl = z.union([
  z.literal(""),
  z.url().refine((value) => /^https?:\/\//.test(value), "Use um endereço HTTP ou HTTPS."),
]);
const optionalCode = z.string().optional();
export const intelligenceFiltersSchema = z.object({
  project: z.uuid().optional(),
  tab: z.uuid().optional(),
  region: z.enum(["BR", "1", "2", "3", "4", "5"]).optional(),
  uf: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  city: z
    .string()
    .regex(/^\d{7}$/)
    .optional(),
  year: z.coerce.number().int().min(2000).max(2100).default(2024),
  metric: z.enum(metricKinds).default("fleet"),
});
const scope = z.object({
  project: z.uuid(),
  tab: z.uuid(),
  region: optionalCode,
  uf: optionalCode,
  city: optionalCode,
  year: z.number().int().min(2000).max(2100),
});
export const tabInputSchema = z.object({
  projectId: z.uuid(),
  id: z.uuid().optional(),
  version: z.number().int().positive().optional(),
  name: z.string().trim().min(2).max(60),
  kind: z.enum(analysisKinds),
  segments: z.array(z.string().trim().min(1).max(60)).max(20),
  keywords: z.array(z.string().trim().min(1).max(60)).max(12),
});
export const recordFieldsSchema = z
  .object({
    title: z.string().trim().min(2).max(180),
    category: z.string().trim().max(80).default(""),
    metric: z.enum(metricKinds).default("context"),
    value: z.number().finite().nonnegative().max(1e15).nullable().default(null),
    unit: z.string().trim().min(1, "Informe a unidade do indicador.").max(40).default("unidades"),
    sourceName: z.string().trim().min(2, "Informe a fonte do registro.").max(150),
    sourceUrl,
    notes: z.string().trim().max(10000).default(""),
    status: z.enum(["new", "contacted", "qualified", "discarded"]).default("new"),
    details: z
      .object({
        make: z.string().trim().max(100).optional(),
        model: z.string().trim().max(100).optional(),
        vehicleType: z.string().trim().max(80).optional(),
        manufactureYear: z
          .string()
          .regex(/^$|^(19|20)\d{2}$/)
          .optional(),
        contact: z.string().trim().max(200).optional(),
      })
      .strict()
      .default({}),
  })
  .superRefine((value, ctx) => {
    if (value.metric !== "context" && value.value === null)
      ctx.addIssue({
        code: "custom",
        message: "Informe um valor para o indicador.",
        path: ["value"],
      });
    if (value.metric !== "context" && !value.sourceUrl)
      ctx.addIssue({
        code: "custom",
        message: "Informe o endereço da fonte do indicador.",
        path: ["sourceUrl"],
      });
  });
export const recordInputSchema = z.object({
  scope,
  id: z.uuid().optional(),
  version: z.number().int().positive().optional(),
  fields: recordFieldsSchema,
});
export const recordImportSchema = z.object({ scope, csv: z.string().min(1).max(512000) });
export type RecordFields = z.infer<typeof recordFieldsSchema>;
export type IntelligenceFilters = z.infer<typeof intelligenceFiltersSchema>;
