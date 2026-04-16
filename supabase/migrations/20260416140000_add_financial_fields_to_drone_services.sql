-- Adicionar campos financeiros à tabela drone_services
ALTER TABLE public.drone_services 
ADD COLUMN IF NOT EXISTS total_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS profit NUMERIC(10, 2) DEFAULT 0;

-- Observação: O lucro (profit) pode ser calculado, mas armazenamos por conveniência
-- como solicitado pelo usuário (colocar valor recebido, gasto e lucro).
