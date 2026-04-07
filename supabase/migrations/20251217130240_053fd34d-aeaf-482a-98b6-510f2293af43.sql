-- Add policy to allow MASTER users to delete profiles
CREATE POLICY "Masters can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'MASTER'));