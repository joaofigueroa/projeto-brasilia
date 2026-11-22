ALTER TABLE "projects" ADD COLUMN "image" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
UPDATE projects SET description='Gestão do negócio de clínica estética.' WHERE id='019ab04a-1000-7000-8000-000000000001' AND description='Cuidado em cada detalhe.';
--> statement-breakpoint
UPDATE projects SET description='Gestão do negócio de vinhos.' WHERE id='019ab04a-1000-7000-8000-000000000002' AND description='Boas histórias, novas experiências.';
--> statement-breakpoint
UPDATE projects SET description='Gestão do negócio de peças automotivas.' WHERE id='019ab04a-1000-7000-8000-000000000003' AND description='Conectando caminhos e soluções.';
