
-- Create app_permissions table
CREATE TABLE IF NOT EXISTS public.app_permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL DEFAULT 'geral',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role public.app_role NOT NULL,
    permission_id TEXT NOT NULL REFERENCES public.app_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(role, permission_id)
);

-- Create user_permissions table (for overrides)
CREATE TABLE IF NOT EXISTS public.user_permissions_override (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    permission_id TEXT NOT NULL REFERENCES public.app_permissions(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true, -- true = permit, false = block
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, permission_id)
);

-- Enable RLS
ALTER TABLE public.app_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_permissions_override ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'app_permissions_read_all' AND tablename = 'app_permissions') THEN
        CREATE POLICY "app_permissions_read_all" ON public.app_permissions FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'role_permissions_read_all' AND tablename = 'role_permissions') THEN
        CREATE POLICY "role_permissions_read_all" ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'user_permissions_override_read_all' AND tablename = 'user_permissions_override') THEN
        CREATE POLICY "user_permissions_override_read_all" ON public.user_permissions_override FOR SELECT USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Seed initial permissions
INSERT INTO public.app_permissions (id, name, category) VALUES
('dashboard.view', 'Visualizar Dashboard', 'geral'),
('calculator.view', 'Acessar Calculadora', 'utilidades'),
('drone.view', 'Acessar Módulo Drone', 'utilidades'),
('profile.view', 'Ver Perfil', 'meu_espaco'),
('my_area.view', 'Acessar Minha Área', 'meu_espaco'),
('agenda.view', 'Ver Agenda', 'meu_espaco'),
('clients.view', 'Gerir Clientes', 'vendas'),
('funnel.view', 'Ver Funil de Vendas', 'vendas'),
('quotes.view', 'Gerir Orçamentos', 'vendas'),
('projects.view', 'Gerir Projetos', 'vendas'),
('service_orders.view', 'Gerir Ordens de Serviço', 'vendas'),
('sales.view', 'Ver Vendas', 'vendas'),
('financial.view', 'Financeiro (Completo)', 'financeiro'),
('financial.receivables.view', 'Contas a Receber', 'financeiro'),
('financial.payables.view', 'Contas a Pagar', 'financeiro'),
('suppliers.view', 'Gerir Fornecedores', 'financeiro'),
('inventory.view', 'Gerir Estoque', 'financeiro'),
('settings.view', 'Configurações do Sistema', 'gestao'),
('employees.view', 'Gerir Funcionários', 'gestao'),
('dev.view', 'Área de Desenvolvedor', 'gestao'),
-- Action Permissions
('sale.edit', 'Editar Vendas', 'vendas'),
('sale.approve', 'Aprovar/Rejeitar Vendas', 'vendas'),
('sale.pay', 'Confirmar Pagamento de Venda', 'vendas'),
('project.manage', 'Gerenciar Etapas do Projeto', 'vendas'),
('financial.manage', 'Adicionar/Editar Transações', 'financeiro')
ON CONFLICT (id) DO NOTHING;

-- Seed default role permissions (MASTER defaults)
DO $$
DECLARE
    perm TEXT;
    roles public.app_role[] := ARRAY['MASTER'::public.app_role];
BEGIN
    FOR perm IN SELECT id FROM public.app_permissions WHERE id NOT IN ('dev.view')
    LOOP
        INSERT INTO public.role_permissions (role, permission_id)
        SELECT r, perm FROM unnest(roles) r
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;

-- Dev always gets everything (even if not in role_permissions, logic will handle)
-- But let's seed anyway for consistency
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'DEV'::public.app_role, id FROM public.app_permissions
ON CONFLICT DO NOTHING;

-- Vendedor defaults
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'VENDEDOR'::public.app_role, id FROM public.app_permissions 
WHERE id IN ('dashboard.view', 'calculator.view', 'profile.view', 'my_area.view', 'agenda.view', 'clients.view', 'funnel.view', 'quotes.view', 'projects.view', 'service_orders.view', 'sales.view')
ON CONFLICT DO NOTHING;

-- Financeiro defaults
INSERT INTO public.role_permissions (role, permission_id)
SELECT 'FINANCEIRO'::public.app_role, id FROM public.app_permissions 
WHERE id IN ('dashboard.view', 'calculator.view', 'profile.view', 'my_area.view', 'agenda.view', 'financial.view', 'financial.receivables.view', 'financial.payables.view', 'sales.view', 'inventory.view')
ON CONFLICT DO NOTHING;
