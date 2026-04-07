-- Add FINANCEIRO to the project_status enum
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'FINANCEIRO' AFTER 'DOCUMENTACAO';

-- Also add POS_VENDA if not exists (ensuring the workflow is complete)
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'POS_VENDA';