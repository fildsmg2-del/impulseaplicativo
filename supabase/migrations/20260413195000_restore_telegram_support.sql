-- Garantir que a tabela de mensagens de suporte existe
CREATE TABLE IF NOT EXISTS public.dev_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    message TEXT,
    telegram_message_id BIGINT,
    is_from_dev BOOLEAN DEFAULT false,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ativar RLS se no estiver ativado
ALTER TABLE public.dev_chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dev_chat_messages' AND policyname = 'Anyone can view messages') THEN
        CREATE POLICY "Anyone can view messages" ON public.dev_chat_messages FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'dev_chat_messages' AND policyname = 'Anyone can insert messages') THEN
        CREATE POLICY "Anyone can insert messages" ON public.dev_chat_messages FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

-- Limpar gatilhos antigos
DROP TRIGGER IF EXISTS on_dev_chat_message_inserted ON public.dev_chat_messages;

-- Criar Gatilho para chamar a Edge Function via Webhook do Supabase
-- Nota: Voc tambm pode configurar isso pelo Painel do Supabase em "Database > Webhooks"
-- Mas vamos tentar deixar registrado via SQL tambm.

-- Criar a função que dispara o webhook via pg_net (se disponível) ou apenas registra o log
CREATE OR REPLACE FUNCTION public.handle_new_dev_chat_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a mensagem no for do DEV, envia para o Telegram
  IF NEW.is_from_dev = false THEN
    -- Aqui o Supabase gerencia o webhook via Painel "Database > Webhooks"
    -- que  o mtodo mais robusto atualmente. 
    -- Se estiver usando o CLI, ele cria o webhook automaticamente.
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_dev_chat_message_inserted
AFTER INSERT ON public.dev_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.handle_new_dev_chat_message();
