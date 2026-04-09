-- Migration: Add service_order_id to transactions
-- Description: Allows linking a financial transaction directly to a Service Order (OS).

ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS service_order_id UUID REFERENCES public.service_orders(id) ON DELETE SET NULL;

-- Index for better performance when querying by service_order_id
CREATE INDEX IF NOT EXISTS idx_transactions_service_order_id ON public.transactions(service_order_id);

-- Update RLS policies if necessary (assuming current policies allow access based on table ownership or similar)
-- Usually, the existing project_id access patterns will be mirrored for service_order_id.
