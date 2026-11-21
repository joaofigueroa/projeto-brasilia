import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { v7 } from "uuid";
import { getDatabase } from "@/server/db/client";
import { authSchema } from "@/server/db/schema";

async function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32)
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  const { orm } = await getDatabase();
  return betterAuth({
    appName: "Brasília",
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : "http://localhost:3000"),
    trustedOrigins:
      process.env.NODE_ENV === "production"
        ? undefined
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
    secret: process.env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(orm, { provider: "pg", schema: authSchema }),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    disabledPaths: ["/sign-up/email", "/update-user", "/change-email"],
    user: {
      additionalFields: {
        role: { type: ["admin", "collaborator"], defaultValue: "collaborator", input: false },
        jobTitle: { type: "string", defaultValue: "", input: false },
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: false },
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      modelName: "rateLimit",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/change-password": { window: 60, max: 5 },
      },
    },
    advanced: {
      database: { generateId: () => v7() },
      ipAddress: { ipAddressHeaders: process.env.VERCEL ? ["x-vercel-forwarded-for"] : [] },
    },
    plugins: [nextCookies()],
  });
}

let authPromise: ReturnType<typeof createAuth> | undefined;
export function getAuth() {
  authPromise ??= createAuth();
  return authPromise;
}
