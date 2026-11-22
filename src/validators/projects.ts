import { z } from "zod";
import { idSchema, imageSchema } from "./index";
export const projectFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Informe um nome com pelo menos 2 caracteres.")
    .max(100, "Use no máximo 100 caracteres no nome."),
  description: z.string().trim().max(3000, "Use no máximo 3.000 caracteres na descrição."),
  image: imageSchema,
});
export const updateProjectSchema = projectFieldsSchema.extend({
  id: idSchema,
  version: z.number().int().positive(),
});
export type ProjectFields = z.infer<typeof projectFieldsSchema>;
