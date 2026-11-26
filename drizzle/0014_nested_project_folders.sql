DROP INDEX "project_file_folders_project_name_idx";--> statement-breakpoint
ALTER TABLE "project_file_folders" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "project_file_folders_project_id_idx" ON "project_file_folders" USING btree ("project_id","id");--> statement-breakpoint
ALTER TABLE "project_file_folders" ADD CONSTRAINT "project_file_folders_parent_fk" FOREIGN KEY ("project_id","parent_id") REFERENCES "public"."project_file_folders"("project_id","id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_file_folders_parent_idx" ON "project_file_folders" USING btree ("project_id","parent_id");--> statement-breakpoint
CREATE UNIQUE INDEX "project_file_folders_root_name_idx" ON "project_file_folders" USING btree ("project_id",lower("name")) WHERE "project_file_folders"."parent_id" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "project_file_folders_child_name_idx" ON "project_file_folders" USING btree ("project_id","parent_id",lower("name")) WHERE "project_file_folders"."parent_id" IS NOT NULL;
