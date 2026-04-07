-- Create employees table for additional employee information
CREATE TABLE public.employees (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  position text NOT NULL DEFAULT 'VENDEDOR',
  admission_date date,
  next_vacation_date date,
  active boolean DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Masters can view all employees"
ON public.employees
FOR SELECT
USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can insert employees"
ON public.employees
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can update employees"
ON public.employees
FOR UPDATE
USING (has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "Masters can delete employees"
ON public.employees
FOR DELETE
USING (has_role(auth.uid(), 'MASTER'::app_role));

-- Users can view their own employee record
CREATE POLICY "Users can view own employee record"
ON public.employees
FOR SELECT
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();