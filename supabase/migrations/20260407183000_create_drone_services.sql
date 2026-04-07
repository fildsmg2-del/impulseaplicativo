-- Create drone service status enum
DO $$ BEGIN
    CREATE TYPE drone_service_status AS ENUM ('PENDENTE', 'TECNICO', 'REVISAO', 'FINALIZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create drone_services table with complete client data
CREATE TABLE IF NOT EXISTS public.drone_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_name TEXT NOT NULL,
    client_document TEXT,
    client_phone TEXT,
    client_cep TEXT,
    client_address_street TEXT,
    client_address_number TEXT,
    client_address_neighborhood TEXT,
    client_address_complement TEXT,
    client_address_city TEXT,
    client_address_state TEXT,
    service_description TEXT NOT NULL,
    area_hectares NUMERIC,
    product_used TEXT,
    location_link TEXT,
    status drone_service_status DEFAULT 'PENDENTE',
    technician_id UUID REFERENCES auth.users(id),
    office_notes TEXT,
    technician_notes TEXT,
    attachment_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE public.drone_services ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.drone_services;
CREATE POLICY "Enable all for authenticated users" ON public.drone_services
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_drone_services_updated_at ON public.drone_services;
CREATE TRIGGER update_drone_services_updated_at
    BEFORE UPDATE ON public.drone_services
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
