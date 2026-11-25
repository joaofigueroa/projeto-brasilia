CREATE TABLE "project_file_folders" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_attachments" ADD COLUMN "folder_id" uuid;--> statement-breakpoint
ALTER TABLE "project_file_folders" ADD CONSTRAINT "project_file_folders_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "project_file_folders_project_name_idx" ON "project_file_folders" USING btree ("project_id",lower("name"));--> statement-breakpoint
ALTER TABLE "workspace_attachments" ADD CONSTRAINT "workspace_attachments_folder_id_project_file_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."project_file_folders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_attachments_folder_id_idx" ON "workspace_attachments" USING btree ("folder_id");