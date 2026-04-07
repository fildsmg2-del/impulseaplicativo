-- Create storage buckets for client documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('client-documents', 'client-documents', false);

-- RLS policies for client-documents bucket
CREATE POLICY "Authenticated users can upload client documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can view client documents"
ON storage.objects FOR SELECT
USING (bucket_id = 'client-documents' AND auth.role() = 'authenticated');

CREATE POLICY "Masters can delete client documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'client-documents' AND public.has_role(auth.uid(), 'MASTER'));

-- Add columns to clients table for document storage
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS cpf_rg_url TEXT,
ADD COLUMN IF NOT EXISTS electricity_bills JSONB DEFAULT '[]'::jsonb;

-- Add column to quotes for energy distributor
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS energy_distributor TEXT,
ADD COLUMN IF NOT EXISTS phase_type TEXT;