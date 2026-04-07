-- Update SELECT policy to allow all roles to see projects in their relevant stages
DROP POLICY IF EXISTS "Users can view projects assigned to their role" ON public.projects;

CREATE POLICY "Users can view projects by role and stage" 
ON public.projects 
FOR SELECT 
USING (
  -- VENDEDOR sees projects assigned to VENDEDOR or in DOCUMENTACAO stage
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text 
    OR status = 'DOCUMENTACAO'::project_status
  ))
  OR
  -- FINANCEIRO sees projects assigned to FINANCEIRO or in FINANCEIRO stage
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text 
    OR status = 'FINANCEIRO'::project_status
  ))
  OR
  -- ENGENHEIRO sees projects in their stages
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text 
    OR status IN ('HOMOLOGACAO'::project_status, 'INSTALACAO'::project_status, 'VISTORIA'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
  OR
  -- TECNICO sees projects in their stages
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
);

-- Update UPDATE policy similarly
DROP POLICY IF EXISTS "Users can update projects assigned to their role" ON public.projects;

CREATE POLICY "Users can update projects by role and stage" 
ON public.projects 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text 
    OR status = 'DOCUMENTACAO'::project_status
  ))
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text 
    OR status = 'FINANCEIRO'::project_status
  ))
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text 
    OR status IN ('HOMOLOGACAO'::project_status, 'INSTALACAO'::project_status, 'VISTORIA'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status)
  ))
);