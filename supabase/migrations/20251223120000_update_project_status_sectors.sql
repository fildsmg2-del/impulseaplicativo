-- Update project_status enum to new sector-based statuses
CREATE TYPE public.project_status_new AS ENUM (
  'VENDAS',
  'FINANCEIRO',
  'COMPRAS',
  'ENGENHEIRO',
  'TECNICO',
  'POS_VENDA'
);

ALTER TABLE public.projects
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.projects
  ALTER COLUMN status TYPE public.project_status_new
  USING (
    CASE status::text
      WHEN 'DOCUMENTACAO' THEN 'VENDAS'
      WHEN 'FINANCEIRO' THEN 'FINANCEIRO'
      WHEN 'HOMOLOGACAO' THEN 'ENGENHEIRO'
      WHEN 'INSTALACAO' THEN 'TECNICO'
      WHEN 'VISTORIA' THEN 'TECNICO'
      WHEN 'CONEXAO' THEN 'TECNICO'
      WHEN 'MONITORAMENTO' THEN 'TECNICO'
      WHEN 'CONCLUIDO' THEN 'POS_VENDA'
      WHEN 'POS_VENDA' THEN 'POS_VENDA'
      ELSE 'VENDAS'
    END
  )::public.project_status_new;

ALTER TABLE public.projects
  ALTER COLUMN status SET DEFAULT 'VENDAS';

ALTER TYPE public.project_status RENAME TO project_status_old;
ALTER TYPE public.project_status_new RENAME TO project_status;
DROP TYPE public.project_status_old;

-- Update SELECT policy to include new sectors
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
    assigned_role = 'TECNICO'::text
    OR status IN ('TECNICO'::project_status, 'POS_VENDA'::project_status)
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
    assigned_role = 'TECNICO'::text
    OR status IN ('TECNICO'::project_status, 'POS_VENDA'::project_status)
  ))
);

-- Função para avançar setor do projeto (SECURITY DEFINER para bypass RLS)
CREATE OR REPLACE FUNCTION public.advance_project_stage(
  _project_id uuid,
  _new_status project_status,
  _new_assigned_role text,
  _checklist jsonb,
  _stage_documents jsonb
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
    checklist = _checklist,
    stage_documents = _stage_documents,
    updated_at = now()
  WHERE id = _project_id;
END;
$$;

-- Função para retroceder setor do projeto
CREATE OR REPLACE FUNCTION public.go_back_project_stage(
  _project_id uuid,
  _new_status project_status,
  _new_assigned_role text,
  _checklist jsonb,
  _stage_documents jsonb
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
    checklist = _checklist,
    stage_documents = _stage_documents,
    updated_at = now()
  WHERE id = _project_id;
END;
$$;
