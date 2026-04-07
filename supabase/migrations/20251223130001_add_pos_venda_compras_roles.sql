-- Add POS_VENDA and COMPRAS roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'POS_VENDA';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'COMPRAS';
