import { z } from "zod";
export const prospectPageInputSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-]+$/),
  projectId: z.uuid(),
});
export const prospectFavoriteSchema = z.object({
  projectId: z.uuid(),
  prospectId: z.uuid(),
  favorite: z.boolean(),
});
