-- 1. Garantir que a tabela dev_chat_messages está configurada corretamente
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'dev_chat_messages' AND COLUMN_NAME = 'telegram_message_id') THEN
        ALTER TABLE public.dev_chat_messages ADD COLUMN telegram_message_id TEXT;
    END IF;
END $$;

-- 2. Configurar o Storage para Anexos do Suporte
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-attachments', 'chat-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage para o Suporte
DROP POLICY IF EXISTS "Allow authenticated uploads support" ON storage.objects;
CREATE POLICY "Allow authenticated uploads support" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'chat-attachments');

DROP POLICY IF EXISTS "Allow public read access support" ON storage.objects;
CREATE POLICY "Allow public read access support" 
ON storage.objects FOR SELECT 
TO public 
USING (bucket_id = 'chat-attachments');

-- 3. Limpar gatilhos antigos
DROP TRIGGER IF EXISTS on_dev_chat_message_inserted ON public.dev_chat_messages;

-- 4. Criar o gatilho Webhook para Saída (App -> Telegram)
-- IMPORTANTE: Este comando deve ser executado no editor SQL do Supabase.
-- Ele usa a extensão de webhooks se disponível.
CREATE TRIGGER on_dev_chat_message_inserted
AFTER INSERT ON public.dev_chat_messages
FOR EACH ROW
EXECUTE FUNCTION "supabase_functions"."http_request"(
  'http://localhost:54321/functions/v1/telegram-support',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '1000'
);
