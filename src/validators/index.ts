import { z } from "zod";
import { dateFromKey, mondayOf } from "@/libs/calendar";
import { MAX_BULK_TASKS } from "@/libs/task-bulk";

export const idSchema = z.uuidv7("Identificador inválido.");
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida.")
  .refine(
    (value) =>
      !Number.isNaN(dateFromKey(value).getTime()) &&
      dateFromKey(value).toISOString().slice(0, 10) === value,
    "Data inválida.",
  );
export const weekSchema = dateSchema.refine(
  (value) => dateSchema.safeParse(value).success && mondayOf(value) === value,
  "A semana deve começar na segunda-feira.",
);
export const roleSchema = z.enum(["admin", "collaborator"]);
export const statusSchema = z.enum(["open", "in_progress", "done"]);
export const passwordSchema = z
  .string()
  .min(6, "Use uma senha de pelo menos 6 caracteres.")
  .max(128, "Use no máximo 128 caracteres.");
export const imageSchema = z.union([
  z.literal(""),
  z
    .string()
    .max(450_000, "A foto é muito grande.")
    .regex(
      /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/,
      "Envie uma foto JPG, PNG ou WebP.",
    ),
]);
export const boardFiltersSchema = z.object({
  week: weekSchema,
  project: idSchema.optional(),
  assignee: idSchema.optional(),
  q: z.string().trim().max(150).default(""),
  task: idSchema.optional(),
});
export const taskFieldsSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Escreva um título com pelo menos 3 caracteres.")
    .max(160, "Use no máximo 160 caracteres."),
  description: z.string().trim().max(10000, "Use no máximo 10.000 caracteres."),
  projectId: idSchema,
  administratorId: idSchema,
  assigneeIds: z
    .array(idSchema)
    .min(1, "Escolha pelo menos um responsável.")
    .max(20)
    .transform((values) => [...new Set(values)]),
  weekStart: weekSchema,
  dueDate: dateSchema.nullable(),
  status: statusSchema,
  priority: z.enum(["low", "medium", "high"]),
});
export const createTaskSchema = taskFieldsSchema;
export const updateTaskSchema = taskFieldsSchema.extend({
  id: idSchema,
  version: z.number().int().positive(),
});
export const deleteTaskSchema = z.object({ id: idSchema, version: z.number().int().positive() });
export const postponeTaskSchema = z.object({ id: idSchema, version: z.number().int().positive() });
export const moveTaskSchema = z.object({
  id: idSchema,
  version: z.number().int().positive(),
  status: statusSchema,
});
export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome completo.").max(100),
  email: z.email("Informe um e-mail válido.").toLowerCase().trim(),
  jobTitle: z.string().trim().min(2, "Informe a função profissional.").max(100),
  role: roleSchema,
  password: passwordSchema,
});
export const configureUserSchema = createUserSchema
  .omit({ password: true })
  .extend({ id: idSchema });
export const profileSchema = createUserSchema.omit({ role: true, password: true }).extend({
  image: imageSchema.optional(),
  currentPassword: z.string().max(128).optional(),
});
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe sua senha atual.").max(128),
  newPassword: passwordSchema,
});
export type TaskFields = z.input<typeof taskFieldsSchema>;

const bulkTaskSelectionSchema = z
  .array(z.object({ id: idSchema, version: z.number().int().positive() }))
  .min(1, "Selecione pelo menos uma tarefa.")
  .max(MAX_BULK_TASKS, `Selecione até ${MAX_BULK_TASKS} tarefas por operação.`)
  .refine(
    (items) => new Set(items.map((item) => item.id)).size === items.length,
    "A seleção contém tarefas repetidas.",
  );
export const bulkDeleteTasksSchema = z.object({
  tasks: bulkTaskSelectionSchema,
  confirmed: z.literal(true, { error: "Confirme a ação em massa antes de continuar." }),
});
export const bulkRescheduleTasksSchema = bulkDeleteTasksSchema.extend({ weekStart: weekSchema });
