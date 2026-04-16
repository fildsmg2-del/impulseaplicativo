-- Migração para liberar acesse do FINANCEIRO ao módulo Drone
-- Data: 2026-04-16

DO $$
BEGIN
    -- Conceder permissão drone.view para o cargo FINANCEIRO
    IF EXISTS (SELECT 1 FROM public.app_permissions WHERE id = 'drone.view') THEN
        INSERT INTO public.role_permissions (role, permission_id)
        VALUES ('FINANCEIRO'::public.app_role, 'drone.view')
        ON CONFLICT (role, permission_id) DO NOTHING;
    END IF;

    -- Garantir que o financeiro também tenha acesso aos logs/comentários de drone
    -- (Embora role_permissions geralmente gerencie visualização de módulos, 
    -- o acesso aos dados é via RLS que já permite autenticados)
END $$;
