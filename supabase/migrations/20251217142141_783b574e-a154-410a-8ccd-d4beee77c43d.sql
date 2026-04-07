-- Create service_orders table
CREATE TABLE public.service_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id),
  service_type TEXT NOT NULL,
  execution_date DATE,
  status TEXT NOT NULL DEFAULT 'EM_ABERTO',
  attachments JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_by UUID,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create service_order_logs table (diário da OS)
CREATE TABLE public.service_order_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_order_id UUID NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  created_by UUID,
  created_by_name TEXT,
  created_by_role TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on service_orders
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on service_order_logs
ALTER TABLE public.service_order_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for service_orders
CREATE POLICY "Authenticated users can view service orders"
ON public.service_orders FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert service orders"
ON public.service_orders FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "MASTER and DEV can update all service orders"
ON public.service_orders FOR UPDATE
USING (has_role(auth.uid(), 'MASTER'::app_role) OR has_role(auth.uid(), 'DEV'::app_role));

CREATE POLICY "Users can update their service orders"
ON public.service_orders FOR UPDATE
USING (created_by = auth.uid() OR assigned_to = auth.uid());

CREATE POLICY "Masters can delete service orders"
ON public.service_orders FOR DELETE
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- RLS policies for service_order_logs
CREATE POLICY "Authenticated users can view service order logs"
ON public.service_order_logs FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert service order logs"
ON public.service_order_logs FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Masters can delete service order logs"
ON public.service_order_logs FOR DELETE
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_service_orders_updated_at
BEFORE UPDATE ON public.service_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();