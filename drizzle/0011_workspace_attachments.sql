CREATE TABLE "workspace_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"task_id" uuid,
	"project_id" uuid,
	"uploaded_by" uuid NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_attachments_task_id_idx" ON "workspace_attachments" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "workspace_attachments_project_id_idx" ON "workspace_attachments" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workspace_attachments_uploaded_by_idx" ON "workspace_attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_attachments_storage_idx" ON "workspace_attachments" USING btree ("storage_bucket","storage_path");
--> statement-breakpoint
ALTER TABLE workspace_attachments ADD CONSTRAINT workspace_attachments_owner_check
  CHECK ((task_id IS NULL) <> (project_id IS NULL));
--> statement-breakpoint
ALTER TABLE workspace_attachments ADD CONSTRAINT workspace_attachments_size_check CHECK (size > 0 AND size <= 20971520);
--> statement-breakpoint
ALTER TABLE workspace_attachments ADD CONSTRAINT workspace_attachments_status_check CHECK (status IN ('pending', 'ready'));
--> statement-breakpoint
ALTER TABLE task_events DROP CONSTRAINT task_events_kind_check;
--> statement-breakpoint
ALTER TABLE task_events ADD CONSTRAINT task_events_kind_check CHECK (kind IN ('created', 'updated', 'moved', 'deleted', 'attachment_added'));
