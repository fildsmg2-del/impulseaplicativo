-- Migração para OS Drone: Novos campos e correção de permissões RLS

DO $$ 
BEGIN
    -- 1. Adicionar campos na tabela drone_services
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drone_services' AND column_name = 'negotiated_conditions') THEN
        ALTER TABLE public.drone_services ADD COLUMN negotiated_conditions TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drone_services' AND column_name = 'estimated_start_date') THEN
        ALTER TABLE public.drone_services ADD COLUMN estimated_start_date DATE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'drone_services' AND column_name = 'estimated_completion_date') THEN
        ALTER TABLE public.drone_services ADD COLUMN estimated_completion_date DATE;
    END IF;
END $$;

-- 2. Corrigir políticas RLS para permitir que consultores de drone, financeiro e dev vejam perfis e cargos
-- Isso é necessário para que o dropdown de pilotos funcione corretamente para esses cargos.

-- Remover políticas restritivas antigas se existirem (nomes baseados na migração 20251213142845)
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Masters can view all roles" ON public.user_roles;

-- Criar novas políticas abrangentes para perfis
CREATE POLICY "Allowed roles can view all profiles" ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('MASTER', 'DEV', 'FINANCEIRO', 'CONSULTOR_TEC_DRONE')
        )
    );

-- Criar novas políticas abrangentes para cargos
CREATE POLICY "Allowed roles can view all roles" ON public.user_roles
    FOR SELECT
    USING (
        auth.uid() = user_id OR 
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('MASTER', 'DEV', 'FINANCEIRO', 'CONSULTOR_TEC_DRONE')
        )
    );
