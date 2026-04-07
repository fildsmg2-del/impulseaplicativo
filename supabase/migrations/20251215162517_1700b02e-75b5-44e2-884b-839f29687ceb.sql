-- Create audit logs table
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  performed_by UUID REFERENCES auth.users(id),
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only MASTER and DEV can view logs
CREATE POLICY "MASTER and DEV can view logs"
ON public.audit_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- All authenticated users can insert logs (for tracking their actions)
CREATE POLICY "Authenticated users can insert logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = performed_by);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);