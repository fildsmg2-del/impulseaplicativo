-- Atualização da política de visibilidade de perfis para permitir que todos os usuários autenticados vejam uns aos outros
-- Data: 2026-04-20
-- Objetivo: Permitir que o cargo ENGENHEIRO (e outros) consiga visualizar técnicos para seleção em OS

-- 1. Remover políticas antigas restritivas
DROP POLICY IF EXISTS "Allowed roles can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Masters can view all profiles" ON public.profiles;

-- 2. Criar uma nova política que permite que qualquer usuário autenticado veja os nomes e e-mails dos colegas
-- Isso é fundamental para seleção de técnicos, chat e gestão de projetos
CREATE POLICY "profiles_select_all" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);
