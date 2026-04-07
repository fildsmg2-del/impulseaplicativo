-- Create API settings table
CREATE TABLE public.api_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  is_secret BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Enable RLS
ALTER TABLE public.api_settings ENABLE ROW LEVEL SECURITY;

-- Only DEV role can access api_settings
CREATE POLICY "DEV users can view api settings" 
ON public.api_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'DEV'::app_role) OR has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "DEV users can insert api settings" 
ON public.api_settings 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'DEV'::app_role) OR has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "DEV users can update api settings" 
ON public.api_settings 
FOR UPDATE 
USING (has_role(auth.uid(), 'DEV'::app_role) OR has_role(auth.uid(), 'MASTER'::app_role))
WITH CHECK (has_role(auth.uid(), 'DEV'::app_role) OR has_role(auth.uid(), 'MASTER'::app_role));

CREATE POLICY "DEV users can delete api settings" 
ON public.api_settings 
FOR DELETE 
USING (has_role(auth.uid(), 'DEV'::app_role) OR has_role(auth.uid(), 'MASTER'::app_role));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_settings_updated_at
BEFORE UPDATE ON public.api_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default API settings
INSERT INTO public.api_settings (key, value, description, category, is_secret) VALUES
('GOOGLE_MAPS_API_KEY', '', 'Chave da API do Google Maps para geocodificação', 'maps', true),
('CEMIG_API_URL', '', 'URL da API da CEMIG para leitura de contas', 'energy', false),
('WHATSAPP_API_URL', '', 'URL da API do WhatsApp Business', 'communication', false),
('WHATSAPP_API_TOKEN', '', 'Token da API do WhatsApp Business', 'communication', true),
('DEFAULT_TARIFF_RATE', '0.85', 'Tarifa padrão de energia (R$/kWh)', 'calculation', false),
('DEFAULT_IRRADIATION', '4.5', 'Irradiação solar padrão (kWh/m²/dia)', 'calculation', false),
('SYSTEM_EMAIL', '', 'Email do sistema para notificações', 'notification', false);
