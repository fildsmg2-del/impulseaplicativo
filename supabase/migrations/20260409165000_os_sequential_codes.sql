-- Sequence for Solar OS
CREATE SEQUENCE IF NOT EXISTS public.service_orders_seq START 1;

-- Add columns to service_orders (Solar)
ALTER TABLE public.service_orders 
ADD COLUMN IF NOT EXISTS order_number BIGINT,
ADD COLUMN IF NOT EXISTS display_code TEXT UNIQUE;

-- Sequence for Drone OS
CREATE SEQUENCE IF NOT EXISTS public.drone_services_seq START 1;

-- Add columns to drone_services (Drone)
ALTER TABLE public.drone_services 
ADD COLUMN IF NOT EXISTS order_number BIGINT,
ADD COLUMN IF NOT EXISTS display_code TEXT UNIQUE;

-- Add drone_service_id to transactions
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS drone_service_id UUID REFERENCES public.drone_services(id) ON DELETE SET NULL;

-- Function to generate codes
CREATE OR REPLACE FUNCTION public.generate_os_display_code()
RETURNS TRIGGER AS $$
DECLARE
    prefix TEXT;
    seq_name TEXT;
    new_num BIGINT;
BEGIN
    IF TG_TABLE_NAME = 'service_orders' THEN
        prefix := 'SS';
        seq_name := 'public.service_orders_seq';
    ELSIF TG_TABLE_NAME = 'drone_services' THEN
        prefix := 'DR';
        seq_name := 'public.drone_services_seq';
    ELSE
        RETURN NEW;
    END IF;

    -- Only generate if not already set (allows for manual setting or retroactive updates)
    IF NEW.order_number IS NULL THEN
        new_num := nextval(seq_name);
        NEW.order_number := new_num;
        NEW.display_code := prefix || LPAD(new_num::text, 4, '0');
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic generation
DROP TRIGGER IF EXISTS tr_generate_service_order_code ON public.service_orders;
CREATE TRIGGER tr_generate_service_order_code
BEFORE INSERT ON public.service_orders
FOR EACH ROW EXECUTE FUNCTION public.generate_os_display_code();

DROP TRIGGER IF EXISTS tr_generate_drone_service_code ON public.drone_services;
CREATE TRIGGER tr_generate_drone_service_code
BEFORE INSERT ON public.drone_services
FOR EACH ROW EXECUTE FUNCTION public.generate_os_display_code();

-- Retroactive update for existing rows
DO $$
DECLARE
    r RECORD;
    new_num BIGINT;
BEGIN
    -- Update service_orders (Solar)
    FOR r IN SELECT id FROM public.service_orders WHERE order_number IS NULL ORDER BY created_at ASC LOOP
        new_num := nextval('public.service_orders_seq');
        UPDATE public.service_orders 
        SET order_number = new_num,
            display_code = 'SS' || LPAD(new_num::text, 4, '0')
        WHERE id = r.id;
    END LOOP;

    -- Update drone_services (Drone)
    FOR r IN SELECT id FROM public.drone_services WHERE order_number IS NULL ORDER BY created_at ASC LOOP
        new_num := nextval('public.drone_services_seq');
        UPDATE public.drone_services 
        SET order_number = new_num,
            display_code = 'DR' || LPAD(new_num::text, 4, '0')
        WHERE id = r.id;
    END LOOP;
END $$;
