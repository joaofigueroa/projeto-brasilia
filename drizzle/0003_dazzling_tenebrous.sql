ALTER TABLE "tasks" ADD COLUMN "deleted_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE task_events DROP CONSTRAINT task_events_kind_check;
--> statement-breakpoint
ALTER TABLE task_events ADD CONSTRAINT task_events_kind_check CHECK (kind IN ('created','updated','moved','deleted'));
