-- Update SELECT policy for service_orders to restrict visibility by assignment or role
DROP POLICY IF EXISTS "Authenticated users can view service orders" ON public.service_orders;

CREATE POLICY "Users can view assigned or privileged service orders"
ON public.service_orders FOR SELECT
USING (
  assigned_to = auth.uid()
  OR has_role(auth.uid(), 'MASTER'::app_role)
  OR has_role(auth.uid(), 'ENGENHEIRO'::app_role)
);
