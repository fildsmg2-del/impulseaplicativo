-- Update SELECT policy to include POS_VENDA for all roles
DROP POLICY IF EXISTS "Users can view projects by role and stage" ON public.projects;

CREATE POLICY "Users can view projects by role and stage" 
ON public.projects 
FOR SELECT 
USING (
  -- VENDEDOR sees DOCUMENTACAO and POS_VENDA
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text 
    OR status IN ('DOCUMENTACAO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  -- FINANCEIRO sees FINANCEIRO and POS_VENDA
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text 
    OR status IN ('FINANCEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  -- ENGENHEIRO sees their stages and POS_VENDA
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text 
    OR status IN ('HOMOLOGACAO'::project_status, 'INSTALACAO'::project_status, 'VISTORIA'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  -- TECNICO sees their stages and POS_VENDA
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status, 'POS_VENDA'::project_status)
  ))
);

-- Update UPDATE policy too
DROP POLICY IF EXISTS "Users can update projects by role and stage" ON public.projects;

CREATE POLICY "Users can update projects by role and stage" 
ON public.projects 
FOR UPDATE 
USING (
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text 
    OR status IN ('DOCUMENTACAO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text 
    OR status IN ('FINANCEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text 
    OR status IN ('HOMOLOGACAO'::project_status, 'INSTALACAO'::project_status, 'VISTORIA'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text 
    OR status IN ('INSTALACAO'::project_status, 'CONEXAO'::project_status, 'MONITORAMENTO'::project_status, 'CONCLUIDO'::project_status, 'POS_VENDA'::project_status)
  ))
);