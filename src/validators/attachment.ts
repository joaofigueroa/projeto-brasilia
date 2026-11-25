import { z } from "zod";
import { attachmentMime, MAX_ATTACHMENT_BYTES } from "@/libs/prospect-crm";

export const attachmentSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1)
      .max(200)
      .refine(
        (name) =>
          !Array.from(name).some(
            (char) =>
              char.charCodeAt(0) < 32 ||
              char.charCodeAt(0) === 127 ||
              char === "/" ||
              char === "\\",
          ),
        "Nome de arquivo inválido.",
      ),
    contentType: z.string().max(150),
    size: z.number().int().positive().max(MAX_ATTACHMENT_BYTES, "O limite é de 20 MB por arquivo."),
  })
  .refine((input) => Boolean(attachmentMime(input.name, input.contentType)), {
    message: "Formato de arquivo não permitido.",
    path: ["name"],
  });
