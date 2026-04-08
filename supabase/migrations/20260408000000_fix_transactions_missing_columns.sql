-- =================================================================
-- SCRIPT DEFINITIVO: Adiciona TODAS as colunas que faltam na tabela
-- transactions para que o formulário financeiro funcione sem erros.
-- Execute este script no SQL Editor do Supabase.
-- =================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS cost_center        TEXT,
  ADD COLUMN IF NOT EXISTS payment_method     TEXT,
  ADD COLUMN IF NOT EXISTS reference_code     TEXT,
  ADD COLUMN IF NOT EXISTS nsu                TEXT,
  ADD COLUMN IF NOT EXISTS competence_date    DATE,
  ADD COLUMN IF NOT EXISTS attachment_url     TEXT,
  ADD COLUMN IF NOT EXISTS client_name_manual TEXT,
  ADD COLUMN IF NOT EXISTS supplier_name_manual TEXT,
  ADD COLUMN IF NOT EXISTS account_id         UUID REFERENCES public.financial_accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS parent_id          UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS installment_number INT  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS total_installments INT  DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence         TEXT;

-- Atualizar cache do schema (recarrega definições para o PostgREST)
NOTIFY pgrst, 'reload schema';
