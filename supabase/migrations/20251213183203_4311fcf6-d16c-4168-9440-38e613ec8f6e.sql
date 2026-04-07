-- Create company_settings table for storing company data used in PDFs
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL DEFAULT 'Impulse Soluções em Energia',
  cnpj text,
  email text,
  phone text,
  website text,
  street text,
  number text,
  complement text,
  neighborhood text,
  city text,
  state text,
  zip_code text,
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Only MASTER can view and modify company settings
CREATE POLICY "Masters can view company settings"
ON public.company_settings
FOR SELECT
USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can insert company settings"
ON public.company_settings
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can update company settings"
ON public.company_settings
FOR UPDATE
USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can delete company settings"
ON public.company_settings
FOR DELETE
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_company_settings_updated_at
BEFORE UPDATE ON public.company_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default company settings
INSERT INTO public.company_settings (name, email, phone) 
VALUES ('Impulse Soluções em Energia', 'contato@impulseenergia.com.br', '(31) 99999-9999');