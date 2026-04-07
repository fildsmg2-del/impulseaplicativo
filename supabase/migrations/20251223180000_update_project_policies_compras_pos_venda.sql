-- Update project policies to include COMPRAS and POS_VENDA roles
DROP POLICY IF EXISTS "Users can view projects by role and stage" ON public.projects;

CREATE POLICY "Users can view projects by role and stage"
ON public.projects
FOR SELECT
USING (
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text
    OR status IN ('VENDAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text
    OR status IN ('FINANCEIRO'::project_status, 'COMPRAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'COMPRAS'::app_role) AND (
    assigned_role = 'COMPRAS'::text
    OR status IN ('COMPRAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text
    OR status IN ('ENGENHEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text
    OR status IN ('TECNICO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'POS_VENDA'::app_role) AND (
    assigned_role = 'POS_VENDA'::text
    OR status = 'POS_VENDA'::project_status
  ))
);

DROP POLICY IF EXISTS "Users can update projects by role and stage" ON public.projects;

CREATE POLICY "Users can update projects by role and stage"
ON public.projects
FOR UPDATE
USING (
  (has_role(auth.uid(), 'VENDEDOR'::app_role) AND (
    assigned_role = 'VENDEDOR'::text
    OR status IN ('VENDAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text
    OR status IN ('FINANCEIRO'::project_status, 'COMPRAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'COMPRAS'::app_role) AND (
    assigned_role = 'COMPRAS'::text
    OR status IN ('COMPRAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text
    OR status IN ('ENGENHEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_role = 'TECNICO'::text
    OR status IN ('TECNICO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'POS_VENDA'::app_role) AND (
    assigned_role = 'POS_VENDA'::text
    OR status = 'POS_VENDA'::project_status
  ))
);
