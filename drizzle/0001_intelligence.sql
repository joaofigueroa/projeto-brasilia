CREATE TABLE "analysis_tabs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"settings" jsonb DEFAULT '{"segments":[],"keywords":[]}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intelligence_records" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tab_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"updated_by" uuid NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"metric" text NOT NULL,
	"value" numeric(20, 4),
	"unit" text NOT NULL,
	"year" integer NOT NULL,
	"region_code" text,
	"state_code" text,
	"municipality_code" text,
	"territory_label" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"import_key" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_tabs" ADD CONSTRAINT "analysis_tabs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_records" ADD CONSTRAINT "intelligence_records_tab_id_analysis_tabs_id_fk" FOREIGN KEY ("tab_id") REFERENCES "public"."analysis_tabs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_records" ADD CONSTRAINT "intelligence_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intelligence_records" ADD CONSTRAINT "intelligence_records_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_tabs_project_id_idx" ON "analysis_tabs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "intelligence_records_tab_id_idx" ON "intelligence_records" USING btree ("tab_id");--> statement-breakpoint
CREATE INDEX "intelligence_records_created_by_idx" ON "intelligence_records" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "intelligence_records_updated_by_idx" ON "intelligence_records" USING btree ("updated_by");--> statement-breakpoint
CREATE INDEX "intelligence_records_territory_idx" ON "intelligence_records" USING btree ("state_code","municipality_code","year");--> statement-breakpoint
CREATE UNIQUE INDEX "intelligence_records_import_idx" ON "intelligence_records" USING btree ("tab_id","import_key");
--> statement-breakpoint
ALTER TABLE analysis_tabs ADD CONSTRAINT analysis_tabs_kind_check CHECK (kind IN ('market','prospects','vehicles','opportunities','notes'));
--> statement-breakpoint
ALTER TABLE intelligence_records ADD CONSTRAINT intelligence_records_metric_check CHECK (metric IN ('context','market_size','fleet','sales','registrations') AND (metric='context' OR value IS NOT NULL) AND (value IS NULL OR value>=0));
--> statement-breakpoint
ALTER TABLE intelligence_records ADD CONSTRAINT intelligence_records_status_check CHECK (status IN ('new','contacted','qualified','discarded'));
--> statement-breakpoint
ALTER TABLE intelligence_records ADD CONSTRAINT intelligence_records_year_check CHECK (year BETWEEN 2000 AND 2100);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7590-96bc-33e5693053ca','019ab04a-1000-7000-8000-000000000001','Mercado endereçável','market',0,'{"segments": ["Clínicas", "Consultórios", "Distribuidores"], "keywords": ["estética", "dermatologia"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-789e-94fe-d309a40627e3','019ab04a-1000-7000-8000-000000000001','Possíveis clientes','prospects',1,'{"segments": ["Clínicas", "Consultórios", "Distribuidores"], "keywords": ["estética", "dermatologia"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-70aa-ad5c-5b85d85423bb','019ab04a-1000-7000-8000-000000000001','Editais','opportunities',2,'{"segments": ["Clínicas", "Consultórios", "Distribuidores"], "keywords": ["estética", "dermatologia"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-73ea-bcba-907ab5e2ac03','019ab04a-1000-7000-8000-000000000001','Abordagem','notes',3,'{"segments": ["Clínicas", "Consultórios", "Distribuidores"], "keywords": ["estética", "dermatologia"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7cfa-811c-5bedca551f16','019ab04a-1000-7000-8000-000000000002','Mercado endereçável','market',0,'{"segments": ["Supermercados", "Boutiques de vinhos", "Restaurantes", "Distribuidores"], "keywords": ["vinho", "vinhos", "espumante"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7f7e-ac84-82b9f115df9f','019ab04a-1000-7000-8000-000000000002','Possíveis clientes','prospects',1,'{"segments": ["Supermercados", "Boutiques de vinhos", "Restaurantes", "Distribuidores"], "keywords": ["vinho", "vinhos", "espumante"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7f80-8b3d-63ca399ccf20','019ab04a-1000-7000-8000-000000000002','Editais','opportunities',2,'{"segments": ["Supermercados", "Boutiques de vinhos", "Restaurantes", "Distribuidores"], "keywords": ["vinho", "vinhos", "espumante"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-74e9-b89e-12e574d74d91','019ab04a-1000-7000-8000-000000000002','Abordagem','notes',3,'{"segments": ["Supermercados", "Boutiques de vinhos", "Restaurantes", "Distribuidores"], "keywords": ["vinho", "vinhos", "espumante"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7b05-bef5-0d7d1d54dd32','019ab04a-1000-7000-8000-000000000003','Mercado endereçável','market',0,'{"segments": ["Oficinas", "Autopeças", "Concessionárias", "Frotistas"], "keywords": ["peças automotivas", "autopeças", "veículos"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7c26-8e6d-3eeac87f699c','019ab04a-1000-7000-8000-000000000003','Possíveis clientes','prospects',1,'{"segments": ["Oficinas", "Autopeças", "Concessionárias", "Frotistas"], "keywords": ["peças automotivas", "autopeças", "veículos"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7bdf-a13f-048971cc112a','019ab04a-1000-7000-8000-000000000003','Veículos','vehicles',2,'{"segments": ["Oficinas", "Autopeças", "Concessionárias", "Frotistas"], "keywords": ["peças automotivas", "autopeças", "veículos"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7124-97ef-f9b6e526ff5b','019ab04a-1000-7000-8000-000000000003','Editais','opportunities',3,'{"segments": ["Oficinas", "Autopeças", "Concessionárias", "Frotistas"], "keywords": ["peças automotivas", "autopeças", "veículos"]}'::jsonb);
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings) VALUES ('01a1ffdc-a669-7c8b-945d-16298a91a350','019ab04a-1000-7000-8000-000000000003','Abordagem','notes',4,'{"segments": ["Oficinas", "Autopeças", "Concessionárias", "Frotistas"], "keywords": ["peças automotivas", "autopeças", "veículos"]}'::jsonb);
