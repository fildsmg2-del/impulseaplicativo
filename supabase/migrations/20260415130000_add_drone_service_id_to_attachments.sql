-- Add drone_service_id to service_order_attachments
ALTER TABLE public.service_order_attachments 
ADD COLUMN IF NOT EXISTS drone_service_id UUID REFERENCES public.drone_services(id) ON DELETE CASCADE;

-- Make service_order_id nullable since an attachment can belong to either a standard OS or a Drone OS
ALTER TABLE public.service_order_attachments 
ALTER COLUMN service_order_id DROP NOT NULL;

-- Ensure RLS allows access if either service_order_id or drone_service_id is valid
-- (The existing policies use auth.uid() is not null which is enough for now, 
-- but we ensure the join can happen in the schema cache)
COMMENT ON COLUMN public.service_order_attachments.drone_service_id IS 'Link to Drone Service Orders';
