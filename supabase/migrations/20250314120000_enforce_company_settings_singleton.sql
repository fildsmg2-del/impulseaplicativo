DO $$
DECLARE
  fixed_id uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  IF EXISTS (SELECT 1 FROM public.company_settings WHERE id = fixed_id) THEN
    DELETE FROM public.company_settings WHERE id <> fixed_id;
  ELSE
    DELETE FROM public.company_settings
    WHERE id NOT IN (
      SELECT id FROM public.company_settings ORDER BY created_at ASC LIMIT 1
    );

    IF EXISTS (SELECT 1 FROM public.company_settings) THEN
      UPDATE public.company_settings SET id = fixed_id WHERE id <> fixed_id;
    ELSE
      INSERT INTO public.company_settings (id, name, email, phone)
      VALUES (
        fixed_id,
        'Impulse Soluções em Energia',
        'contato@impulseenergia.com.br',
        '(31) 99999-9999'
      );
    END IF;
  END IF;
END $$;

ALTER TABLE public.company_settings
  ADD CONSTRAINT company_settings_singleton_id CHECK (id = '00000000-0000-0000-0000-000000000001');
