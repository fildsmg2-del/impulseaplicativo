-- Add RLS policy for users to view projects assigned to their role
CREATE POLICY "Users can view projects assigned to their role" 
ON public.projects 
FOR SELECT 
USING (
  (
    has_role(auth.uid(), 'VENDEDOR'::app_role) AND assigned_role = 'VENDEDOR'
  ) OR (
    has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND assigned_role = 'ENGENHEIRO'
  ) OR (
    has_role(auth.uid(), 'FINANCEIRO'::app_role) AND assigned_role = 'FINANCEIRO'
  ) OR (
    has_role(auth.uid(), 'TECNICO'::app_role) AND assigned_role = 'TECNICO'
  )
);

-- Add RLS policy for users to update projects assigned to their role
CREATE POLICY "Users can update projects assigned to their role" 
ON public.projects 
FOR UPDATE 
USING (
  (
    has_role(auth.uid(), 'VENDEDOR'::app_role) AND assigned_role = 'VENDEDOR'
  ) OR (
    has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND assigned_role = 'ENGENHEIRO'
  ) OR (
    has_role(auth.uid(), 'FINANCEIRO'::app_role) AND assigned_role = 'FINANCEIRO'
  ) OR (
    has_role(auth.uid(), 'TECNICO'::app_role) AND assigned_role = 'TECNICO'
  )
);