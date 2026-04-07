-- Create sales table
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID REFERENCES public.quotes(id),
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.projects(id),
  
  -- Sale details
  sale_number TEXT NOT NULL,
  sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_completion_date DATE,
  
  -- Products/Items (JSON array with product details and prices)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Financial
  subtotal NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  
  -- Payment
  payment_method TEXT, -- 'A_VISTA', 'FINANCIADO', 'PARCELADO'
  payment_details JSONB, -- Store financing bank, installments, etc.
  payment_status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (payment_status IN ('PENDENTE', 'PAGO', 'PARCIAL')),
  
  -- Approval
  approval_status TEXT NOT NULL DEFAULT 'PENDENTE' CHECK (approval_status IN ('PENDENTE', 'APROVADO', 'REPROVADO')),
  
  -- Signatures (store as base64 or URLs)
  client_signature TEXT,
  company_signature TEXT,
  client_signed_at TIMESTAMP WITH TIME ZONE,
  company_signed_at TIMESTAMP WITH TIME ZONE,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view sales" 
ON public.sales 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert sales" 
ON public.sales 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales" 
ON public.sales 
FOR UPDATE 
USING (true);

CREATE POLICY "Masters can delete sales" 
ON public.sales 
FOR DELETE 
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_sales_updated_at
BEFORE UPDATE ON public.sales
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create sequence for sale numbers
CREATE SEQUENCE IF NOT EXISTS sale_number_seq START 1;

-- Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sale_number := 'VND-' || LPAD(nextval('sale_number_seq')::text, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate sale number
CREATE TRIGGER set_sale_number
BEFORE INSERT ON public.sales
FOR EACH ROW
WHEN (NEW.sale_number IS NULL OR NEW.sale_number = '')
EXECUTE FUNCTION generate_sale_number();