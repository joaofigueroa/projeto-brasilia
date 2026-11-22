-- Custom SQL migration file, put your code below! --
ALTER TABLE analysis_tabs DROP CONSTRAINT analysis_tabs_kind_check;
--> statement-breakpoint
ALTER TABLE analysis_tabs ADD CONSTRAINT analysis_tabs_kind_check CHECK (kind IN ('market','prospects','vehicles','opportunities','notes','commercial'));
--> statement-breakpoint
INSERT INTO analysis_tabs (id,project_id,name,kind,position,settings)
SELECT '01a2071b-1000-7000-8000-000000000001',p.id,'Inteligência comercial','commercial',
  COALESCE((SELECT MAX(position) + 1 FROM analysis_tabs WHERE project_id=p.id),0),
  '{"segments":["Oficinas","Distribuidoras","Autopeças"],"keywords":[]}'::jsonb
FROM projects p WHERE p.id='019ab04a-1000-7000-8000-000000000003'
  AND NOT EXISTS (SELECT 1 FROM analysis_tabs t WHERE t.project_id=p.id AND t.kind='commercial')
ON CONFLICT (id) DO NOTHING;
