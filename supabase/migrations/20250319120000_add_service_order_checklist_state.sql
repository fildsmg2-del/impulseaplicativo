ALTER TABLE public.service_types
ADD COLUMN checklist_template jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.service_orders
ADD COLUMN checklist_state jsonb NOT NULL DEFAULT '[]'::jsonb;
