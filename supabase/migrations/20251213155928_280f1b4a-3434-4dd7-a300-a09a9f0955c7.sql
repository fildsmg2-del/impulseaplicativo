-- Create financing_banks table for payment options configuration
CREATE TABLE public.financing_banks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  min_rate NUMERIC NOT NULL DEFAULT 1.5,
  max_rate NUMERIC NOT NULL DEFAULT 2.5,
  min_installments INTEGER NOT NULL DEFAULT 12,
  max_installments INTEGER NOT NULL DEFAULT 60,
  max_grace_period INTEGER NOT NULL DEFAULT 6,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.financing_banks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view financing banks"
  ON public.financing_banks FOR SELECT
  USING (true);

CREATE POLICY "Masters can insert financing banks"
  ON public.financing_banks FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can update financing banks"
  ON public.financing_banks FOR UPDATE
  USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can delete financing banks"
  ON public.financing_banks FOR DELETE
  USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_financing_banks_updated_at
  BEFORE UPDATE ON public.financing_banks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default banks
INSERT INTO public.financing_banks (name, min_rate, max_rate, min_installments, max_installments, max_grace_period)
VALUES 
  ('Sicoob', 1.50, 2.00, 12, 60, 6),
  ('BV', 1.60, 2.20, 12, 72, 3),
  ('Santander', 1.55, 2.10, 12, 60, 6),
  ('Bradesco', 1.70, 2.30, 12, 48, 6),
  ('Caixa', 1.45, 1.95, 12, 84, 6);

-- Add fio_b and tariff_group fields to quotes table
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS fio_b NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS tariff_group TEXT DEFAULT 'B',
ADD COLUMN IF NOT EXISTS tariff_subgroup TEXT,
ADD COLUMN IF NOT EXISTS simultaneity_factor NUMERIC DEFAULT 0.8,
ADD COLUMN IF NOT EXISTS compensated_energy_tax NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_cost NUMERIC DEFAULT 0;