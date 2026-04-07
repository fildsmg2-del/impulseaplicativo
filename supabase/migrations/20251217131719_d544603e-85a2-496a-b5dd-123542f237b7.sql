-- Função para avançar etapa do projeto (SECURITY DEFINER para bypass RLS)
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
  
  -- Verificar se o usuário pode modificar a etapa atual
  IF _user_role NOT IN ('MASTER', 'DEV') THEN
    -- Verificar se o usuário tem permissão para a etapa atual
    IF NOT (
      (_user_role = 'VENDEDOR' AND _current_status IN ('DOCUMENTACAO', 'POS_VENDA')) OR
      (_user_role = 'FINANCEIRO' AND _current_status IN ('FINANCEIRO', 'POS_VENDA')) OR
      (_user_role = 'ENGENHEIRO' AND _current_status IN ('HOMOLOGACAO', 'INSTALACAO', 'VISTORIA', 'CONEXAO', 'MONITORAMENTO', 'CONCLUIDO', 'POS_VENDA')) OR
      (_user_role = 'TECNICO' AND _current_status IN ('INSTALACAO', 'CONEXAO', 'MONITORAMENTO', 'CONCLUIDO', 'POS_VENDA'))
    ) THEN
      RAISE EXCEPTION 'Você não tem permissão para modificar esta etapa';
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

-- Função para retroceder etapa do projeto
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
  
  -- Verificar se o usuário pode modificar a etapa atual
  IF _user_role NOT IN ('MASTER', 'DEV') THEN
    -- Verificar se o usuário tem permissão para a etapa atual
    IF NOT (
      (_user_role = 'VENDEDOR' AND _current_status IN ('DOCUMENTACAO', 'POS_VENDA')) OR
      (_user_role = 'FINANCEIRO' AND _current_status IN ('FINANCEIRO', 'POS_VENDA')) OR
      (_user_role = 'ENGENHEIRO' AND _current_status IN ('HOMOLOGACAO', 'INSTALACAO', 'VISTORIA', 'CONEXAO', 'MONITORAMENTO', 'CONCLUIDO', 'POS_VENDA')) OR
      (_user_role = 'TECNICO' AND _current_status IN ('INSTALACAO', 'CONEXAO', 'MONITORAMENTO', 'CONCLUIDO', 'POS_VENDA'))
    ) THEN
      RAISE EXCEPTION 'Você não tem permissão para modificar esta etapa';
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