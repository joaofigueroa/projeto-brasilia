import "./environment";
import { hashPassword } from "better-auth/crypto";
import { v7 } from "uuid";
import { closeDatabase } from "../src/server/db/client";
import { insertUser } from "../src/server/repositories/users";
import { createUserSchema } from "../src/validators";

try {
  const input = createUserSchema.parse({
    name: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    jobTitle: process.env.ADMIN_JOB_TITLE || "Administração",
    role: "admin",
  });
  await insertUser({ ...input, id: v7(), passwordHash: await hashPassword(input.password) });
  console.log("Administrador criado. Remova ADMIN_PASSWORD do ambiente após o uso.");
} finally {
  await closeDatabase();
}
