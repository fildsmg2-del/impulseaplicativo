-- Drop existing SELECT policies for clients
DROP POLICY IF EXISTS "MASTER and DEV can view all clients" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients they created" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients from their projects" ON public.clients;
DROP POLICY IF EXISTS "Users can view clients from their quotes" ON public.clients;

-- Create single policy allowing all authenticated users to view clients
-- (MASTER, DEV, VENDEDOR, ENGENHEIRO all need access to create quotes/sales)
CREATE POLICY "Authenticated users can view clients"
ON public.clients
FOR SELECT
USING (auth.uid() IS NOT NULL);