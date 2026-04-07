import { supabase } from "@/integrations/supabase/client";
import { ProjectChecklistTemplate } from "@/components/projects/projectStagesConfig";

export const COMPANY_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

export interface CompanySettings {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  logo_url: string | null;
  project_checklist_template: ProjectChecklistTemplate | null;
  created_at: string;
  updated_at: string;
}

export async function getCompanySettings(): Promise<CompanySettings | null> {
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', COMPANY_SETTINGS_ID)
    .maybeSingle();

  if (error) {
    console.error('Error fetching company settings:', error);
    return null;
  }

  return data as CompanySettings;
}

export async function updateCompanySettings(settings: Partial<CompanySettings>): Promise<CompanySettings | null> {
  const payload: Partial<CompanySettings> = {
    id: COMPANY_SETTINGS_ID,
    ...settings,
  };

  const { data, error } = await supabase
    .from('company_settings')
    .upsert(payload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting company settings:', { error, payload });
    throw new Error(error.message);
  }

  return data as CompanySettings;
}
