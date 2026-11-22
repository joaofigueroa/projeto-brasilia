import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { v7 } from "uuid";
import type { Change } from "@/types/domain";

export const userRole = pgEnum("user_role", ["admin", "collaborator"]);
export const taskStatus = pgEnum("task_status", ["open", "in_progress", "done"]);
export const taskPriority = pgEnum("task_priority", ["low", "medium", "high"]);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: uuid("id").primaryKey().$defaultFn(v7),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("collaborator"),
  jobTitle: text("job_title").notNull().default(""),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    token: text("token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)],
);
export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    password: text("password"),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("accounts_user_id_idx").on(table.userId),
    uniqueIndex("accounts_provider_account_idx").on(table.providerId, table.accountId),
  ],
);
export const verifications = pgTable(
  "verifications",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("verifications_identifier_idx").on(table.identifier)],
);
export const rateLimits = pgTable("rate_limits", {
  id: uuid("id").primaryKey().$defaultFn(v7),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
});
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().$defaultFn(v7),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  color: text("color").notNull(),
  image: text("image"),
  version: integer("version").notNull().default(1),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});
export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    administratorId: uuid("administrator_id")
      .notNull()
      .references(() => users.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    status: taskStatus("status").notNull().default("open"),
    priority: taskPriority("priority").notNull().default("medium"),
    weekStart: date("week_start").notNull(),
    dueDate: date("due_date"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_administrator_id_idx").on(table.administratorId),
    index("tasks_created_by_idx").on(table.createdBy),
    index("tasks_week_start_idx").on(table.weekStart),
  ],
);
export const taskAssignees = pgTable(
  "task_assignees",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
  },
  (table) => [
    index("task_assignees_task_id_idx").on(table.taskId),
    index("task_assignees_user_id_idx").on(table.userId),
    uniqueIndex("task_assignees_unique_idx").on(table.taskId, table.userId),
  ],
);
export const taskEvents = pgTable(
  "task_events",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    taskId: uuid("task_id")
      .notNull()
      .references(() => tasks.id),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    changes: jsonb("changes").$type<Change[]>().notNull().default(sql`'[]'::jsonb`),
    snapshot: jsonb("snapshot").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("task_events_task_id_idx").on(table.taskId),
    index("task_events_actor_id_idx").on(table.actorId),
  ],
);

export const authSchema = {
  user: users,
  session: sessions,
  account: accounts,
  verification: verifications,
  rateLimit: rateLimits,
};

export const analysisTabs = pgTable(
  "analysis_tabs",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    name: text("name").notNull(),
    kind: text("kind").notNull(),
    position: integer("position").notNull().default(0),
    settings: jsonb("settings").notNull().default(sql`'{"segments":[],"keywords":[]}'::jsonb`),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [index("analysis_tabs_project_id_idx").on(table.projectId)],
);
export const intelligenceRecords = pgTable(
  "intelligence_records",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    tabId: uuid("tab_id")
      .notNull()
      .references(() => analysisTabs.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    category: text("category").notNull().default(""),
    metric: text("metric").notNull(),
    value: numeric("value", { precision: 20, scale: 4 }),
    unit: text("unit").notNull(),
    year: integer("year").notNull(),
    regionCode: text("region_code"),
    stateCode: text("state_code"),
    municipalityCode: text("municipality_code"),
    territoryLabel: text("territory_label").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    notes: text("notes").notNull().default(""),
    status: text("status").notNull().default("new"),
    details: jsonb("details").notNull().default(sql`'{}'::jsonb`),
    importKey: text("import_key"),
    version: integer("version").notNull().default(1),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("intelligence_records_tab_id_idx").on(table.tabId),
    index("intelligence_records_created_by_idx").on(table.createdBy),
    index("intelligence_records_updated_by_idx").on(table.updatedBy),
    index("intelligence_records_territory_idx").on(
      table.stateCode,
      table.municipalityCode,
      table.year,
    ),
    uniqueIndex("intelligence_records_import_idx").on(table.tabId, table.importKey),
  ],
);

