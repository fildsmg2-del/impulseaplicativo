-- Add payment type and financing bank fields to quotes table
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_type TEXT DEFAULT 'avista';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_bank TEXT;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_installments INTEGER;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_rate NUMERIC;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_down_payment NUMERIC;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS financing_installment_value NUMERIC;