import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
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
  createdAt: createdAt(),
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
