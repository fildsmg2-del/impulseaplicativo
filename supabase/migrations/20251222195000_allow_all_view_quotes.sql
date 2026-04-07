-- Allow all authenticated users to view quotes
DROP POLICY IF EXISTS "MASTER and DEV can view all quotes" ON public.quotes;
DROP POLICY IF EXISTS "Users can view their own quotes" ON public.quotes;

CREATE POLICY "Authenticated users can view quotes"
ON public.quotes
FOR SELECT
USING (auth.uid() IS NOT NULL);
