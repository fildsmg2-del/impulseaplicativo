-- Drop existing SELECT policies for projects
DROP POLICY IF EXISTS "Users can view projects by role and stage" ON public.projects;

-- Create new policy that allows users to see projects at their stage AND all subsequent stages
-- This way, when a project advances, users can still see it for future reference
CREATE POLICY "Users can view projects by role and stage" 
ON public.projects 
FOR SELECT 
USING (
  -- VENDEDOR can see DOCUMENTACAO and all stages after (entire project lifecycle)
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    (assigned_role = 'VENDEDOR'::text) OR 
    (status = ANY (ARRAY[
      'DOCUMENTACAO'::project_status, 
      'FINANCEIRO'::project_status,
      'HOMOLOGACAO'::project_status,
      'INSTALACAO'::project_status,
      'VISTORIA'::project_status,
      'CONEXAO'::project_status,
      'MONITORAMENTO'::project_status,
      'CONCLUIDO'::project_status,
      'POS_VENDA'::project_status
    ]))
  )) OR
  -- FINANCEIRO can see FINANCEIRO and all stages after
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    (assigned_role = 'FINANCEIRO'::text) OR 
    (status = ANY (ARRAY[
      'FINANCEIRO'::project_status,
      'HOMOLOGACAO'::project_status,
      'INSTALACAO'::project_status,
      'VISTORIA'::project_status,
      'CONEXAO'::project_status,
      'MONITORAMENTO'::project_status,
      'CONCLUIDO'::project_status,
      'POS_VENDA'::project_status
    ]))
  )) OR
  -- ENGENHEIRO can see HOMOLOGACAO and all stages after
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    (assigned_role = 'ENGENHEIRO'::text) OR 
    (status = ANY (ARRAY[
      'HOMOLOGACAO'::project_status,
      'INSTALACAO'::project_status,
      'VISTORIA'::project_status,
      'CONEXAO'::project_status,
      'MONITORAMENTO'::project_status,
      'CONCLUIDO'::project_status,
      'POS_VENDA'::project_status
    ]))
  )) OR
  -- TECNICO can see INSTALACAO and all stages after
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    (assigned_role = 'TECNICO'::text) OR 
    (status = ANY (ARRAY[
      'INSTALACAO'::project_status,
      'VISTORIA'::project_status,
      'CONEXAO'::project_status,
      'MONITORAMENTO'::project_status,
      'CONCLUIDO'::project_status,
      'POS_VENDA'::project_status
    ]))
  ))
);