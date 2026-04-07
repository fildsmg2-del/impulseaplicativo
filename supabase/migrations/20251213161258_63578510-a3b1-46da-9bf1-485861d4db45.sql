-- Create kits table for solar system kits
CREATE TABLE public.kits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  system_type TEXT NOT NULL DEFAULT 'on_grid', -- on_grid, hibrido, off_grid
  
  -- Power specifications
  total_power_kwp NUMERIC NOT NULL DEFAULT 0,
  min_consumption_kwh NUMERIC,
  max_consumption_kwh NUMERIC,
  min_area_m2 NUMERIC,
  max_area_m2 NUMERIC,
  
  -- Pricing
  cost_price NUMERIC NOT NULL DEFAULT 0,
  sale_price NUMERIC NOT NULL DEFAULT 0,
  
  -- Kit items (JSONB array with product references)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kits ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view kits"
ON public.kits FOR SELECT
USING (true);

CREATE POLICY "Masters can insert kits"
ON public.kits FOR INSERT
WITH CHECK (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can update kits"
ON public.kits FOR UPDATE
USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can delete kits"
ON public.kits FOR DELETE
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_kits_updated_at
BEFORE UPDATE ON public.kits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();