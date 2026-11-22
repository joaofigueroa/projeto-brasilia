CREATE TABLE IF NOT EXISTS "research_prospect_favorites" (
	"id" uuid PRIMARY KEY NOT NULL,
	"prospect_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "research_prospect_favorites" ADD CONSTRAINT "research_prospect_favorites_prospect_id_research_prospects_id_fk" FOREIGN KEY ("prospect_id") REFERENCES "public"."research_prospects"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
DO $$ BEGIN ALTER TABLE "research_prospect_favorites" ADD CONSTRAINT "research_prospect_favorites_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action; EXCEPTION WHEN duplicate_object THEN NULL; END $$;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "research_prospect_favorites_user_prospect_idx" ON "research_prospect_favorites" USING btree ("user_id","prospect_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_prospect_favorites_user_idx" ON "research_prospect_favorites" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "research_prospect_favorites_prospect_idx" ON "research_prospect_favorites" USING btree ("prospect_id");--> statement-breakpoint
ALTER TABLE analysis_tabs DROP CONSTRAINT analysis_tabs_kind_check;
--> statement-breakpoint
ALTER TABLE analysis_tabs ADD CONSTRAINT analysis_tabs_kind_check CHECK (kind IN ('market','prospects','favorites','vehicles','opportunities','notes','commercial'));
--> statement-breakpoint
UPDATE analysis_tabs SET position=position+1 WHERE project_id='019ab04a-1000-7000-8000-000000000003' AND position>(SELECT min(position) FROM analysis_tabs WHERE project_id='019ab04a-1000-7000-8000-000000000003' AND kind='prospects');
--> statement-breakpoint
INSERT INTO analysis_tabs(id,project_id,name,kind,position,settings)
SELECT '01a20e10-1000-7000-8000-000000000001',p.id,'Clientes favoritados','favorites',COALESCE((SELECT min(position)+1 FROM analysis_tabs WHERE project_id=p.id AND kind='prospects'),1),'{"segments":[],"keywords":[]}'::jsonb
FROM projects p WHERE p.id='019ab04a-1000-7000-8000-000000000003' AND NOT EXISTS(SELECT 1 FROM analysis_tabs WHERE project_id=p.id AND kind='favorites');
