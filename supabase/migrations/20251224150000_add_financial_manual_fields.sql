-- Adicionar campos para anexo e entrada manual em transações
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS attachment_url TEXT,
ADD COLUMN IF NOT EXISTS client_name_manual TEXT,
ADD COLUMN IF NOT EXISTS supplier_name_manual TEXT;

COMMENT ON COLUMN transactions.attachment_url IS 'URL do comprovante de pagamento armazenado no R2';
COMMENT ON COLUMN transactions.client_name_manual IS 'Nome do cliente quando não cadastrado formalmente (Avulso)';
COMMENT ON COLUMN transactions.supplier_name_manual IS 'Nome do fornecedor quando não cadastrado formalmente (Avulso)';
