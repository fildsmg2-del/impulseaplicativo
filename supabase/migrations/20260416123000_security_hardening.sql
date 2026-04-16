-- Migração de Endurecimento de Segurança (Security Hardening - Deep Clean)
-- Esta versão usa SQL dinâmico para remover TODAS as políticas existentes antes de recriar as seguras.
-- Data: 2026-04-16

DO $$
DECLARE
    r RECORD;
    target_tables TEXT[] := ARRAY[
        'dev_chat_messages', 
        'drone_services', 
        'drone_service_logs', 
        'service_order_questionnaire_responses', 
        'service_order_questionnaire_templates',
        'clients',
        'projects',
        'user_roles',
        'company_settings'
    ];
    table_name_var TEXT;
BEGIN
    -- 1. Remoção dinâmica de TODAS as políticas nas tabelas alvo
    FOREACH table_name_var IN ARRAY target_tables
    LOOP
        FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = table_name_var)
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, table_name_var);
        END LOOP;
        
        -- Garante que RLS está habilitado
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', table_name_var);
    END LOOP;
END $$;

-- 2. Correção de segurança em funções (Search Path)
ALTER FUNCTION public.generate_os_display_code() SET search_path = public;
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.has_role(uuid, public.app_role) SET search_path = public;

-- 3. Recriação Granular das Políticas

-- A. Drone Services
CREATE POLICY "drone_services_select" ON public.drone_services 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "drone_services_insert" ON public.drone_services 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "drone_services_update" ON public.drone_services 
    FOR UPDATE TO authenticated USING (
        auth.uid() = created_by OR 
        auth.uid() = technician_id OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
    );

CREATE POLICY "drone_services_delete" ON public.drone_services 
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
    );

-- B. Drone Service Logs
CREATE POLICY "drone_logs_select" ON public.drone_service_logs 
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "drone_logs_insert" ON public.drone_service_logs 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "drone_logs_delete" ON public.drone_service_logs 
    FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
    );

-- C. Suporte (Chat DEV/Telegram)
CREATE POLICY "dev_messages_select" ON public.dev_chat_messages 
    FOR SELECT TO authenticated USING (
        auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
    );

CREATE POLICY "dev_messages_insert" ON public.dev_chat_messages 
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- D. Questionários
DO $$ 
BEGIN
    -- service_order_questionnaire_templates
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_order_questionnaire_templates') THEN
        CREATE POLICY "templates_select" ON public.service_order_questionnaire_templates FOR SELECT TO authenticated USING (true);
        CREATE POLICY "templates_manage" ON public.service_order_questionnaire_templates FOR ALL USING (
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
        );
    END IF;

    -- service_order_questionnaire_responses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_order_questionnaire_responses') THEN
        CREATE POLICY "responses_select" ON public.service_order_questionnaire_responses FOR SELECT TO authenticated USING (true);
        CREATE POLICY "responses_insert" ON public.service_order_questionnaire_responses FOR INSERT TO authenticated WITH CHECK (true);
        CREATE POLICY "responses_update" ON public.service_order_questionnaire_responses FOR ALL USING (
            EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV'))
        );
    END IF;
END $$;

-- 4. Endurecimento de Storage (Buckets)
-- Removemos todas as políticas do bucket alvo e recriamos de forma segura.
DO $$
DECLARE
    r RECORD;
BEGIN
    -- No Supabase, as políticas de storage ficam em pg_policies sob a tabela 'objects' no schema 'storage'
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects'
        AND (
            policyname ILIKE '%chat-attachments%' 
            OR policyname ILIKE '%support-attachments%'
            OR policyname ILIKE '%public%'
        )
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', r.policyname);
    END LOOP;
END $$;

-- Recria políticas de storage
CREATE POLICY "authenticated_access_chat_attachments" 
ON storage.objects FOR SELECT 
TO authenticated 
USING (bucket_id = 'chat-attachments');

CREATE POLICY "authenticated_upload_chat_attachments" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-attachments');

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'support-attachments') THEN
        CREATE POLICY "authenticated_access_support_attachments" 
        ON storage.objects FOR SELECT 
        TO authenticated 
        USING (bucket_id = 'support-attachments');
        
        CREATE POLICY "authenticated_upload_support_attachments" 
        ON storage.objects FOR INSERT 
        TO authenticated 
        WITH CHECK (bucket_id = 'support-attachments');
    END IF;
END $$;

-- 5. Clientes/Projetos (Garantir políticas básicas já que as antigas foram limpas)
CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_insert" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "clients_update" ON public.clients FOR UPDATE TO authenticated USING (true);

CREATE POLICY "projects_select" ON public.projects FOR SELECT TO authenticated USING (true);
CREATE POLICY "projects_insert" ON public.projects FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "projects_update" ON public.projects FOR UPDATE TO authenticated USING (true);

-- 6. User Roles (Proteção MASTER)
CREATE POLICY "roles_select_own" ON public.user_roles FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV')));
CREATE POLICY "roles_manage_master" ON public.user_roles FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV')));

-- 7. Company Settings (Read-only para logados)
CREATE POLICY "company_settings_select" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "company_settings_manage" ON public.company_settings FOR ALL USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('MASTER', 'DEV')));
