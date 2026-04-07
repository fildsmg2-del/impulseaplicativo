-- Add installation type to projects
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS installation_type text NOT NULL DEFAULT 'URBANO';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'projects_installation_type_check'
  ) THEN
    ALTER TABLE public.projects
    ADD CONSTRAINT projects_installation_type_check
    CHECK (installation_type IN ('URBANO', 'RURAL', 'CNPJ'));
  END IF;
END $$;
