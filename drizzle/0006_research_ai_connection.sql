CREATE TABLE "research_ai_connections" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"encrypted_key" text NOT NULL,
	"model" text NOT NULL,
	"updated_by" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "research_ai_connections" ADD CONSTRAINT "research_ai_connections_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "research_ai_connections" ADD CONSTRAINT "research_ai_connections_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "research_ai_connections_project_idx" ON "research_ai_connections" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "research_ai_connections_updated_by_idx" ON "research_ai_connections" USING btree ("updated_by");