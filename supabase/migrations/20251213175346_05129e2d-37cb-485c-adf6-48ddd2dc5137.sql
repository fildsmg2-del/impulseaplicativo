-- Create storage bucket for project documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-documents', 'project-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to project-documents bucket
CREATE POLICY "Authenticated users can upload project documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-documents');

-- Allow authenticated users to view project documents
CREATE POLICY "Authenticated users can view project documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-documents');

-- Allow authenticated users to update project documents
CREATE POLICY "Authenticated users can update project documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-documents');

-- Only MASTER can delete project documents
CREATE POLICY "Masters can delete project documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-documents' AND public.has_role(auth.uid(), 'MASTER'::app_role));

-- Add new column to store documents per stage
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS stage_documents jsonb DEFAULT '{}'::jsonb;

-- Update the project_status enum to include new stages
ALTER TYPE project_status ADD VALUE IF NOT EXISTS 'POS_VENDA';