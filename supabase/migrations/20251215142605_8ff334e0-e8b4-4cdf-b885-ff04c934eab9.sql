-- Create activities table for agenda
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  activity_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  activity_type TEXT NOT NULL DEFAULT 'REUNIAO',
  client_id UUID REFERENCES public.clients(id),
  project_id UUID REFERENCES public.projects(id),
  assigned_to UUID,
  created_by UUID,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view activities" 
ON public.activities 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert activities" 
ON public.activities 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update activities" 
ON public.activities 
FOR UPDATE 
USING (true);

CREATE POLICY "Masters can delete activities" 
ON public.activities 
FOR DELETE 
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();