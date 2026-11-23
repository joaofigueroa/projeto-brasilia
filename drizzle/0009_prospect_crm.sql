CREATE TYPE "public"."prospect_crm_stage" AS ENUM('new_lead', 'contact_attempt', 'qualifying', 'meeting_scheduled', 'proposal_sent', 'negotiating', 'closing');--> statement-breakpoint
CREATE TABLE "prospect_attachments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"storage_provider" text NOT NULL,
	"storage_bucket" text NOT NULL,
	"storage_path" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_followup_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"actor_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"changes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"snapshot" jsonb NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prospect_followups" (
	"prospect_id" uuid PRIMARY KEY NOT NULL,
	"stage" "prospect_crm_stage" DEFAULT 'new_lead' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prospect_attachments" ADD CONSTRAINT "prospect_attachments_prospect_id_prospect_followups_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect_followups"("prospect_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_attachments" ADD CONSTRAINT "prospect_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_followup_events" ADD CONSTRAINT "prospect_followup_events_prospect_id_prospect_followups_prospect_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."prospect_followups"("prospect_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_followup_events" ADD CONSTRAINT "prospect_followup_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_followups" ADD CONSTRAINT "prospect_followups_prospect_id_research_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."research_prospects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_followups" ADD CONSTRAINT "prospect_followups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prospect_followups" ADD CONSTRAINT "prospect_followups_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "prospect_attachments_prospect_idx" ON "prospect_attachments" USING btree ("prospect_id","created_at");--> statement-breakpoint
CREATE INDEX "prospect_attachments_uploaded_by_idx" ON "prospect_attachments" USING btree ("uploaded_by");--> statement-breakpoint
CREATE UNIQUE INDEX "prospect_attachments_storage_idx" ON "prospect_attachments" USING btree ("storage_provider","storage_bucket","storage_path");--> statement-breakpoint
CREATE INDEX "prospect_followup_events_prospect_idx" ON "prospect_followup_events" USING btree ("prospect_id","created_at","id");--> statement-breakpoint
CREATE INDEX "prospect_followup_events_actor_idx" ON "prospect_followup_events" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "prospect_followups_created_by_idx" ON "prospect_followups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "prospect_followups_updated_by_idx" ON "prospect_followups" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "prospect_followups_stage_idx" ON "prospect_followups" USING btree ("stage");
--> statement-breakpoint
ALTER TABLE prospect_followups ADD CONSTRAINT prospect_followups_version_check CHECK (version>0);
--> statement-breakpoint
ALTER TABLE prospect_followup_events ADD CONSTRAINT prospect_followup_events_kind_check CHECK (kind IN ('created','stage_changed','comment','attachment_added'));
--> statement-breakpoint
ALTER TABLE prospect_attachments ADD CONSTRAINT prospect_attachments_size_check CHECK (size>0 AND size<=20971520);
--> statement-breakpoint
ALTER TABLE prospect_attachments ADD CONSTRAINT prospect_attachments_status_check CHECK (status IN ('pending','ready','rejected'));
--> statement-breakpoint
CREATE FUNCTION protect_followup_events() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Customer history is append-only'; END;
$$;
--> statement-breakpoint
CREATE TRIGGER prospect_followup_events_immutable BEFORE UPDATE OR DELETE ON prospect_followup_events FOR EACH ROW EXECUTE FUNCTION protect_followup_events();
--> statement-breakpoint
INSERT INTO prospect_followups(prospect_id,created_by,updated_by,created_at,updated_at)
SELECT DISTINCT ON(prospect_id) prospect_id,user_id,user_id,created_at,created_at FROM research_prospect_favorites ORDER BY prospect_id,created_at,id;
--> statement-breakpoint
INSERT INTO prospect_followup_events(id,prospect_id,actor_id,kind,snapshot,created_at)
SELECT prospect_id,prospect_id,created_by,'created',jsonb_build_object('stage',stage,'version',version),created_at FROM prospect_followups;
--> statement-breakpoint
ALTER TABLE analysis_tabs DROP CONSTRAINT analysis_tabs_kind_check;
--> statement-breakpoint
ALTER TABLE analysis_tabs ADD CONSTRAINT analysis_tabs_kind_check CHECK (kind IN ('market','prospects','favorites','crm','vehicles','opportunities','notes','commercial'));
--> statement-breakpoint
UPDATE analysis_tabs t SET position=t.position+1 WHERE EXISTS(SELECT 1 FROM analysis_tabs f WHERE f.project_id=t.project_id AND f.kind='favorites' AND t.position>f.position);
--> statement-breakpoint
INSERT INTO analysis_tabs(id,project_id,name,kind,position,settings)
SELECT '01a20e20-1000-7000-8000-000000000001',p.id,'Acompanhamento','crm',f.position+1,'{"segments":[],"keywords":[]}'::jsonb
FROM projects p JOIN analysis_tabs f ON f.project_id=p.id AND f.kind='favorites'
WHERE p.id='019ab04a-1000-7000-8000-000000000003' AND NOT EXISTS(SELECT 1 FROM analysis_tabs t WHERE t.project_id=p.id AND t.kind='crm');
