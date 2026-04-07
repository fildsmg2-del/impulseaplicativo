-- Create service_types table for managing service types with deadlines
CREATE TABLE public.service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  deadline_days integer NOT NULL DEFAULT 5,
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view service types"
ON public.service_types
FOR SELECT
USING (true);

CREATE POLICY "Masters can insert service types"
ON public.service_types
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'MASTER'));

CREATE POLICY "Masters can update service types"
ON public.service_types
FOR UPDATE
USING (has_role(auth.uid(), 'MASTER'));

CREATE POLICY "Masters can delete service types"
ON public.service_types
FOR DELETE
USING (has_role(auth.uid(), 'MASTER'));

-- Add opening_date and deadline_date columns to service_orders
ALTER TABLE public.service_orders 
ADD COLUMN opening_date date DEFAULT CURRENT_DATE,
ADD COLUMN deadline_date date,
ADD COLUMN service_type_id uuid REFERENCES public.service_types(id);

-- Set opening_date for existing records
UPDATE public.service_orders 
SET opening_date = COALESCE(execution_date, created_at::date);

-- Insert default service types
INSERT INTO public.service_types (name, deadline_days) VALUES
  ('Manutenção Preventiva', 7),
  ('Manutenção Corretiva', 3),
  ('Limpeza de Módulos', 5),
  ('Troca de Inversor', 2),
  ('Visita Técnica', 5),
  ('Instalação de Monitoramento', 5),
  ('Reparo Elétrico', 2),
  ('Substituição de Componente', 3),
  ('Ajuste de Estrutura', 5),
  ('Outros', 5);

-- Create trigger for updated_at
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON public.service_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();