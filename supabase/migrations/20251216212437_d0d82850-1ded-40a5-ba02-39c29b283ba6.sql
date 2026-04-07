-- Add signature fields to quotes table
ALTER TABLE public.quotes
ADD COLUMN IF NOT EXISTS signature_token text UNIQUE,
ADD COLUMN IF NOT EXISTS client_signature text,
ADD COLUMN IF NOT EXISTS client_signed_at timestamp with time zone;

-- Create index for faster token lookups
CREATE INDEX IF NOT EXISTS idx_quotes_signature_token ON public.quotes(signature_token) WHERE signature_token IS NOT NULL;

-- Create RLS policy for public access via token (for edge function)
-- The edge function will use service role key, so no public RLS needed