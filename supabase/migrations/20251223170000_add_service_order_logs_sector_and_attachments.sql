alter type public.app_role add value if not exists 'POS_VENDA';
alter type public.app_role add value if not exists 'COMPRAS';

create or replace function public.has_role_text(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role::text = _role
  );
$$;

alter table public.service_order_logs
  add column if not exists sector text;

update public.service_order_logs
set sector = coalesce(
  nullif(substring(description from '^\\[([^\\]]+)\\]'), ''),
  'GERAL'
);

alter table public.service_order_logs
  alter column sector set not null;

drop policy if exists "Authenticated users can insert service order logs" on public.service_order_logs;

create policy "Users can insert logs for their sector"
on public.service_order_logs for insert
with check (
  auth.uid() is not null
  and (
    has_role_text(auth.uid(), 'MASTER')
    or has_role_text(auth.uid(), 'DEV')
    or (sector = 'TECNICO' and has_role_text(auth.uid(), 'TECNICO'))
    or (sector = 'FINANCEIRO' and has_role_text(auth.uid(), 'FINANCEIRO'))
    or (sector = 'ENGENHEIRO' and has_role_text(auth.uid(), 'ENGENHEIRO'))
    or (sector = 'COMPRAS' and has_role_text(auth.uid(), 'COMPRAS'))
    or (sector = 'POS_VENDA' and has_role_text(auth.uid(), 'POS_VENDA'))
    or (sector = 'VENDAS' and has_role_text(auth.uid(), 'VENDEDOR'))
  )
);

create table if not exists public.service_order_attachments (
  id uuid primary key default gen_random_uuid(),
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  name text not null,
  url text not null,
  path text,
  type text,
  uploaded_at timestamptz not null default now(),
  sector text not null,
  created_by uuid
);

alter table public.service_order_attachments enable row level security;

create policy "Users can view attachments for allowed orders"
  on public.service_order_attachments for select
  using (auth.uid() is not null);

create policy "Users can insert attachments for their sector"
  on public.service_order_attachments for insert
  with check (
    auth.uid() is not null
    and (
      has_role_text(auth.uid(), 'MASTER')
      or has_role_text(auth.uid(), 'DEV')
      or (sector = 'TECNICO' and has_role_text(auth.uid(), 'TECNICO'))
      or (sector = 'FINANCEIRO' and has_role_text(auth.uid(), 'FINANCEIRO'))
      or (sector = 'ENGENHEIRO' and has_role_text(auth.uid(), 'ENGENHEIRO'))
      or (sector = 'COMPRAS' and has_role_text(auth.uid(), 'COMPRAS'))
      or (sector = 'POS_VENDA' and has_role_text(auth.uid(), 'POS_VENDA'))
      or (sector = 'VENDAS' and has_role_text(auth.uid(), 'VENDEDOR'))
    )
  );