export const researchRuns = pgTable(
  "research_runs",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    cityCode: text("city_code").notNull(),
    kind: text("kind").notNull(),
    status: text("status").notNull().default("pending"),
    requestedBy: uuid("requested_by")
      .notNull()
      .references(() => users.id),
    source: text("source").notNull().default(""),
    sourceMonth: text("source_month").notNull().default(""),
    cursor: integer("cursor").notNull().default(0),
    total: integer("total"),
    phase: text("phase").notNull().default("establishments"),
    pendingRows: jsonb("pending_rows").notNull().default(sql`'[]'::jsonb`),
    leaseToken: uuid("lease_token"),
    leaseUntil: timestamp("lease_until", { withTimezone: true }),
    message: text("message").notNull().default(""),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("research_runs_project_id_idx").on(table.projectId),
    index("research_runs_requested_by_idx").on(table.requestedBy),
    index("research_runs_city_idx").on(
      table.projectId,
      table.cityCode,
      table.kind,
      table.createdAt,
    ),
  ],
);

export const researchProspects = pgTable(
  "research_prospects",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    referenceKey: text("reference_key").notNull(),
    cnpj: text("cnpj"),
    cityCode: text("city_code").notNull(),
    stateCode: text("state_code").notNull(),
    name: text("name").notNull(),
    segment: text("segment").notNull(),
    priority: text("priority").notNull(),
    enrichmentLevel: text("enrichment_level").notNull().default("registry"),
    version: integer("version").notNull().default(1),
    profile: jsonb("profile").notNull(),
    active: boolean("active").notNull().default(true),
    sourceRunId: uuid("source_run_id").references(() => researchRuns.id),
    updatedBy: uuid("updated_by").references(() => users.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index("research_prospects_project_id_idx").on(table.projectId),
    index("research_prospects_source_run_id_idx").on(table.sourceRunId),
    index("research_prospects_updated_by_idx").on(table.updatedBy),
    uniqueIndex("research_prospects_reference_idx").on(table.projectId, table.referenceKey),
    uniqueIndex("research_prospects_cnpj_idx").on(table.projectId, table.cnpj),
    index("research_prospects_city_idx").on(table.projectId, table.cityCode, table.active),
  ],
);

export const commercialReports = pgTable(
  "commercial_reports",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    cityCode: text("city_code").notNull(),
    runId: uuid("run_id")
      .notNull()
      .references(() => researchRuns.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    report: jsonb("report").notNull(),
    inputs: jsonb("inputs").notNull(),
    model: text("model").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index("commercial_reports_project_id_idx").on(table.projectId),
    index("commercial_reports_run_id_idx").on(table.runId),
    index("commercial_reports_created_by_idx").on(table.createdBy),
    index("commercial_reports_city_idx").on(table.projectId, table.cityCode, table.createdAt),
  ],
);

export const prospectGoogleNotes = pgTable(
  "prospect_google_notes",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => researchProspects.id),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    data: jsonb("data").notNull(),
    version: integer("version").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("prospect_google_notes_prospect_idx").on(table.prospectId),
    index("prospect_google_notes_updated_by_idx").on(table.updatedBy),
  ],
);

export const researchAiConnections = pgTable(
  "research_ai_connections",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id),
    encryptedKey: text("encrypted_key").notNull(),
    model: text("model").notNull(),
    updatedBy: uuid("updated_by")
      .notNull()
      .references(() => users.id),
    version: integer("version").notNull().default(1),
    updatedAt: updatedAt(),
  },
  (table) => [
    uniqueIndex("research_ai_connections_project_idx").on(table.projectId),
    index("research_ai_connections_updated_by_idx").on(table.updatedBy),
  ],
);

export const researchProspectFavorites = pgTable(
  "research_prospect_favorites",
  {
    id: uuid("id").primaryKey().$defaultFn(v7),
    prospectId: uuid("prospect_id")
      .notNull()
      .references(() => researchProspects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [
    uniqueIndex("research_prospect_favorites_user_prospect_idx").on(table.userId, table.prospectId),
    index("research_prospect_favorites_user_idx").on(table.userId),
    index("research_prospect_favorites_prospect_idx").on(table.prospectId),
  ],
);
