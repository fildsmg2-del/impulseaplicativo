import { COMPANY_SETTINGS_ID, getCompanySettings, updateCompanySettings } from '@/services/companySettingsService';
import { supabase } from '@/integrations/supabase/client';
import { ProjectChecklistTemplate } from '@/components/projects/projectStagesConfig';

const TEMPLATE_COLUMN = 'project_checklist_template';

export const projectChecklistTemplateService = {
  async getTemplate(): Promise<ProjectChecklistTemplate | null> {
    const { data, error } = await supabase
      .from('company_settings')
      .select(`id, ${TEMPLATE_COLUMN}`)
      .eq('id', COMPANY_SETTINGS_ID)
      .maybeSingle();

    if (error) {
      console.error('Error fetching project checklist template:', error);
      return null;
    }

    if (!data || !data[TEMPLATE_COLUMN]) {
      return null;
    }

    return data[TEMPLATE_COLUMN] as ProjectChecklistTemplate;
  },

  async saveTemplate(template: ProjectChecklistTemplate): Promise<void> {
    const existing = await getCompanySettings();
    await updateCompanySettings({
      ...(existing ? {} : { name: 'Impulse Soluções em Energia' }),
      project_checklist_template: template,
    });
  },
};
