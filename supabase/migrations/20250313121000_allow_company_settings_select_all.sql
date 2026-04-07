CREATE POLICY "Authenticated can view company settings"
ON public.company_settings
FOR SELECT
USING (auth.uid() IS NOT NULL);
