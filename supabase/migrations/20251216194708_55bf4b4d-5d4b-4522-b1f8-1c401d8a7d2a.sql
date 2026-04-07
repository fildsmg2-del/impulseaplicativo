-- Add new roles to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'FINANCEIRO';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'TECNICO';