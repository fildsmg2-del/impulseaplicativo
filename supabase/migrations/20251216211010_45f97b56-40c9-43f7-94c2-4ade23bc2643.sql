-- Drop the existing policy and create a new one that allows TECNICO to see projects by stage
DROP POLICY IF EXISTS "Users can view projects assigned to their role" ON public.projects;

CREATE POLICY "Users can view projects assigned to their role" 
ON public.projects 
FOR SELECT 
USING (
  -- VENDEDOR sees projects assigned to VENDEDOR role
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND assigned_role = 'VENDEDOR'::text)
  OR
  -- ENGENHEIRO sees projects assigned to ENGENHEIRO role
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND assigned_role = 'ENGENHEIRO'::text)
  OR
  -- FINANCEIRO sees projects assigned to FINANCEIRO role  
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND assigned_role = 'FINANCEIRO'::text)
  OR
  -- TECNICO sees projects in their allowed stages (INSTALACAO, CONEXAO, MONITORAMENTO, CONCLUSAO) OR assigned to them
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
);

-- Also update the UPDATE policy for TECNICO
DROP POLICY IF EXISTS "Users can update projects assigned to their role" ON public.projects;

CREATE POLICY "Users can update projects assigned to their role" 
ON public.projects 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND assigned_role = 'VENDEDOR'::text)
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND assigned_role = 'ENGENHEIRO'::text)
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND assigned_role = 'FINANCEIRO'::text)
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
);