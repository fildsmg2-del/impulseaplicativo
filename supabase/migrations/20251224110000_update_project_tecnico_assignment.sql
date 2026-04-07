-- Update RLS policies to use assigned_to for technicians
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
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text
    OR status IN ('ENGENHEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_to = auth.uid()
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
    OR status IN ('VENDAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'FINANCEIRO'::app_role) AND (
    assigned_role = 'FINANCEIRO'::text
    OR status IN ('FINANCEIRO'::project_status, 'COMPRAS'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'ENGENHEIRO'::app_role) AND (
    assigned_role = 'ENGENHEIRO'::text
    OR status IN ('ENGENHEIRO'::project_status, 'POS_VENDA'::project_status)
  ))
  OR
  (has_role(auth.uid(), 'TECNICO'::app_role) AND (
    assigned_to = auth.uid()
  ))
);

-- Update advance_project_stage to persist technician assignment
DROP FUNCTION IF EXISTS public.advance_project_stage(uuid, project_status, text, jsonb, jsonb);

CREATE OR REPLACE FUNCTION public.advance_project_stage(
  _project_id uuid,
  _new_status project_status,
  _new_assigned_role text,
  _checklist jsonb,
  _stage_documents jsonb,
  _assigned_to uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _current_status project_status;
  _user_role app_role;
BEGIN
  -- Buscar status atual do projeto
  SELECT status INTO _current_status FROM projects WHERE id = _project_id;
  
  IF _current_status IS NULL THEN
    RAISE EXCEPTION 'Projeto não encontrado';
  END IF;
  
  -- Buscar role do usuário atual
  SELECT role INTO _user_role FROM user_roles WHERE user_id = auth.uid();
  
  -- Verificar se o usuário pode modificar o setor atual
  IF _user_role NOT IN ('MASTER', 'DEV') THEN
    IF NOT (
      (_user_role = 'VENDEDOR' AND _current_status IN ('VENDAS', 'POS_VENDA')) OR
      (_user_role = 'FINANCEIRO' AND _current_status IN ('FINANCEIRO', 'COMPRAS', 'POS_VENDA')) OR
      (_user_role = 'ENGENHEIRO' AND _current_status IN ('ENGENHEIRO', 'POS_VENDA')) OR
      (_user_role = 'TECNICO' AND _current_status IN ('TECNICO', 'POS_VENDA'))
    ) THEN
      RAISE EXCEPTION 'Você não tem permissão para modificar este setor';
    END IF;
  END IF;
  
  -- Atualizar o projeto
  UPDATE projects
  SET 
    status = _new_status,
    assigned_role = _new_assigned_role,
    assigned_to = COALESCE(_assigned_to, assigned_to),
    checklist = _checklist,
    stage_documents = _stage_documents,
    updated_at = now()
  WHERE id = _project_id;
END;
$$;
