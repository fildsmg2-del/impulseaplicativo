alter table public.quotes
add column if not exists additional_cost_items jsonb not null default '[]'::jsonb;
