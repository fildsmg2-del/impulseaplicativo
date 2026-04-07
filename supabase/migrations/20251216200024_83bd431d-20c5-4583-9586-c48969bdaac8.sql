-- Create project activity logs table for tracking all activities
CREATE TABLE public.project_activity_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  stage text NOT NULL,
  description text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_by_role text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view activity logs" 
ON public.project_activity_logs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert activity logs" 
ON public.project_activity_logs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Masters can delete activity logs" 
ON public.project_activity_logs 
FOR DELETE 
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Add assigned_role column to projects for workflow tracking
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS assigned_role text DEFAULT 'VENDEDOR';

-- Create index for better performance
CREATE INDEX idx_project_activity_logs_project_id ON public.project_activity_logs(project_id);
CREATE INDEX idx_project_activity_logs_stage ON public.project_activity_logs(stage);