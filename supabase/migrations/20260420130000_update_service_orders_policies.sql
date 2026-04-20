-- Atualização da política de edição de OS para permitir que Engenheiros também editem qualquer OS
-- Data: 2026-04-20

-- Verificar se a política existe e removê-la antes de recriar com a nova regra
DROP POLICY IF EXISTS "MASTER and DEV can update all service orders" ON public.service_orders;

CREATE POLICY "MASTER, DEV and ENGENHEIRO can update all service orders"
ON public.service_orders FOR UPDATE
USING (
  has_role(auth.uid(), 'MASTER'::app_role) 
  OR has_role(auth.uid(), 'DEV'::app_role)
  OR has_role(auth.uid(), 'ENGENHEIRO'::app_role)
);

-- Atualização para Drone Services
DROP POLICY IF EXISTS "drone_services_update" ON public.drone_services;
CREATE POLICY "drone_services_update_v2" ON public.drone_services 
    FOR UPDATE TO authenticated USING (
        auth.uid() = created_by OR 
        auth.uid() = technician_id OR 
        has_role(auth.uid(), 'MASTER'::app_role) OR 
        has_role(auth.uid(), 'DEV'::app_role) OR 
        has_role(auth.uid(), 'ENGENHEIRO'::app_role) OR 
        has_role(auth.uid(), 'FINANCEIRO'::app_role)
    );
