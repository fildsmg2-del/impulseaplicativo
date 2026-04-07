-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view clients" ON public.clients;

-- Create more restrictive SELECT policies
-- MASTER and DEV can view all clients
CREATE POLICY "MASTER and DEV can view all clients"
ON public.clients
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can view clients they created
CREATE POLICY "Users can view clients they created"
ON public.clients
FOR SELECT
USING (created_by = auth.uid());

-- Users can view clients associated with their projects
CREATE POLICY "Users can view clients from their projects"
ON public.clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM public.projects 
    WHERE assigned_to = auth.uid() OR created_by = auth.uid()
  )
);

-- Users can view clients from quotes they created
CREATE POLICY "Users can view clients from their quotes"
ON public.clients
FOR SELECT
USING (
  id IN (
    SELECT client_id FROM public.quotes 
    WHERE created_by = auth.uid()
  )
);

-- Update INSERT policy to track creator
DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
CREATE POLICY "Authenticated users can insert clients"
ON public.clients
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Update UPDATE policy to be more restrictive
DROP POLICY IF EXISTS "Authenticated users can update clients" ON public.clients;

-- MASTER and DEV can update all clients
CREATE POLICY "MASTER and DEV can update all clients"
ON public.clients
FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can update clients they created
CREATE POLICY "Users can update clients they created"
ON public.clients
FOR UPDATE
USING (created_by = auth.uid());