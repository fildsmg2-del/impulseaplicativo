-- Fix quotes table security - restrict access to creators, assigned staff, and MASTER/DEV
DROP POLICY IF EXISTS "Authenticated users can view quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can update quotes" ON public.quotes;
DROP POLICY IF EXISTS "Authenticated users can insert quotes" ON public.quotes;

-- MASTER and DEV can view all quotes
CREATE POLICY "MASTER and DEV can view all quotes"
ON public.quotes
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can view quotes they created
CREATE POLICY "Users can view their own quotes"
ON public.quotes
FOR SELECT
USING (created_by = auth.uid());

-- Authenticated users can insert quotes
CREATE POLICY "Authenticated users can insert quotes"
ON public.quotes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- MASTER and DEV can update all quotes
CREATE POLICY "MASTER and DEV can update all quotes"
ON public.quotes
FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can update quotes they created
CREATE POLICY "Users can update their own quotes"
ON public.quotes
FOR UPDATE
USING (created_by = auth.uid());

-- Fix projects table security
DROP POLICY IF EXISTS "Authenticated users can view projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can update projects" ON public.projects;
DROP POLICY IF EXISTS "Authenticated users can insert projects" ON public.projects;

-- MASTER and DEV can view all projects
CREATE POLICY "MASTER and DEV can view all projects"
ON public.projects
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can view projects they created or are assigned to
CREATE POLICY "Users can view their projects"
ON public.projects
FOR SELECT
USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- Authenticated users can insert projects
CREATE POLICY "Authenticated users can insert projects"
ON public.projects
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- MASTER and DEV can update all projects
CREATE POLICY "MASTER and DEV can update all projects"
ON public.projects
FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can update projects they created or are assigned to
CREATE POLICY "Users can update their projects"
ON public.projects
FOR UPDATE
USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- Fix sales table security
DROP POLICY IF EXISTS "Authenticated users can view sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can update sales" ON public.sales;
DROP POLICY IF EXISTS "Authenticated users can insert sales" ON public.sales;

-- MASTER and DEV can view all sales
CREATE POLICY "MASTER and DEV can view all sales"
ON public.sales
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can view sales they created
CREATE POLICY "Users can view their own sales"
ON public.sales
FOR SELECT
USING (created_by = auth.uid());

-- Authenticated users can insert sales
CREATE POLICY "Authenticated users can insert sales"
ON public.sales
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- MASTER and DEV can update all sales
CREATE POLICY "MASTER and DEV can update all sales"
ON public.sales
FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can update sales they created
CREATE POLICY "Users can update their own sales"
ON public.sales
FOR UPDATE
USING (created_by = auth.uid());

-- Fix activities table security  
DROP POLICY IF EXISTS "Authenticated users can view activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can update activities" ON public.activities;
DROP POLICY IF EXISTS "Authenticated users can insert activities" ON public.activities;

-- MASTER and DEV can view all activities
CREATE POLICY "MASTER and DEV can view all activities"
ON public.activities
FOR SELECT
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can view activities they created or are assigned to
CREATE POLICY "Users can view their activities"
ON public.activities
FOR SELECT
USING (created_by = auth.uid() OR assigned_to = auth.uid());

-- Authenticated users can insert activities
CREATE POLICY "Authenticated users can insert activities"
ON public.activities
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- MASTER and DEV can update all activities
CREATE POLICY "MASTER and DEV can update all activities"
ON public.activities
FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) OR 
  has_role(auth.uid(), 'DEV'::app_role)
);

-- Users can update activities they created or are assigned to
CREATE POLICY "Users can update their activities"
ON public.activities
FOR UPDATE
USING (created_by = auth.uid() OR assigned_to = auth.uid());